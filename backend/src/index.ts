console.log("--- SCRIPT STARTING ---");
import "dotenv/config";
import { genkit, z } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { openAI } from "genkitx-openai";
import { expressHandler } from "@genkit-ai/express";
import express from "express";
import cors from "cors";
import { google } from "googleapis";
import { createClient } from "@supabase/supabase-js";
import { processVideos } from "./videoProcessor.js";
import {
  fetchVideoMetricsBatch,
  fetchRetentionCurve,
  getKeyRetentionPoints,
  fetchNicheTrends
} from "./youtubeAnalytics.js";
console.log("--- BACKEND STARTING ---");

// Initialiser Genkit avec Groq (via plugin OpenAI)
const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
    openAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
      models: [
        {
          name: "llama-3.3-70b-versatile",
          info: {
            label: "Llama 3.3 70B",
            supports: {
              multiturn: true,
              media: false,
              tools: false,
              systemRole: true,
            },
          },
          configSchema: z.any(),
        },
      ],
    }),
  ],
  model: "openai/llama-3.3-70b-versatile",
});

// --- SCHÉMAS ---
const VideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  views: z.number(),
  likes: z.number().optional(),
  comments: z.number().optional(),
  publishedAt: z.string(),
});

const AnalysisResultSchema = z.object({
  channelStatus: z.enum(["inactive", "stable", "en_croissance", "en_déclin"]),
  statusExplanation: z.string(),
  metrics: z.object({
    engagement: z.number(),
    engagementContext: z.string(),
    views: z.number().default(0),
    trend: z.enum(["hausse", "stable", "baisse"]),
  }),
  recommendation: z.object({
    action: z.string(),
    proof: z.string(),
    confidence: z.string(),
    nextStep: z.string(),
  }),
  patterns: z.object({
    toAvoid: z
      .array(
        z.object({
          videoTitle: z.string(),
          reason: z.string(),
        }),
      )
      .max(2),
    toRepeat: z
      .array(
        z.object({
          videoTitle: z.string(),
          reason: z.string(),
        }),
      )
      .max(2),
  }),
});

// --- SCHÉMAS NICHE DETECTION ---
const DetectedNicheSchema = z.object({
  name: z.string(),
  videoCount: z.number(),
  videoIds: z.array(z.string()),
  avgViews: z.number(),
  keywords: z.array(z.string()),
});

const NicheDetectionResultSchema = z.object({
  niches: z.array(DetectedNicheSchema),
  outliers: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      views: z.number(),
      reason: z.string(),
    }),
  ),
});

