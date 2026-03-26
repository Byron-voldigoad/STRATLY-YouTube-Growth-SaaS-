console.log('--- SCRIPT STARTING ---');
import 'dotenv/config';
import { genkit, z } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from 'genkitx-openai';
import { expressHandler } from '@genkit-ai/express';
import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

console.log('--- BACKEND STARTING ---');

// Initialiser Genkit avec Groq (via plugin OpenAI)
const ai = genkit({
    plugins: [
        googleAI({ apiKey: process.env.GEMINI_API_KEY }),
        openAI({
            apiKey: process.env.GROQ_API_KEY,
            baseURL: 'https://api.groq.com/openai/v1',
            models: [{
                name: 'llama-3.3-70b-versatile',
                info: {
                    label: 'Llama 3.3 70B',
                    supports: {
                        multiturn: true,
                        media: false,
                        tools: false,
                        systemRole: true
                    }
                },
                configSchema: z.any(),
            }]
        })
    ],
    model: 'openai/llama-3.3-70b-versatile',
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

const VideoAnalysisSchema = z.object({
    id: z.string(),
    title: z.string(),
    views: z.number(),
    engagement: z.number(),
    factors: z.array(z.string()),
});

const AnalysisResultSchema = z.object({
    globalScore: z.number(),
    metrics: z.object({
        subscribers: z.object({ value: z.number(), trend: z.enum(['up', 'down', 'stable']) }),
        totalViews: z.object({ value: z.number(), trend: z.enum(['up', 'down', 'stable']) }),
        engagementRate: z.number(),
        retentionRate: z.number(),
    }),
    videoAnalysis: z.object({
        bestVideo: VideoAnalysisSchema,
        worstVideo: VideoAnalysisSchema,
        patterns: z.object({
            topSubjects: z.array(z.object({ subject: z.string(), performance: z.number() })),
            optimalLength: z.object({ min: z.number(), max: z.number() }),
            optimalDay: z.string(),
            optimalTime: z.number(),
        }),
        detectedCategories: z.array(z.object({
            name: z.string(),
            avgViews: z.number(),
            commonKeywords: z.array(z.string()),
        })),
    }),
    suggestions: z.object({
        continuity: z.array(z.object({ suggestion: z.string(), basedOn: z.string() })),
        exploration: z.array(z.object({ suggestion: z.string(), riskLevel: z.enum(['low', 'medium', 'high']) })),
        timing: z.object({ bestDay: z.string(), bestHour: z.number() }),
    }),
    calendar: z.array(z.object({
        date: z.string(),
        type: z.enum(['continuity', 'exploration']),
        description: z.string(),
    })),
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
    outliers: z.array(z.object({
        id: z.string(),
        title: z.string(),
        views: z.number(),
        reason: z.string(),
    })),
});

// FLOW 1: Analyse de chaîne
export const analyzeChannelFlow = ai.defineFlow(
    {
        name: 'analyzeChannel',
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
      ${input.videos.map(v => `- ${v.title} (${v.views} vues)`).join('\n')}

      CONTRAINTES DE RÉPONSE :
      1. RÉPONDRE UNIQUEMENT EN JSON.
      2. PAS DE TEXTE AVANT OU APRÈS LE JSON.
      3. PAS DE BLOCS DE CODE MARKDOWN (pas de \`\`\`json).
      4. EVALUER LE globalScore (0-100) objectivement.
      5. CALCULER l'engagementRate (vues moyennes / abonnés).
      6. NE JAMAIS NOMMER LA NICHE (ex: AMV). Parle de "patterns".

      RETOURNE UN OBJET JSON CONFORME AU SCHÉMA AnalysisResultSchema.
    `;

        console.log('--- GENKIT DEBUG: ANALYZING', input.videos.length, 'VIDEOS ---');

        // Construire le contexte des niches si disponible
        const nicheContext = input.focusNiches && input.focusNiches.length > 0
            ? `\nNICHES SÉLECTIONNÉES PAR L'UTILISATEUR: ${input.focusNiches.join(', ')}.\nIMPORTANT: Base tes suggestions et recommandations UNIQUEMENT sur les vidéos qui correspondent à ces niches. Les vidéos hors de ces niches doivent être ignorées dans tes recommandations stratégiques (mais peuvent apparaître dans les stats brutes).`
            : '';

        const { output } = await ai.generate({
            model: 'openai/llama-3.3-70b-versatile',
            system: `Tu es un expert analyste de données YouTube. Tu dois RIGOUREUSEMENT utiliser le schéma JSON fourni. NE RENVOIE QUE DU JSON VALIDE ET RIEN D'AUTRE. 
            Ton JSON DOIT TOUJOURS contenir ces clés à la racine: 'globalScore', 'metrics', 'videoAnalysis', 'suggestions', 'calendar'. 
            Ne mets AUCUN texte avant ou après le JSON. N'utilise PAS de blocs markdown \`\`\`json.`,
            prompt: `
            Voici un gabarit du JSON attendu :
            {
              "globalScore": <nombre entre 0 et 100>,
              "metrics": { ... },
              "videoAnalysis": { ... },
              "suggestions": { ... },
              "calendar": [ ... ]
            }
            
            Analyse ces données YouTube et remplis ce schéma JSON avec tes conclusions.
             STATS DE LA CHAINE: ${JSON.stringify(input.channelStats)}
             LISTE DES VIDEOS: ${input.videos.map(v => `- ${v.title} (${v.views} vues)`).join('\n')}${nicheContext}
            `,
            output: {
                format: 'json',
                schema: AnalysisResultSchema
            },
            config: {
                temperature: 0.1,
                // @ts-ignore
                response_format: { type: "json_object" }
            },
        });

        if (!output) {
            console.error('GENKIT ERROR: No output from model');
            throw new Error('Le modèle IA n\'a pas généré de réponse.');
        }

        console.log('--- GENKIT DEBUG: SUCCESSFUL JSON RESPONSE ---');
        const result = output;

        // PERSISTANCE DANS SUPABASE
        const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        await supabase.from('ai_analyses').upsert({
            user_id: input.userId,
            channel_id: input.channelId,
            analysis_type: 'channel',
            content: JSON.stringify(result),
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, channel_id, analysis_type' });

        return result;
    }
);

// FLOW 2: Génération d'idées
export const generateIdeasFlow = ai.defineFlow(
    {
        name: 'generateIdeas',
        inputSchema: z.object({
            userId: z.string(),
            channelId: z.string(),
            niche: z.string(),
            topVideos: z.array(z.object({ title: z.string(), views: z.number() })),
        }),
        outputSchema: z.array(z.string()),
    },
    async (input) => {
        const prompt = `Génère 5 idées de vidéos YouTube pour "${input.niche}". Top vidéos : ${input.topVideos.map(v => v.title).join(', ')}. JSON array uniquement.`;

        const { output } = await ai.generate({
            model: 'openai/llama-3.3-70b-versatile',
            prompt,
            output: {
                schema: z.array(z.string()),
                format: 'json',
            },
            config: {
                temperature: 0.8,
                // @ts-ignore
                response_format: { type: "json_object" }
            },
        });

        const ideas = output || [];
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        await supabase.from('ai_analyses').upsert({
            user_id: input.userId,
            channel_id: input.channelId,
            analysis_type: 'ideas',
            content: JSON.stringify(ideas),
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, channel_id, analysis_type' });

        return ideas;
    }
);

// FLOW 3: Importation YouTube
export const importYouTubeFlow = ai.defineFlow(
    {
        name: 'importYouTube',
        inputSchema: z.object({ userId: z.string() }),
        outputSchema: z.any(),
    },
    async (input) => {
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', input.userId).single();
        if (!profile?.youtube_refresh_token) throw new Error('Refresh token manquant');

        const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_CALLBACK_URL);
        oauth2Client.setCredentials({ refresh_token: profile.youtube_refresh_token });
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

        const channelRes = await youtube.channels.list({ mine: true, part: ['snippet', 'statistics'] });
        const channel = channelRes.data.items?.[0];
        if (!channel) throw new Error('Chaîne introuvable');

        const videoRes = await youtube.search.list({ forMine: true, type: ['video'], part: ['snippet'], maxResults: 50, order: 'date' });
        const videoIds = (videoRes.data.items || []).map(v => v.id?.videoId).filter(Boolean) as string[];

        let videoStats: any[] = [];
        if (videoIds.length > 0) {
            const statsRes = await youtube.videos.list({ id: videoIds, part: ['statistics', 'snippet'] });
            videoStats = statsRes.data.items || [];
        }

        const today = new Date().toISOString().split('T')[0];
        await supabase.from('channel_analytics').upsert({
            user_id: input.userId,
            channel_id: channel.id,
            date: today,
            subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
            total_views: parseInt(channel.statistics?.viewCount || '0'),
            total_videos: parseInt(channel.statistics?.videoCount || '0'),
        }, { onConflict: 'channel_id, date' });

        const videoAnalyticData = videoStats.map(v => ({
            user_id: input.userId,
            channel_id: channel.id,
            video_id: v.id,
            video_title: v.snippet.title,
            published_at: v.snippet.publishedAt,
            views: parseInt(v.statistics.viewCount || '0'),
            likes: parseInt(v.statistics.likeCount || '0'),
            comments: parseInt(v.statistics.commentCount || '0'),
            thumbnail_url: v.snippet.thumbnails?.high?.url,
        }));

        if (videoAnalyticData.length > 0) {
            await supabase.from('video_analytics').upsert(videoAnalyticData, { onConflict: 'video_id' });
        }

        return { success: true, count: videoAnalyticData.length };
    }
);

// FLOW 4: Détection de niches
export const detectNichesFlow = ai.defineFlow(
    {
        name: 'detectNiches',
        inputSchema: z.object({
            userId: z.string(),
            channelId: z.string(),
            videos: z.array(VideoSchema),
        }),
        outputSchema: NicheDetectionResultSchema,
    },
    async (input) => {
        console.log('--- GENKIT DEBUG: DETECTING NICHES FOR', input.videos.length, 'VIDEOS ---');

        const { output } = await ai.generate({
            model: 'openai/llama-3.3-70b-versatile',
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
            ${input.videos.map(v => `- ID: ${v.id} | Titre: ${v.title} | Vues: ${v.views}`).join('\n')}
            `,
            output: {
                format: 'json',
                schema: NicheDetectionResultSchema
            },
            config: {
                temperature: 0.1,
                // @ts-ignore
                response_format: { type: "json_object" }
            },
        });

        if (!output) {
            throw new Error('Le modèle IA n\'a pas généré de réponse pour la détection de niches.');
        }

        console.log('--- GENKIT DEBUG: NICHES DETECTED:', output.niches.length, '---');

        // Persistance dans Supabase
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        await supabase.from('user_niches').upsert({
            user_id: input.userId,
            channel_id: input.channelId,
            detected_niches: JSON.stringify(output.niches),
            selected_niches: JSON.stringify(output.niches.map(n => n.name)),
            video_count_at_detection: input.videos.length,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, channel_id' });

        return output;
    }
);

// --- SERVER ---
const app = express();
app.use(cors({ origin: ['http://localhost:4200'], credentials: true }));
app.use(express.json());
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] INCOMING:`, req.method, req.path);
    next();
});

app.post('/analyzeChannel', expressHandler(analyzeChannelFlow));
app.post('/generateIdeas', expressHandler(generateIdeasFlow));
app.post('/importYouTube', expressHandler(importYouTubeFlow));
app.post('/detectNiches', expressHandler(detectNichesFlow));
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.post('/auth/youtube/callback', async (req, res) => {
    try {
        console.log('--- ENTERING OAUTH CALLBACK ROUTE ---', req.body);
        const { code, userId } = req.body;

        if (!code || !userId) {
            console.error('CALLBACK ERROR: Missing code or userId');
            return res.status(400).json({ success: false, error: 'Code et userId requis' });
        }

        // 1. Échanger le code contre des tokens
        console.log('Step 1: Exchanging code for tokens...');
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_CALLBACK_URL
        );
        const { tokens } = await oauth2Client.getToken(code);
        console.log('Step 1 OK: Got tokens. access_token:', !!tokens.access_token, 'refresh_token:', !!tokens.refresh_token);

        if (!tokens.refresh_token) {
            console.warn('⚠️ WARNING: No refresh_token received from Google. The user may need to revoke access at https://myaccount.google.com/permissions and re-authorize.');
        }

        // 2. Récupérer les infos de la chaîne
        console.log('Step 2: Fetching channel info...');
        oauth2Client.setCredentials(tokens);
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const channelRes = await youtube.channels.list({ mine: true, part: ['snippet', 'statistics'] });
        const channel = channelRes.data.items?.[0];
        if (!channel) {
            console.error('CALLBACK ERROR: No channel found');
            return res.status(404).json({ success: false, error: 'Chaîne YouTube non trouvée' });
        }
        console.log('Step 2 OK: Channel found:', channel.snippet?.title, '(', channel.id, ')');

        // 3. Sauvegarder dans Supabase
        console.log('Step 3: Saving to Supabase for userId:', userId);
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

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

        const { error: dbError } = await supabase.from('profiles').update(updateData).eq('id', userId);

        if (dbError) {
            console.error('Step 3 FAILED: Supabase error:', dbError);
            return res.status(500).json({ success: false, error: 'Erreur de sauvegarde: ' + dbError.message });
        }
        console.log('Step 3 OK: Profile updated successfully');

        res.json({ success: true, channelTitle: channel.snippet?.title, hasRefreshToken: !!tokens.refresh_token });
    } catch (error: any) {
        console.error('---- OAUTH CALLBACK ERROR ----', error?.message || error);
        res.status(500).json({ success: false, error: error?.message || 'Erreur OAuth' });
    }
});

app.listen(3400, () => {
    console.log('🚀 Server started on http://localhost:3400');
});
