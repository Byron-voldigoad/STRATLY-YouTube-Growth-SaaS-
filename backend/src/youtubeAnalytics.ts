export interface VideoMetricsInfo {
  views: number;
  avgDuration: number;
}

export interface RetentionPoint {
  ratio: number;
  watchRatio: number;
}

export interface KeyRetentionPoints {
  at30s: number | null;
  atHalf: number | null;
  dropPoint: number | null;
}

const YOUTUBE_ANALYTICS_URL =
  "https://youtubeanalytics.googleapis.com/v2/reports";

type KeywordAiLike = {
  generate: (params: {
    model: string;
    system?: string;
    prompt: string;
    config?: Record<string, any>;
  }) => Promise<{ output?: string }>;
};

export function extractKeywords(idea: string): string {
  // Liste des mots de liaison et de contexte à détruire
  const stopWords = new Set([
    "un", "une", "des", "le", "la", "les", "de", "du", "sur", "qui", "que", "quoi", "dont", "ou", "et", "dans", "pour", "avec", "par", "en", "vs", "contre",
    "amv", "edit", "video", "vidéo", "clip", "short", "minute", "minutes", "seconde", "secondes", "créer", "réaliser", "faire", "montage",
    "mettant", "scène", "comparant", "pouvoirs", "capacités", "meilleurs", "moments", "combat", "combats", "transitions", "rapides", "effets", "visuels", "lumière", "intéressants", "musique", "énergique", "spectaculaires", "focus", "thème", "thèmes", "histoire", "analyse", "top", "meilleur", "évolution", "personnages", "dynamiques"
  ]);

  // Nettoyer, splitter, filtrer
  const words = idea.toLowerCase()
    .replace(/[^a-zà-ÿ0-9\s-]/g, "")
    .split(/\s+/);

  const filtered = words.filter(w => !stopWords.has(w) && w.length > 2);

  // Ne garder que les 3 mots les plus importants (généralement l'entité)
  return filtered.slice(0, 4).join(" ");
}

async function fetchAutocompleteSuggestion(query: string): Promise<string | null> {
  try {
    const suggestUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    const suggestRes = await fetch(suggestUrl);

    if (!suggestRes.ok) {
      return null;
    }

    const suggestData = await suggestRes.json();
    const suggestions = Array.isArray(suggestData?.[1]) ? suggestData[1] : [];
    const suggestion = typeof suggestions[0] === "string" ? suggestions[0].trim() : "";

    return suggestion || null;
  } catch (error) {
    console.error("fetchAutocompleteSuggestion error:", error);
    return null;
  }
}

function formatDate(date: Date): string {
  return date.toISOString().substring(0, 10);
}

function getDateRange90Days(): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 90);
  return { startDate: formatDate(startDate), endDate: formatDate(endDate) };
}

export async function fetchVideoMetricsBatch(
  videoIds: string[],
  accessToken: string,
  channelId?: string,
): Promise<Record<string, VideoMetricsInfo>> {
  if (!videoIds || videoIds.length === 0) {
    return {};
  }

  const { startDate, endDate } = getDateRange90Days();
  const filters = `video==${videoIds.join(",")}`;
  const targetChannel = channelId ? `channel==${channelId}` : "channel==MINE";
  const params = new URLSearchParams({
    ids: targetChannel,
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched,averageViewDuration",
    dimensions: "video",
    filters,
  });

  try {
    const url = new URL(YOUTUBE_ANALYTICS_URL);
    url.search = params.toString();

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await response.json();

    if (!response.ok) {
      return {};
    }

    const data = json;

    if (!data?.rows || !Array.isArray(data.rows)) {
      return {};
    }

    const result: Record<string, VideoMetricsInfo> = {};

    for (const row of data.rows) {
      if (!Array.isArray(row) || row.length < 4) {
        continue;
      }

      const videoId = String(row[0]);
      const views = Number(row[1]);
      const avgDuration = Number(row[3]);

      if (!videoId) {
        continue;
      }

      result[videoId] = {
        views: Number.isFinite(views) ? views : 0,
        avgDuration: Number.isFinite(avgDuration) ? avgDuration : 0,
      };
    }

    return result;
  } catch (error) {
    console.error("fetchCTRBatch error:", error);
    return {};
  }
}