// FLOW 1: Analyse de chaîne
export const analyzeChannelFlow = ai.defineFlow(
  {
    name: "analyzeChannel",
    inputSchema: z.object({
      userId: z.string(),
      channelId: z.string(),
      videos: z.array(VideoSchema),
      channelStats: z.any(),
      focusNiches: z.array(z.string()).optional(),
    }),
    outputSchema: AnalysisResultSchema,
  },
  async (input) => {
    const prompt = `
      Tu es un expert en DATA MINING YouTube. 
      TA MISSION : Analyser les statistiques fournies et extraire des patterns stratégiques.
      
      DONNÉES CANAL :
      - Abonnés : ${input.channelStats.subscriberCount}
      - Vues totales : ${input.channelStats.viewCount}
      - Nombre de vidéos : ${input.channelStats.videoCount}

      DONNÉES VIDÉOS :
      ${input.videos.map((v) => `- ${v.title} (${v.views} vues)`).join("\n")}

      CONTRAINTES DE RÉPONSE :
      1. RÉPONDRE UNIQUEMENT EN JSON.
      2. PAS DE TEXTE AVANT OU APRÈS LE JSON.
      3. PAS DE BLOCS DE CODE MARKDOWN (pas de \`\`\`json).
      4. EVALUER LE globalScore (0-100) objectivement.
      5. CALCULER l'engagementRate (vues moyennes / abonnés).
      6. NE JAMAIS NOMMER LA NICHE (ex: AMV). Parle de "patterns".
      7. Pour les champs patterns.toAvoid et patterns.toRepeat, tu n'utilises QUE des vidéos ayant au minimum 10 vues. Une vidéo avec moins de 10 vues n'est jamais citée comme exemple — son engagement n'est pas statistiquement significatif.

      RETOURNE UN OBJET JSON CONFORME AU SCHÉMA AnalysisResultSchema.
    `;

    console.log(
      "--- GENKIT DEBUG: ANALYZING",
      input.videos.length,
      "VIDEOS ---",
    );

    // Construire le contexte des niches si disponible
    const nicheContext =
      input.focusNiches && input.focusNiches.length > 0
        ? `\nNICHES SÉLECTIONNÉES PAR L'UTILISATEUR: ${input.focusNiches.join(", ")}.\nIMPORTANT: Base tes suggestions et recommandations UNIQUEMENT sur les vidéos qui correspondent à ces niches. Les vidéos hors de ces niches doivent être ignorées dans tes recommandations stratégiques (mais peuvent apparaître dans les stats brutes).`
        : "";

    const userNiche =
      input.focusNiches && input.focusNiches.length > 0
        ? input.focusNiches.join(", ")
        : "Non renseignée";

    const rawVideos = input.videos.map((v) => ({
      videoId: v.id,
      title: v.title,
      viewCount: v.views,
      likeCount: v.likes || 0,
      commentCount: v.comments || 0,
      publishedAt: v.publishedAt || "",
    }));

    const { videos: processedVideos, channelStats } = processVideos(rawVideos);

    const filteredVideos = processedVideos.filter((v) => !v.isOutlier);

    // Récupérer le access_token depuis Supabase via client dédié
    const supabaseClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: profileData } = await supabaseClient
      .from("profiles")
      .select("youtube_access_token, youtube_refresh_token")
      .eq("id", input.userId)
      .single();

    let analyticsData: Record<string, { views: number; avgDuration: number }> =
      {};

    let retentionMap: Record<
      string,
      {
        at30s: number | null;
        atHalf: number | null;
        dropPoint: number | null;
      }
    > = {};

    // Rafraîchir le token avant les appels Analytics
    let accessToken = profileData?.youtube_access_token;

    if (profileData?.youtube_refresh_token) {
      try {
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_CALLBACK_URL,
        );
        oauth2Client.setCredentials({
          refresh_token: profileData.youtube_refresh_token,
        });

        // @ts-ignore (méthode non typée proprement dans certains SDK)
        const { credentials } = await oauth2Client.refreshAccessToken();
        accessToken = (credentials?.access_token as string) ?? accessToken;
      } catch (e) {
        console.warn("Token refresh failed:", e);
      }
    }

    if (accessToken) {
      const videoIds = filteredVideos.map((v) => v.videoId);

      analyticsData = await fetchVideoMetricsBatch(videoIds, accessToken);

      const top5Ids = channelStats.bestVideoIds.slice(0, 5);

      for (const videoId of top5Ids) {
        const curve = await fetchRetentionCurve(videoId, accessToken);
        if (curve.length > 0) {
          retentionMap[videoId] = getKeyRetentionPoints(curve);
        }
      }
    }

    // Tendances de la niche sur YouTube
    let nicheTrends: Array<{ title: string; views: number; channelTitle: string }> = [];
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (userNiche && userNiche !== 'Non renseignée' && youtubeApiKey) {
      nicheTrends = await fetchNicheTrends(userNiche, youtubeApiKey);
      console.log('NICHE TRENDS:', nicheTrends.length, 'vidéos trouvées');
    }

    const promptVideos = filteredVideos.filter((v) => v.viewCount >= 10);

    const userPrompt = `Analyse cette chaîne YouTube.

STATISTIQUES GLOBALES :
- Format dominant : ${channelStats.topContentType}
- Engagement moyen historique de la chaîne : ${channelStats.avgEngagement.toFixed(2)}%
- Niche OBLIGATOIRE : ${userNiche ?? "Non renseignée"}
  (aucune recommandation hors de cette niche)
- Vues totales de la chaîne : ${input.channelStats.viewCount}
- Vidéos analysées : ${filteredVideos.length}
- Nombre exact de vidéos : ${filteredVideos.length}
- Dernière publication : il y a ${channelStats.lastPublishedDaysAgo ?? "inconnu"} jours
- Intervalle moyen entre publications : ${channelStats.avgDaysBetweenPublications ?? "inconnu"} jours

VIDÉO OUTLIER DÉTECTÉE :
${
  filteredVideos.length < processedVideos.length
    ? processedVideos
        .filter((v) => v.isOutlier)
        .map(
          (v) =>
            `- "${v.title}" | ${v.viewCount} vues | ${v.engagementRate.toFixed(2)}% engagement | HORS NICHE`,
        )
        .join("\n")
    : "Aucune"
}

MEILLEURES VIDÉOS (par taux d'engagement) :
${
  channelStats.bestVideoIds
    .map((id) => promptVideos.find((v) => v.videoId === id))
    .filter(Boolean)
    .slice(0, 3)
    .map(
      (v) =>
        `- "${v!.title}" | ${v!.contentType} | ${v!.engagementRate.toFixed(2)}% engagement | ${v!.viewCount} vues`,
    )
    .join("\n") || "Données insuffisantes"
}

PIRES VIDÉOS (par taux d'engagement) :
${
  channelStats.worstVideoIds
    .map((id) => promptVideos.find((v) => v.videoId === id))
    .filter(Boolean)
    .slice(0, 3)
    .map(
      (v) =>
        `- "${v!.title}" | ${v!.contentType} | ${v!.engagementRate.toFixed(2)}% engagement | ${v!.viewCount} vues`,
    )
    .join("\n") || "Données insuffisantes"
}

TOUTES LES VIDÉOS ANALYSÉES :
${promptVideos
  .map((v) => {
    const analytics = analyticsData[v.videoId];
    const retention = retentionMap[v.videoId];

    const ctrInfo = analytics
      ? ` | Avg Duration: ${analytics.avgDuration.toFixed(1)}s`
      : "";
    const retentionInfo = retention?.at30s
      ? ` | Rétention 30s: ${(retention.at30s * 100).toFixed(0)}%`
      : "";
    const dropInfo = retention?.dropPoint
      ? ` | Décrochage à: ${(retention.dropPoint * 100).toFixed(0)}% de la vidéo`
      : "";

    return `- "${v.title}" | ${v.contentType} | ${v.engagementRate.toFixed(2)}% engagement | ${v.viewCount} vues | ${v.viewsPerDay.toFixed(0)} vues/jour${ctrInfo}${retentionInfo}${dropInfo}`;
  })
  .join("\n")}

TENDANCES DE LA NICHE "${userNiche}" :
${nicheTrends.length > 0
  ? nicheTrends
      .slice(0, 10)
      .map((trend, index) => `${index + 1}. "${trend.title}" par ${trend.channelTitle} - ${trend.views.toLocaleString()} vues`)
      .join("\n")
  : "Aucune tendance trouvée pour cette niche"}`;

    console.log("--- USER PROMPT ---", userPrompt);

    const { output } = await ai.generate({
      model: "openai/llama-3.3-70b-versatile",
      system: `Tu es un analyste YouTube expert. 
Tu reçois des données réelles et calculées d'une chaîne.

RÈGLES ABSOLUES :
1. Tu assignes un statut à la chaîne dans channelStatus selon ces critères stricts : 'inactive' si lastPublishedDaysAgo > 90, 'en_déclin' si trend est baisse ET lastPublishedDaysAgo > 30, 'en_croissance' si avgEngagement > 5% ET lastPublishedDaysAgo < 30, 'stable' dans tous les autres cas. statusExplanation explique en une phrase pourquoi ce statut en citant les chiffres réels.
2. Tu donnes UNE SEULE recommandation 
   dans recommendation.action.
   Cette recommandation doit être 
   une instruction concrète et spécifique
   qui répond à : QUOI faire, 
   dans quel FORMAT, et POURQUOI maintenant.
   
   Exemples de mauvaises recommandations :
   - 'Créer plus de contenu similaire' ❌
   - 'Améliorer le taux d engagement' ❌
   - 'Poster plus régulièrement' ❌
   
   Exemples de bonnes recommandations :
   - 'Refais une vidéo AMV fairy tail style 
     — c est ton format le plus engageant 
     avec 20% de réactions sur 15 vues' ✅
   - 'Arrête les compilations mixte — 
     0% d engagement sur 8 vidéos testées,
     concentre toi sur un seul anime par vidéo' ✅
   
   La recommandation doit nommer 
   un format ou un type de contenu précis,
   pas une direction générale.
3. Le champ proof DOIT contenir des chiffres 
   issus des données fournies — pas d'invention
4. Si une donnée manque, tu écris 
   "Données insuffisantes" — jamais une valeur inventée
5. Tu ignores les vidéos marquées isOutlier: true
6. engagementContext compare l'engagement 
   à la moyenne historique de la chaîne fournie
7. Le champ confidence doit contenir EXACTEMENT 
   cette phrase et rien d'autre :
   'Basé sur [nombre] vidéos analysées'
   où [nombre] est remplacé par le nombre réel 
   de vidéos dans le dataset fourni.
   N'utilise pas de mots comme Faible, Moyenne, 
   Forte ou tout autre jugement qualitatif.
8. patterns.toAvoid et patterns.toRepeat 
   utilisent uniquement des titres présents 
   dans les données fournies — aucun titre inventé
9. RENVOIE UNIQUEMENT DU JSON VALIDE. 
   Aucun texte avant ou après. 
   Aucun bloc markdown.
10. La niche indiquée dans 
    'Niche OBLIGATOIRE' du prompt
    est une contrainte absolue.
    Toutes tes recommandations doivent 
    être cohérentes avec cette niche.
    Si la niche est 'Non renseignée',
    déduis la niche implicite depuis 
    les titres des vidéos et reste 
    cohérent avec elle.
11. Si une vidéo outlier est listée dans VIDÉO OUTLIER DÉTECTÉE, tu dois OBLIGATOIREMENT la mentionner dans statusExplanation en expliquant qu'elle représente X% des vues totales mais qu'elle est hors-niche. C'est l'insight le plus important à communiquer.
12. Tu dois commenter la régularité de publication dans engagementContext ou statusExplanation. Si la dernière publication date de plus de 30 jours, c'est un signal négatif à mentionner explicitement. Si l'intervalle moyen dépasse 14 jours, mentionne que la fréquence est insuffisante pour la croissance.
13. Tu dois analyser les TENDANCES DE LA NICHE fournies et les mentionner dans recommendation.proof si elles sont pertinentes pour étayer ta recommandation. Si aucune tendance n'est fournie, ignore cette règle.
    `,
      prompt: userPrompt,
      output: {
        format: "json",
        schema: AnalysisResultSchema,
      },
      config: {
        temperature: 0.1,
        // @ts-ignore
        response_format: { type: "json_object" },
      },
    });

    if (!output) {
      console.error("GENKIT ERROR: No output from model");
      throw new Error("Le modèle IA n'a pas généré de réponse.");
    }

    console.log("--- GENKIT DEBUG: SUCCESSFUL JSON RESPONSE ---");
    const result = output;

    // Validation post-génération
    const allowedTitles = new Set(promptVideos.map((v) => v.title));

    const validatedResult = {
      ...result,
      metrics: {
        ...result.metrics,
        views: input.videos.reduce(
          (sum: number, v: any) => sum + (v.views || 0),
          0,
        ),
      },
      patterns: {
        toAvoid: (result.patterns?.toAvoid ?? []).filter((p) =>
          allowedTitles.has(p.videoTitle),
        ),
        toRepeat: (result.patterns?.toRepeat ?? []).filter((p) =>
          allowedTitles.has(p.videoTitle),
        ),
      },
    };

    // PERSISTANCE DANS SUPABASE
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    await supabase.from("ai_analyses").upsert(
      {
        user_id: input.userId,
        channel_id: input.channelId,
        analysis_type: "channel",
        analysis_text: JSON.stringify(validatedResult),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, channel_id, analysis_type" },
    );

    return validatedResult;
  },
);

