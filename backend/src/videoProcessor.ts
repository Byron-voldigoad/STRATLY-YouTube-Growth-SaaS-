// ─── Types ────────────────────────────────────────────────────

export interface RawVideo {
  videoId: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
}

export type ContentType =
  | "liste"
  | "versus"
  | "tutoriel"
  | "vlog"
  | "clip"
  | "general";

export interface ProcessedVideo {
  videoId: string;
  title: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
  engagementRate: number;
  daysSincePublished: number;
  viewsPerDay: number;
  contentType: ContentType;
  isOutlier: boolean;
}

export interface ChannelStats {
  avgEngagement: number;
  topContentType: ContentType;
  bestVideoIds: string[];
  worstVideoIds: string[];
  lastPublishedDaysAgo: number | null;
  avgDaysBetweenPublications: number | null;
}

export interface ProcessedData {
  videos: ProcessedVideo[];
  channelStats: ChannelStats;
}

// ─── Helpers ──────────────────────────────────────────────────

function computeEngagementRate(
  likes: number,
  comments: number,
  views: number,
): number {
  if (views === 0) return 0;
  return ((likes + comments) / views) * 100;
}

function computeDaysSincePublished(publishedAt: string): number {
  if (!publishedAt || publishedAt.trim() === "") return 0;
  const published = new Date(publishedAt);
  if (isNaN(published.getTime())) return 0;
  const now = new Date();
  const diffMs = now.getTime() - published.getTime();
  return Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function detectContentType(title: string): ContentType {
  const lower = title.toLowerCase();

  // Format liste / classement
  if (/\btop\b|\bbest\b|\bmeilleur|\b\d+\s/.test(lower)) return "liste";

  // Format versus / comparaison
  if (/\svs\.?\s|\scontre\s/.test(lower)) return "versus";

  // Format tutoriel / guide
  if (/\bcomment\b|\bhow to\b|\btuto\b|\bguide\b|\bapprendre\b/.test(lower))
    return "tutoriel";

  // Format vlog / journal
  if (
    /\bvlog\b|\bday in\b|\bjour dans\b|\bma vie\b|\bmon quotidien\b/.test(lower)
  )
    return "vlog";

  // Format court / clip (Shorts, Reels, Edit)
  if (/\bedit\b|\bclip\b|\bshort\b|\bmix\b|\bmixte\b/.test(lower))
    return "clip";

  // Contenu de marque / série nommée
  // (titre contient un nom propre récurrent
  // détecté par majuscule en début de mot)
  return "general";
}

function getMostFrequent(types: ContentType[]): ContentType {
  const counts = new Map<ContentType, number>();
  for (const t of types) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  let best: ContentType = "general";
  let max = 0;
  for (const [type, count] of counts) {
    if (count > max) {
      max = count;
      best = type;
    }
  }
  return best;
}

// ─── Main ─────────────────────────────────────────────────────

export function processVideos(videos: RawVideo[]): ProcessedData {
  if (videos.length === 0) {
    return {
      videos: [],
      channelStats: {
        avgEngagement: 0,
        topContentType: "general",
        bestVideoIds: [],
        worstVideoIds: [],
        lastPublishedDaysAgo: null,
        avgDaysBetweenPublications: null,
      },
    };
  }

  // 1. Enrich each video
  const enriched: ProcessedVideo[] = videos.map((v) => {
    const engagementRate = computeEngagementRate(
      v.likeCount,
      v.commentCount,
      v.viewCount,
    );
    const daysSincePublished = computeDaysSincePublished(v.publishedAt);
    const viewsPerDay =
      daysSincePublished > 0 ? v.viewCount / daysSincePublished : v.viewCount;
    const contentType = detectContentType(v.title);

    return {
      videoId: v.videoId,
      title: v.title,
      viewCount: v.viewCount,
      likeCount: v.likeCount,
      commentCount: v.commentCount,
      publishedAt: v.publishedAt,
      engagementRate,
      daysSincePublished,
      viewsPerDay,
      contentType,
      isOutlier: false, // computed below once we know topContentType
    };
  });

  // 2. Channel-level stats
  const avgEngagement =
    enriched.reduce((sum, v) => sum + v.engagementRate, 0) / enriched.length;

  const topContentType = getMostFrequent(enriched.map((v) => v.contentType));

  const MIN_VIEWS_FOR_RANKING = 10;
  const rankableVideos = enriched.filter(
    (v) => v.viewCount >= MIN_VIEWS_FOR_RANKING,
  );
  const rankingSource = rankableVideos.length >= 3 ? rankableVideos : enriched;

  const sortedByEngagement = [...rankingSource].sort(
    (a, b) => b.engagementRate - a.engagementRate,
  );
  const bestVideoIds = sortedByEngagement.slice(0, 3).map((v) => v.videoId);
  const worstVideoIds = sortedByEngagement
    .slice(-3)
    .reverse()
    .map((v) => v.videoId);

  // 3. Outlier detection — top 20% viewCount threshold
  const sortedByViews = [...enriched].sort((a, b) => b.viewCount - a.viewCount);
  const top20Index = Math.max(1, Math.ceil(enriched.length * 0.2));
  const viewThreshold = sortedByViews[top20Index - 1].viewCount;

  for (const v of enriched) {
    v.isOutlier =
      v.contentType !== topContentType && v.viewCount >= viewThreshold;
  }

  const sortedByDate = [...enriched]
    .filter((v) => v.publishedAt)
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );

  const lastPublishedDaysAgo =
    sortedByDate.length > 0
      ? Math.floor(
          (Date.now() - new Date(sortedByDate[0].publishedAt).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;

  let avgDaysBetweenPublications: number | null = null;
  if (sortedByDate.length >= 2) {
    const intervals = sortedByDate.slice(0, -1).map((v, i) => {
      const a = new Date(sortedByDate[i].publishedAt).getTime();
      const b = new Date(sortedByDate[i + 1].publishedAt).getTime();
      return (a - b) / (1000 * 60 * 60 * 24);
    });
    avgDaysBetweenPublications = Math.round(
      intervals.reduce((sum, d) => sum + d, 0) / intervals.length,
    );
  }

  return {
    videos: enriched,
    channelStats: {
      avgEngagement,
      topContentType,
      bestVideoIds,
      worstVideoIds,
      lastPublishedDaysAgo,
      avgDaysBetweenPublications,
    },
  };
}
