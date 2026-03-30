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
): Promise<Record<string, VideoMetricsInfo>> {
  if (!videoIds || videoIds.length === 0) {
    return {};
  }

  const { startDate, endDate } = getDateRange90Days();
  const filters = `video==${videoIds.join(",")}`;
  const params = new URLSearchParams({
    ids: "channel==MINE",
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
): Promise<RetentionPoint[]> {
  if (!videoId) {
    return [];
  }

  const { startDate, endDate } = getDateRange90Days();
  const filters = `video==${videoId};audienceType==ORGANIC`;
  const params = new URLSearchParams({
    ids: "channel==MINE",
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