// FLOW 2: Génération d'idées
export const generateIdeasFlow = ai.defineFlow(
  {
    name: "generateIdeas",
    inputSchema: z.object({
      userId: z.string(),
      channelId: z.string(),
      niche: z.string(),
      topVideos: z.array(z.object({ title: z.string(), views: z.number() })),
    }),
    outputSchema: z.array(z.string()),
  },
  async (input) => {
    const prompt = `Génère 5 idées de vidéos YouTube pour "${input.niche}". Top vidéos : ${input.topVideos.map((v) => v.title).join(", ")}. JSON array uniquement.`;

    const { output } = await ai.generate({
      model: "openai/llama-3.3-70b-versatile",
      prompt,
      output: {
        schema: z.array(z.string()),
        format: "json",
      },
      config: {
        temperature: 0.8,
        // @ts-ignore
        response_format: { type: "json_object" },
      },
    });

    const ideas = output || [];
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabase.from("ai_analyses").upsert(
      {
        user_id: input.userId,
        channel_id: input.channelId,
        analysis_type: "ideas",
        analysis_text: JSON.stringify(ideas),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, channel_id, analysis_type" },
    );

    return ideas;
  },
);

// FLOW 3: Importation YouTube
export const importYouTubeFlow = ai.defineFlow(
  {
    name: "importYouTube",
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", input.userId)
      .single();
    if (!profile?.youtube_refresh_token)
      throw new Error("Refresh token manquant");

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );
    oauth2Client.setCredentials({
      refresh_token: profile.youtube_refresh_token,
    });
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });

    const channelRes = await youtube.channels.list({
      mine: true,
      part: ["snippet", "statistics"],
    });
    const channel = channelRes.data.items?.[0];
    if (!channel) throw new Error("Chaîne introuvable");

    const videoRes = await youtube.search.list({
      forMine: true,
      type: ["video"],
      part: ["snippet"],
      maxResults: 50,
      order: "date",
    });
    const videoIds = (videoRes.data.items || [])
      .map((v) => v.id?.videoId)
      .filter(Boolean) as string[];

    let videoStats: any[] = [];
    if (videoIds.length > 0) {
      const statsRes = await youtube.videos.list({
        id: videoIds,
        part: ["statistics", "snippet"],
      });
      videoStats = statsRes.data.items || [];
    }

    const today = new Date().toISOString().split("T")[0];
    await supabase.from("channel_analytics").upsert(
      {
        user_id: input.userId,
        channel_id: channel.id,
        date: today,
        subscribers: parseInt(channel.statistics?.subscriberCount || "0"),
        total_views: parseInt(channel.statistics?.viewCount || "0"),
        total_videos: parseInt(channel.statistics?.videoCount || "0"),
      },
      { onConflict: "channel_id, date" },
    );

    const videoAnalyticData = videoStats.map((v) => ({
      user_id: input.userId,
      channel_id: channel.id,
      video_id: v.id,
      video_title: v.snippet.title,
      published_at: v.snippet.publishedAt,
      views: parseInt(v.statistics.viewCount || "0"),
      likes: parseInt(v.statistics.likeCount || "0"),
      comments: parseInt(v.statistics.commentCount || "0"),
      thumbnail_url: v.snippet.thumbnails?.high?.url,
    }));

    if (videoAnalyticData.length > 0) {
      await supabase
        .from("video_analytics")
        .upsert(videoAnalyticData, { onConflict: "video_id" });
    }

    return { success: true, count: videoAnalyticData.length };
  },
);