export async function fetchRetentionCurve(
  videoId: string,
  accessToken: string,
  channelId?: string,
): Promise<RetentionPoint[]> {
  if (!videoId) {
    return [];
  }

  const { startDate, endDate } = getDateRange90Days();
  const filters = `video==${videoId};audienceType==ORGANIC`;
  const targetChannel = channelId ? `channel==${channelId}` : "channel==MINE";
  const params = new URLSearchParams({
    ids: targetChannel,
    startDate,
    endDate,
    metrics: "audienceWatchRatio",
    dimensions: "elapsedVideoTimeRatio",
    filters,
    sort: "elapsedVideoTimeRatio",
  });

  try {
    const url = new URL(YOUTUBE_ANALYTICS_URL);
    url.search = params.toString();

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const json = await response.json();

    if (!response.ok) {
      return [];
    }

    const data = json;

    if (!data?.rows || !Array.isArray(data.rows)) {
      return [];
    }

    const result: RetentionPoint[] = [];

    for (const row of data.rows) {
      if (!Array.isArray(row) || row.length < 2) {
        continue;
      }

      const ratio = Number(row[0]);
      const watchRatio = Number(row[1]);

      if (!Number.isFinite(ratio) || !Number.isFinite(watchRatio)) {
        continue;
      }

      result.push({ ratio, watchRatio });
    }

    return result;
  } catch (error) {
    console.error("fetchRetentionCurve error:", error);
    return [];
  }
}

export function getKeyRetentionPoints(
  curve: RetentionPoint[],
): KeyRetentionPoints {
  if (!curve || curve.length === 0) {
    return { at30s: null, atHalf: null, dropPoint: null };
  }

  const sorted = [...curve].sort((a, b) => a.ratio - b.ratio);

  const findClosest = (target: number): number | null => {
    let best: RetentionPoint | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const point of sorted) {
      const dist = Math.abs(point.ratio - target);
      if (dist < bestDistance) {
        bestDistance = dist;
        best = point;
      }
    }

    return best ? best.watchRatio : null;
  };

  let maxDrop = 0;
  let dropPoint: number | null = null;

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const drop = current.watchRatio - next.watchRatio;
    if (drop > maxDrop) {
      maxDrop = drop;
      dropPoint = next.ratio;
    }
  }

  return {
    at30s: findClosest(0.1),
    atHalf: findClosest(0.5),
    dropPoint,
  };
}

