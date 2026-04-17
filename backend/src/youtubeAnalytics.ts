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

    console.log("CTR API status:", response.status);
    const json = await response.json();
    console.log("CTR API raw response:", JSON.stringify(json).slice(0, 500));

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

    console.log("Retention API status:", response.status);
    const json = await response.json();
    console.log(
      "Retention API raw response:",
      JSON.stringify(json).slice(0, 500),
    );

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