// FLOW 4: Détection de niches
export const detectNichesFlow = ai.defineFlow(
  {
    name: "detectNiches",
    inputSchema: z.object({
      userId: z.string(),
      channelId: z.string(),
      videos: z.array(VideoSchema),
    }),
    outputSchema: NicheDetectionResultSchema,
  },
  async (input) => {
    console.log(
      "--- GENKIT DEBUG: DETECTING NICHES FOR",
      input.videos.length,
      "VIDEOS ---",
    );

    const { output } = await ai.generate({
      model: "openai/llama-3.3-70b-versatile",
      system: `Tu es un expert en classification thématique de contenus YouTube. NE RENVOIE QUE DU JSON VALIDE. Ton JSON DOIT contenir 'niches' et 'outliers'. Pas de markdown, pas de texte autour.`,
      prompt: `
            Analyse les titres de ces vidéos YouTube et regroupe-les par thème/niche.

            RÈGLES:
            - Un thème doit avoir AU MINIMUM 3 vidéos pour être considéré comme une "niche"
            - Les vidéos qui n'appartiennent à aucune niche (moins de 3 vidéos sur un thème) sont des "outliers"
            - Donne un nom clair et concis à chaque niche (ex: "AMV Anime", "Tech Reviews", "Vlogs")
            - Pour chaque niche, identifie des mots-clés communs
            - Pour chaque outlier, explique brièvement pourquoi il est hors-niche

            Gabarit JSON :
            {
              "niches": [
                { "name": "...", "videoCount": N, "videoIds": ["id1", ...], "avgViews": N, "keywords": ["..."] }
              ],
              "outliers": [
                { "id": "...", "title": "...", "views": N, "reason": "..." }
              ]
            }

            VIDÉOS À CLASSIFIER:
            ${input.videos.map((v) => `- ID: ${v.id} | Titre: ${v.title} | Vues: ${v.views}`).join("\n")}
            `,
      output: {
        format: "json",
        schema: NicheDetectionResultSchema,
      },
      config: {
        temperature: 0.1,
        // @ts-ignore
        response_format: { type: "json_object" },
      },
    });

    if (!output) {
      throw new Error(
        "Le modèle IA n'a pas généré de réponse pour la détection de niches.",
      );
    }

    console.log(
      "--- GENKIT DEBUG: NICHES DETECTED:",
      output.niches.length,
      "---",
    );

    // Persistance dans Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabase.from("user_niches").upsert(
      {
        user_id: input.userId,
        channel_id: input.channelId,
        detected_niches: JSON.stringify(output.niches),
        selected_niches: JSON.stringify(output.niches.map((n) => n.name)),
        video_count_at_detection: input.videos.length,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id, channel_id" },
    );

    return output;
  },
);