export async function fetchNicheTrends(
  niche: string,
  apiKey: string,
): Promise<Array<{ title: string; views: number; channelTitle: string; thumbnailUrl: string; likes: number; comments: number }>> {
  try {
    // Exclude shorts natively via YouTube search operators
    const query = encodeURIComponent(`${niche} -shorts`);
    const publishedAfter = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000, // Look back 1 year
    ).toISOString();

    // Fetch 15 results to have a pool for filtering good thumbnails
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&order=relevance&publishedAfter=${publishedAfter}&maxResults=15&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (!searchData.items || searchData.items.length === 0) return [];

    const videoIds = searchData.items
      .map((item: any) => item.id?.videoId)
      .filter(Boolean)
      .join(",");

    if (!videoIds) return [];

    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`;
    const statsRes = await fetch(statsUrl);
    const statsData = await statsRes.json();

    const verifiedVideos = (statsData.items || [])
      .filter((item: any) => {
        const title = (item.snippet?.title || "").toLowerCase();
        return !title.includes("#shorts") && !title.includes("tiktok");
      })
      .map((item: any) => ({
        title: item.snippet?.title || "",
        views: parseInt(item.statistics?.viewCount || "0", 10),
        channelTitle: item.snippet?.channelTitle || "",
        thumbnailUrl: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
        likes: parseInt(item.statistics?.likeCount || "0", 10),
        comments: parseInt(item.statistics?.commentCount || "0", 10),
        hasMaxRes: !!item.snippet?.thumbnails?.maxres
      }))
      .sort((a: any, b: any) => {
        // Prioritize videos that explicitly uploaded a custom MaxRes thumbnail (usually a sign of work on the thumbnail)
        if (a.hasMaxRes && !b.hasMaxRes) return -1;
        if (!a.hasMaxRes && b.hasMaxRes) return 1;
        // Then sort by most viewed
        return b.views - a.views;
      })
      .slice(0, 3);

    return verifiedVideos;
  } catch (error) {
    console.error("fetchNicheTrends error:", error);
    return [];
  }
}

export async function analyzeThumbnail(
  imagePayload: { imageUri?: string; base64Content?: string },
  apiKey: string,
): Promise<{
  labels: string[];
  dominantColors: string[];
  text: string[];
}> {
  try {
    const imageObject = imagePayload.base64Content
      ? { content: imagePayload.base64Content.includes(',') ? imagePayload.base64Content.split(',')[1] : imagePayload.base64Content }
      : { source: { imageUri: imagePayload.imageUri } };

    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: imageObject,
              features: [
                { type: "LABEL_DETECTION", maxResults: 5 },
                { type: "IMAGE_PROPERTIES" },
                { type: "TEXT_DETECTION", maxResults: 3 },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json();

    if (data.error) {
      console.error("[Vision API] Global error:", data.error.message);
      throw new Error(`Vision API: ${data.error.message}`);
    }

    const result = data.responses?.[0];
    if (result?.error) {
      console.error("[Vision API] Response error:", result.error.message);
      throw new Error(`Vision API Response: ${result.error.message}`);
    }

    const labels = (result?.labelAnnotations || [])
      .map((l: any) => l.description)
      .filter(Boolean);

    const colors = (
      result?.imagePropertiesAnnotation?.dominantColors?.colors || []
    )
      .slice(0, 3)
      .map((c: any) => {
        const r = Math.round(c.color?.red || 0);
        const g = Math.round(c.color?.green || 0);
        const b = Math.round(c.color?.blue || 0);
        return `rgb(${r},${g},${b})`;
      });

    const texts = (result?.textAnnotations || [])
      .slice(0, 3)
      .map((t: any) => t.description)
      .filter(Boolean);

    return {
      labels,
      dominantColors: colors,
      text: texts,
    };
  } catch (error: any) {
    console.error("analyzeThumbnail error:", error);
    throw new Error(`Erreur analyse visuelle : ${error?.message || "Erreur inconnue"}`);
  }
}

export async function extractKeywordsWithAI(
  idea: string,
  ai: KeywordAiLike,
): Promise<string> {
  try {
    const response = await ai.generate({
      model: "openai/llama-3.3-70b-versatile",
      system: `Tu es un extracteur d'entités SEO. Isole UNIQUEMENT le sujet principal (Nom, œuvre, concept central).
  RÈGLES ABSOLUES :
  1. Renvoie 1 à 4 mots MAXIMUM.
  2. SUPPRIME tout le vocabulaire YouTube (AMV, edit, vidéo, clip, créer, faire, minute, seconde).
  3. SUPPRIME les mots de narration (mettant, scène, comparant, pouvoirs, combat).
  4. RENVOIE UNIQUEMENT LES MOTS-CLÉS BRUTS, sans ponctuation.`,
      prompt: `Extrais l'entité de cette idée : "${idea}"`,
      config: { temperature: 0.1 }
    });

    const text = typeof (response as any).text === "string"
      ? (response as any).text.replace(/^['"`]+|['"`]+$/g, "")
      : typeof response.output === "string"
        ? response.output.replace(/^['"`]+|['"`]+$/g, "")
        : "";

    const finalQuery = text ? text.trim().toLowerCase() : idea.slice(0, 30);
    console.log(`[DEBUG NERRA] Idea: "${idea}" ---> Extracted Query: "${finalQuery}"`);
    return finalQuery;
  } catch (error) {
    console.error("extractKeywordsWithAI error:", error);
    const finalQuery = extractKeywords(idea);
    console.log(`[DEBUG NERRA] Idea: "${idea}" ---> Extracted Query: "${finalQuery}"`);
    return finalQuery;
  }
}

export type MarketResult = {
  contextString: string;
  marketStatus: 'DEAD' | 'OCEAN_BLUE' | 'FOUND';
  avgViews: number;
};

export async function fetchMarketContext(
  rawQuery: string,
  supabaseClient: any,
  youtubeClient: any,
  ai?: KeywordAiLike,
): Promise<MarketResult> {
  const cleanQuery = ai
    ? await extractKeywordsWithAI(rawQuery, ai)
    : extractKeywords(rawQuery);
  const query = cleanQuery || rawQuery.trim().toLowerCase();
  const TTL_HOURS = 24;

  // 1. Chercher dans le cache
  try {
    const { data } = await supabaseClient
      .from('youtube_search_cache')
      .select('result_data, updated_at')
      .eq('query', query)
      .single();

    if (data) {
      const updatedAt = new Date(data.updated_at);
      const hoursSince = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSince < TTL_HOURS) {
        console.log('MARKET CACHE HIT:', query);
        // Compatibilité : l'ancienne valeur peut être un string brut
        try {
          const parsed = JSON.parse(data.result_data);
          if (parsed && typeof parsed.contextString === 'string') {
            return parsed as MarketResult;
          }
        } catch {
          // Ancien format string → convertir en MarketResult
          const raw: string = data.result_data;
          const marketStatus = raw.startsWith('OCÉAN BLEU')
            ? 'OCEAN_BLUE'
            : raw.startsWith('SUJET MORT')
            ? 'DEAD'
            : 'FOUND';
          return { contextString: raw, marketStatus, avgViews: 0 };
        }
      }
    }
  } catch (e) {
    // Cache miss — continuer
  }

  // 2. Appeler YouTube API
  try {
    const publishedAfter = new Date(
      Date.now() - 90 * 24 * 60 * 60 * 1000
    ).toISOString();

    const searchRes = await youtubeClient
      .search.list({
        part: ['snippet'],
        q: query,
        type: ['video'],
        order: 'viewCount',
        maxResults: 3,
        publishedAfter,
      });

    const items = searchRes.data.items || [];

    let marketResult: MarketResult;

    if (items.length > 0) {
      // Double appel pour récupérer les vues réelles
      const videoIds = items
        .map((item: any) => item.id?.videoId)
        .filter(Boolean)
        .join(',');

      let avgViews = 0;

      if (videoIds) {
        const statsRes = await youtubeClient.videos.list({
          part: ['statistics'],
          id: [videoIds],
        });
        let totalViews = 0;
        statsRes.data.items?.forEach((item: any) => {
          totalViews += Number(item.statistics?.viewCount || 0);
        });
        avgViews = statsRes.data.items?.length
          ? totalViews / statsRes.data.items.length
          : 0;
      }

      const contextString = items
        .map((item: any) =>
          `- '${item.snippet.title}' (${item.snippet.channelTitle})`
        )
        .join('\n');

      marketResult = { contextString, marketStatus: 'FOUND', avgViews };
    } else {
      const suggestion = await fetchAutocompleteSuggestion(query);

      if (suggestion) {
        marketResult = {
          contextString: `OCÉAN BLEU DÉTECTÉ : aucune vidéo récente trouvée pour "${query}", mais l'autocomplétion YouTube suggère "${suggestion}".`,
          marketStatus: 'OCEAN_BLUE',
          avgViews: 0,
        };
      } else {
        marketResult = {
          contextString: `SUJET MORT : aucune vidéo récente ni suggestion YouTube pour "${query}".`,
          marketStatus: 'DEAD',
          avgViews: 0,
        };
      }
    }

    // 3. Sauvegarder dans le cache (JSON stringifié du nouvel objet)
    await supabaseClient
      .from('youtube_search_cache')
      .upsert({
        query,
        result_data: JSON.stringify(marketResult),
        updated_at: new Date().toISOString(),
      });

    console.log('MARKET API CALL:', query);
    return marketResult;

  } catch (error) {
    console.error('fetchMarketContext error:', error);
    return {
      contextString: `SUJET MORT : impossible de récupérer des tendances ou suggestions pour "${query}".`,
      marketStatus: 'DEAD',
      avgViews: 0,
    };
  }
}