// --- SERVER ---
const app = express();
app.use(cors({ origin: ["http://localhost:4200"], credentials: true }));
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] INCOMING:`, req.method, req.path);
  next();
});

app.post("/analyzeChannel", expressHandler(analyzeChannelFlow));
app.post("/generateIdeas", expressHandler(generateIdeasFlow));
app.post("/importYouTube", expressHandler(importYouTubeFlow));
app.post("/detectNiches", expressHandler(detectNichesFlow));
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.post("/auth/youtube/callback", async (req, res) => {
  try {
    console.log("--- ENTERING OAUTH CALLBACK ROUTE ---", req.body);
    const { code, userId } = req.body;

    if (!code || !userId) {
      console.error("CALLBACK ERROR: Missing code or userId");
      return res
        .status(400)
        .json({ success: false, error: "Code et userId requis" });
    }

    // 1. Échanger le code contre des tokens
    console.log("Step 1: Exchanging code for tokens...");
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_CALLBACK_URL,
    );
    const { tokens } = await oauth2Client.getToken(code);
    console.log(
      "Step 1 OK: Got tokens. access_token:",
      !!tokens.access_token,
      "refresh_token:",
      !!tokens.refresh_token,
    );

    if (!tokens.refresh_token) {
      console.warn(
        "⚠️ WARNING: No refresh_token received from Google. The user may need to revoke access at https://myaccount.google.com/permissions and re-authorize.",
      );
    }

    // 2. Récupérer les infos de la chaîne
    console.log("Step 2: Fetching channel info...");
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: "v3", auth: oauth2Client });
    const channelRes = await youtube.channels.list({
      mine: true,
      part: ["snippet", "statistics"],
    });
    const channel = channelRes.data.items?.[0];
    if (!channel) {
      console.error("CALLBACK ERROR: No channel found");
      return res
        .status(404)
        .json({ success: false, error: "Chaîne YouTube non trouvée" });
    }
    console.log(
      "Step 2 OK: Channel found:",
      channel.snippet?.title,
      "(",
      channel.id,
      ")",
    );

    // 3. Sauvegarder dans Supabase
    console.log("Step 3: Saving to Supabase for userId:", userId);
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const updateData: Record<string, any> = {
      youtube_access_token: tokens.access_token,
      youtube_channel_id: channel.id,
      youtube_channel_title: channel.snippet?.title,
      updated_at: new Date().toISOString(),
    };

    // Ne mettre à jour le refresh_token QUE s'il est présent (sinon on écraserait l'ancien avec null)
    if (tokens.refresh_token) {
      updateData.youtube_refresh_token = tokens.refresh_token;
    }

    const { error: dbError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", userId);

    if (dbError) {
      console.error("Step 3 FAILED: Supabase error:", dbError);
      return res.status(500).json({
        success: false,
        error: "Erreur de sauvegarde: " + dbError.message,
      });
    }
    console.log("Step 3 OK: Profile updated successfully");

    res.json({
      success: true,
      channelTitle: channel.snippet?.title,
      hasRefreshToken: !!tokens.refresh_token,
    });
  } catch (error: any) {
    console.error("---- OAUTH CALLBACK ERROR ----", error?.message || error);
    res
      .status(500)
      .json({ success: false, error: error?.message || "Erreur OAuth" });
  }
});

app.listen(3400, () => {
  console.log("🚀 Server started on http://localhost:3400");
});
