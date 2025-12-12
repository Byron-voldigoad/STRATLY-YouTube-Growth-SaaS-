// app/dashboard/page.tsx (version corrigée avec analyse intelligente)
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Eye,
  Video,
  Clock,
  TrendingUp,
  Download,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Calendar,
  Filter,
  Lightbulb, 
  MessageCircle, 
  ThumbsUp,
  Play,
  Sparkles,
  Zap,
  Star
} from "lucide-react";
import { SubscribersChart } from "@/components/analytics/subscribers-chart";
import { ViewsChart } from "@/components/analytics/views-chart";
import { VideosTable } from "@/components/analytics/videos-table";
import { Button } from "@/components/ui/button";

interface ChannelStats {
  title: string;
  thumbnail: string;
  subscribers: number;
  totalViews: number;
  totalVideos: number;
  growthRate: number;
}

interface AnalyticsData {
  date: string;
  subscribers: number;
  views: number;
  watchTime: number;
  newSubscribers?: number;
}

interface VideoData {
  id: string;
  video_title: string;
  published_at: string;
  views: number;
  likes: number;
  comments: number;
  watch_time_minutes: number;
  avg_view_duration: number;
  thumbnail_url: string;
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [channel, setChannel] = useState<ChannelStats | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  // 1. Vérifie l'utilisateur au chargement
  useEffect(() => {
    checkUser();
  }, []);

  // 2. Quand l'utilisateur change, charge les données
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, timeRange]);

  // 3. Quand le timeRange change, recharge les données si user existe
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [timeRange]);

  // ==================== NOUVELLES FONCTIONS D'ANALYSE INTELLIGENTE ====================

  /**
   * Trouve le meilleur jour de publication BASÉ SUR LES PERFORMANCES
   */
  function getBestPerformingDay(videosList: VideoData[]): string {
    if (!videosList.length) return 'Non disponible';
    
    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayPerformance: Record<number, { videos: number, totalViews: number, avgViews: number }> = {};
    
    videosList.forEach(video => {
      const day = new Date(video.published_at).getDay();
      
      if (!dayPerformance[day]) {
        dayPerformance[day] = { videos: 0, totalViews: 0, avgViews: 0 };
      }
      
      dayPerformance[day].videos++;
      dayPerformance[day].totalViews += video.views;
    });
    
    // Calcule la moyenne pour chaque jour
    Object.keys(dayPerformance).forEach(dayStr => {
      const day = parseInt(dayStr);
      if (dayPerformance[day].videos > 0) {
        dayPerformance[day].avgViews = dayPerformance[day].totalViews / dayPerformance[day].videos;
      }
    });
    
    // Trouve le jour avec la meilleure MOYENNE de vues
    let bestDay = 0;
    let bestAvgViews = 0;
    
    Object.keys(dayPerformance).forEach(dayStr => {
      const day = parseInt(dayStr);
      if (dayPerformance[day]?.videos > 0 && dayPerformance[day].avgViews > bestAvgViews) {
        bestAvgViews = dayPerformance[day].avgViews;
        bestDay = day;
      }
    });
    
    // Si on a peu de données, retourne aussi le nombre de vidéos pour contexte
    const totalVideosOnBestDay = dayPerformance[bestDay]?.videos || 0;
    const context = totalVideosOnBestDay > 1 ? 
      ` (${totalVideosOnBestDay} vidéos, ${Math.round(bestAvgViews)} vues moy.)` : 
      ` (${Math.round(bestAvgViews)} vues)`;
    
    return `${dayNames[bestDay]}${context}`;
  }

  /**
   * Trouve la meilleure tranche horaire BASÉE SUR LES PERFORMANCES
   */
  function getBestPerformingTimeSlot(videosList: VideoData[]): string {
    if (!videosList.length) return 'Non disponible';
    
    // Définit les tranches horaires
    const timeSlots = [
      { name: 'Nuit (00h-06h)', start: 0, end: 6 },
      { name: 'Matin (06h-12h)', start: 6, end: 12 },
      { name: 'Après-midi (12h-18h)', start: 12, end: 18 },
      { name: 'Soirée (18h-00h)', start: 18, end: 24 }
    ];
    
    const slotPerformance: Record<string, { videos: number, totalViews: number, avgViews: number }> = {};
    
    // Initialise toutes les tranches
    timeSlots.forEach(slot => {
      slotPerformance[slot.name] = { videos: 0, totalViews: 0, avgViews: 0 };
    });
    
    // Analyse chaque vidéo
    videosList.forEach(video => {
      const hour = new Date(video.published_at).getHours();
      
      for (const slot of timeSlots) {
        if (hour >= slot.start && hour < slot.end) {
          slotPerformance[slot.name].videos++;
          slotPerformance[slot.name].totalViews += video.views;
          break;
        }
      }
    });
    
    // Calcule les moyennes
    Object.keys(slotPerformance).forEach(slotName => {
      if (slotPerformance[slotName].videos > 0) {
        slotPerformance[slotName].avgViews = 
          slotPerformance[slotName].totalViews / slotPerformance[slotName].videos;
      }
    });
    
    // Trouve la meilleure tranche
    let bestSlot = timeSlots[0].name;
    let bestAvgViews = 0;
    
    Object.keys(slotPerformance).forEach(slotName => {
      const perf = slotPerformance[slotName];
      if (perf.videos > 0 && perf.avgViews > bestAvgViews) {
        bestAvgViews = perf.avgViews;
        bestSlot = slotName;
      }
    });
    
    return `${bestSlot} (${Math.round(bestAvgViews)} vues moy.)`;
  }

  /**
   * Calcule l'heure exacte de publication moyenne
   */
  function getAveragePublishingTime(videosList: VideoData[]): string {
    if (!videosList.length) return 'Non disponible';
    
    const hours = videosList.map(video => new Date(video.published_at).getHours());
    const minutes = videosList.map(video => new Date(video.published_at).getMinutes());
    
    const avgHour = Math.round(hours.reduce((a, b) => a + b, 0) / hours.length);
    const avgMinute = Math.round(minutes.reduce((a, b) => a + b, 0) / minutes.length);
    
    return `${avgHour.toString().padStart(2, '0')}h${avgMinute.toString().padStart(2, '0')}`;
  }

  /**
   * Analyse le mois le plus performant (pas juste le plus actif)
   */
  function getBestPerformingMonth(videosList: VideoData[]): string {
    if (!videosList.length) return 'Non disponible';
    
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    
    const monthPerformance: Record<number, { videos: number, totalViews: number, avgViews: number }> = {};
    
    videosList.forEach(video => {
      const month = new Date(video.published_at).getMonth();
      
      if (!monthPerformance[month]) {
        monthPerformance[month] = { videos: 0, totalViews: 0, avgViews: 0 };
      }
      
      monthPerformance[month].videos++;
      monthPerformance[month].totalViews += video.views;
    });
    
    // Calcule les moyennes
    Object.keys(monthPerformance).forEach(monthStr => {
      const month = parseInt(monthStr);
      if (monthPerformance[month].videos > 0) {
        monthPerformance[month].avgViews = monthPerformance[month].totalViews / monthPerformance[month].videos;
      }
    });
    
    // Trouve le mois le plus performant
    let bestMonth = 0;
    let bestAvgViews = 0;
    
    Object.keys(monthPerformance).forEach(monthStr => {
      const month = parseInt(monthStr);
      if (monthPerformance[month]?.videos > 0 && monthPerformance[month].avgViews > bestAvgViews) {
        bestAvgViews = monthPerformance[month].avgViews;
        bestMonth = month;
      }
    });
    
    const bestMonthName = monthNames[bestMonth];
    const context = monthPerformance[bestMonth]?.videos > 1 ? 
      ` (${monthPerformance[bestMonth].videos} vidéos, ${Math.round(bestAvgViews)} vues moy.)` : 
      ` (${Math.round(bestAvgViews)} vues)`;
    
    return `${bestMonthName}${context}`;
  }

  // ==================== FONCTIONS EXISTANTES (gardées mais certaines modifiées) ====================

  function getBestPerformingVideo(videosList: VideoData[]): VideoData | null {
    if (!videosList.length) return null;
    return videosList.reduce(
      (best, current) => (current.views > best.views ? current : best),
      videosList[0]
    );
  }

  function calculateAverageEngagement(videosList: VideoData[]): string {
    if (!videosList.length) return "0";

    const totalEngagement = videosList.reduce((sum, video) => {
      if (video.views === 0) return sum;
      return sum + ((video.likes + video.comments) / video.views) * 100;
    }, 0);

    return (totalEngagement / videosList.length).toFixed(1);
  }

  // Fonction pour analyser la régularité (gardée)
  function getPublicationConsistency(videosList: VideoData[]): string {
    if (!videosList.length) return "Aucune donnée";

    const sortedVideos = [...videosList].sort(
      (a, b) =>
        new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
    );

    const firstVideo = new Date(sortedVideos[0].published_at);
    const lastVideo = new Date(
      sortedVideos[sortedVideos.length - 1].published_at
    );

    const yearDiff = lastVideo.getFullYear() - firstVideo.getFullYear();

    const yearsWithVideos = new Set<number>();
    videosList.forEach((video) => {
      const year = new Date(video.published_at).getFullYear();
      yearsWithVideos.add(year);
    });

    const yearsArray = Array.from(yearsWithVideos).sort();

    if (yearsArray.length === 1) {
      return `Toutes les vidéos en ${yearsArray[0]}`;
    }

    const allYears: number[] = [];
    for (
      let year = yearsArray[0];
      year <= yearsArray[yearsArray.length - 1];
      year++
    ) {
      allYears.push(year);
    }

    const missingYears = allYears.filter((year) => !yearsArray.includes(year));

    if (missingYears.length === 0) {
      return `${yearsArray[0]}-${
        yearsArray[yearsArray.length - 1]
      } (${yearDiff} ans d'activité régulière)`;
    }

    if (missingYears.length === 1) {
      return `${yearsArray.join(", ")} avec pause en ${missingYears[0]}`;
    }

    return `${yearsArray.join(", ")} (gaps: ${missingYears.join(", ")})`;
  }

  function getDetailedRecommendations(videosList: VideoData[]): string[] {
    if (!videosList.length)
      return ["Importez vos données YouTube pour des recommandations"];

    const insights: string[] = [];

    // Analyse de l'engagement
    const engagementVideos = videosList.filter(
      (v) => v.likes > 0 || v.comments > 0
    ).length;
    if (engagementVideos === 0) {
      insights.push(
        "❌ Aucune interaction : ajoutez des appels à l'action explicites"
      );
    } else if (engagementVideos <= videosList.length * 0.3) {
      insights.push(
        "⚠️ Engagement faible : posez des questions dans vos vidéos"
      );
    }

    // Analyse de la régularité
    const consistency = getPublicationConsistency(videosList);
    if (consistency.includes("gaps") || consistency.includes("pause")) {
      insights.push(
        "📅 Publication irrégulière : établissez un calendrier éditorial"
      );
    }

    // Analyse des performances
    const avgViews = calculateTotalViews(videosList) / videosList.length;
    if (avgViews < 10) {
      insights.push(
        "👀 Faible visibilité : travaillez l'optimisation SEO (titres, descriptions, tags)"
      );
    } else if (avgViews < 50) {
      insights.push(
        "📈 Visibilité modérée : continuez et augmentez la fréquence"
      );
    }

    // Analyse du contenu
    const hasTags = videosList.some((v) => v.video_title.includes("#"));
    if (hasTags) {
      insights.push("✅ Bonne utilisation des hashtags, continuez !");
    } else {
      insights.push(
        "🔖 Ajoutez des hashtags pertinents pour augmenter la découvrabilité"
      );
    }

    // Recommandations spécifiques pour AMV
    insights.push(
      "🎬 Pour les AMV : ciblez des moments clés des animés populaires"
    );
    insights.push(
      "🎵 Synchronisez parfaitement musique et scènes pour plus d'impact"
    );

    // Recommandation basée sur la meilleure vidéo
    const bestVideo = getBestPerformingVideo(videosList);
    if (bestVideo) {
      insights.push(
        `⭐ Votre meilleure vidéo "${bestVideo.video_title.substring(
          0,
          30
        )}..." a ${bestVideo.views} vues - reproduisez ce succès !`
      );
    }

    // Si pas assez de recommandations, ajoute des conseils généraux
    if (insights.length < 4) {
      insights.push("📱 Partagez vos vidéos sur les réseaux sociaux");
      insights.push(
        "⏱️ Gardez vos AMV entre 1-3 minutes pour maximiser l'engagement"
      );
      insights.push("🔔 Activez les notifications pour votre communauté");
    }

    return insights;
  }

  function getPublicationFrequency(videosList: VideoData[]): string {
    if (videosList.length < 2) return "Données insuffisantes";

    const sortedVideos = [...videosList].sort(
      (a, b) =>
        new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
    );

    const timeDiffs: number[] = [];
    for (let i = 1; i < sortedVideos.length; i++) {
      const diff =
        new Date(sortedVideos[i].published_at).getTime() -
        new Date(sortedVideos[i - 1].published_at).getTime();
      timeDiffs.push(diff);
    }

    const avgDiffMs = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const avgDiffDays = avgDiffMs / (1000 * 60 * 60 * 24);

    if (avgDiffDays < 7) return "Très régulier (hebdomadaire)";
    if (avgDiffDays < 30) return "Régulier (mensuel)";
    if (avgDiffDays < 90) return "Occasionnel (trimestriel)";
    return "Peu fréquent";
  }

  // Fonction pour trouver le mois le plus actif (remplacée par getBestPerformingMonth)
  function getMostActiveMonth(videosList: VideoData[]): string {
    if (!videosList.length) return "Non disponible";

    const monthNames = [
      "Janvier",
      "Février",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Août",
      "Septembre",
      "Octobre",
      "Novembre",
      "Décembre",
    ];

    const monthCount: Record<number, number> = {};
    videosList.forEach((video) => {
      const month = new Date(video.published_at).getMonth();
      monthCount[month] = (monthCount[month] || 0) + 1;
    });

    const mostActiveMonth = Object.keys(monthCount).reduce((a, b) =>
      monthCount[parseInt(a)] > monthCount[parseInt(b)] ? a : b
    );

    return monthNames[parseInt(mostActiveMonth)];
  }

  function calculateTotalViews(videosList: VideoData[]): number {
    return videosList.reduce((sum, video) => sum + video.views, 0);
  }

  // ==================== FONCTIONS DE GESTION ====================

  async function checkUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error fetching user:", error);
        router.push("/login");
        return;
      }

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);
    } catch (error) {
      console.error("Auth error:", error);
      router.push("/login");
    }
  }

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        return;
      }

      if (!profile?.youtube_channel_id) {
        router.push("/dashboard/connect");
        return;
      }

      const channelId = profile.youtube_channel_id;

      const { data: latestStats } = await supabase
        .from("channel_analytics")
        .select("*")
        .eq("channel_id", channelId)
        .order("date", { ascending: false })
        .limit(1)
        .single();

      const { data: historicalData } = await supabase
        .from("channel_analytics")
        .select("*")
        .eq("channel_id", channelId)
        .order("date", { ascending: true });

      const { data: videosData } = await supabase
        .from("video_analytics")
        .select("*")
        .eq("channel_id", channelId)
        .order("published_at", { ascending: false })
        .limit(10);

      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        const response = await fetch(
          `/api/youtube/channel-stats?channelId=${channelId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const currentStats = await response.json();

          setChannel({
            title: profile.youtube_channel_title || "Ma Chaîne",
            thumbnail: profile.youtube_channel_thumbnail || "",
            subscribers: currentStats.subscribers || 0,
            totalViews: currentStats.views || 0,
            totalVideos: currentStats.videos || 0,
            growthRate: 0,
          });
        }
      } catch (apiError) {
        console.warn("Impossible de récupérer les stats actuelles:", apiError);
        setChannel({
          title: profile.youtube_channel_title || "Ma Chaîne",
          thumbnail: profile.youtube_channel_thumbnail || "",
          subscribers: latestStats?.subscribers || 0,
          totalViews: latestStats?.total_views || 0,
          totalVideos: latestStats?.total_videos || 0,
          growthRate: 0,
        });
      }

      const formattedAnalytics: AnalyticsData[] = (historicalData || []).map(
        (item) => ({
          date: item.date,
          subscribers: item.subscribers || 0,
          views: item.views || 0,
          watchTime: item.watch_time_minutes || 0,
          newSubscribers: 0,
        })
      );

      setAnalyticsData(formattedAnalytics);

      const formattedVideos: VideoData[] = (videosData || []).map((video) => ({
        id: video.id,
        video_title: video.video_title || "Sans titre",
        published_at: video.published_at,
        views: video.views || 0,
        likes: video.likes || 0,
        comments: video.comments || 0,
        watch_time_minutes: video.watch_time_minutes || 0,
        avg_view_duration: video.avg_view_duration || 0,
        thumbnail_url:
          video.thumbnail_url ||
          `https://picsum.photos/seed/${video.video_id}/320/180`,
      }));

      setVideos(formattedVideos);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);

      const mockAnalytics = generateMockData(timeRange);
      setAnalyticsData(mockAnalytics);
      const mockVideos = generateMockVideos();
      setVideos(mockVideos);
    } finally {
      setLoading(false);
    }
  }, [user, timeRange, router, supabase]);

  async function handleImportData() {
    if (!user) return;

    try {
      setImporting(true);

      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const response = await fetch("/api/youtube/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        alert("Données importées avec succès !");
        fetchDashboardData(); // Rafraîchit les données
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Échec de l'import");
      }
    } catch (error: any) {
      console.error("Import error:", error);
      alert(`Erreur lors de l'import des données: ${error.message}`);
    } finally {
      setImporting(false);
    }
  }

  function calculateGrowthRate(analytics: AnalyticsData[]): number {
    if (analytics.length < 2) return 0;

    const latest = analytics[analytics.length - 1];
    const previous = analytics[analytics.length - 2];

    if (!previous.subscribers || previous.subscribers === 0) return 0;

    const growth =
      ((latest.subscribers - previous.subscribers) / previous.subscribers) *
      100;
    return Math.round(growth * 100) / 100;
  }

  function generateMockData(timeRange: string): AnalyticsData[] {
    const days = timeRange === "7d" ? 7 : timeRange === "90d" ? 90 : 30;
    const data: AnalyticsData[] = [];
    let subscribers = 10000;

    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dailyGrowth = Math.floor(Math.random() * 50) + 10;
      subscribers += dailyGrowth;

      data.push({
        date: date.toISOString().split("T")[0],
        subscribers,
        newSubscribers: dailyGrowth,
        views: Math.floor(Math.random() * 5000) + 1000,
        watchTime: Math.floor(Math.random() * 300) + 100,
      });
    }

    return data;
  }

  function generateMockVideos(): VideoData[] {
    const videos: VideoData[] = [];
    const titles = [
      "Comment créer du contenu viral en 2024",
      "Les secrets du SEO YouTube",
      "Analyse complète de ma meilleure vidéo",
      "Tutoriel Next.js 15 avec Supabase",
      "Les tendances YouTube à suivre absolument",
    ];

    for (let i = 0; i < 10; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));

      videos.push({
        id: `video-${i}`,
        video_title: titles[i % titles.length],
        published_at: date.toISOString(),
        views: Math.floor(Math.random() * 50000) + 1000,
        likes: Math.floor(Math.random() * 5000) + 100,
        comments: Math.floor(Math.random() * 500) + 10,
        watch_time_minutes: Math.floor(Math.random() * 1000) + 100,
        avg_view_duration: Math.floor(Math.random() * 180) + 60,
        thumbnail_url: `https://picsum.photos/seed/video${i}/320/180`,
      });
    }

    return videos;
  }

  // ==================== RENDU ====================

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-300">Vérification de l'authentification...</p>
        </div>
      </div>
    );
  }

  if (loading && user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-300">Chargement des données YouTube...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {channel?.thumbnail && (
                <img
                  src={channel.thumbnail}
                  alt={channel.title}
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">
                  {channel?.title || "Dashboard"}
                </h1>
                <p className="text-gray-400 text-sm">YouTube Analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleImportData}
                disabled={importing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {importing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Importer les données
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-500" />
              <TrendingUp
                className={`w-5 h-5 ${
                  calculateGrowthRate(analyticsData) >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              />
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {channel?.subscribers?.toLocaleString() || "0"}
            </h3>
            <p className="text-gray-400">Abonnés</p>
            <div
              className={`mt-2 text-sm ${
                calculateGrowthRate(analyticsData) >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {calculateGrowthRate(analyticsData) >= 0 ? "+" : ""}
              {calculateGrowthRate(analyticsData)}% ce mois-ci
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Eye className="w-8 h-8 text-purple-500" />
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {channel?.totalViews?.toLocaleString() || "0"}
            </h3>
            <p className="text-gray-400">Vues totales</p>
            <div className="mt-2 text-sm text-green-500">
              +0% ce mois-ci
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Video className="w-8 h-8 text-green-500" />
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-1">{videos.length || "0"}</h3>
            <p className="text-gray-400">Vidéos analysées</p>
            <div className="mt-2 text-sm text-green-500">
              {videos.length} vidéos importées
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-yellow-500" />
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold mb-1">
              {analyticsData
                .reduce((total, day) => total + day.watchTime, 0)
                .toLocaleString()}{" "}
              min
            </h3>
            <p className="text-gray-400">Temps de visionnage total</p>
            <div className="mt-2 text-sm text-green-500">
              +0% ce mois-ci
            </div>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold flex items-center">
            <BarChart3 className="w-6 h-6 mr-2" />
            Analytics
          </h2>
          <div className="flex space-x-2">
            <Button
              variant={timeRange === "7d" ? "default" : "outline"}
              onClick={() => setTimeRange("7d")}
              className="flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2" />7 jours
            </Button>
            <Button
              variant={timeRange === "30d" ? "default" : "outline"}
              onClick={() => setTimeRange("30d")}
              className="flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              30 jours
            </Button>
            <Button
              variant={timeRange === "90d" ? "default" : "outline"}
              onClick={() => setTimeRange("90d")}
              className="flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2" />
              90 jours
            </Button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">
              Évolution des abonnés
            </h3>
            <SubscribersChart data={analyticsData} />
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">
              Vues et temps de visionnage
            </h3>
            <ViewsChart data={analyticsData} />
          </div>
        </div>

        {/* Videos Section */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold">Vidéos récentes</h3>
            <div className="flex items-center space-x-3">
              <Button variant="outline" className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filtrer
              </Button>
              <Button variant="outline">Voir toutes les vidéos</Button>
            </div>
          </div>
          <VideosTable videos={videos} />
        </div>

        {/* Insights Section - VERSION AMÉLIORÉE AVEC ANALYSE INTELLIGENTE */}
        <div className="mt-8 bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-700/50">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Colonne gauche : Icône et titre */}
            <div className="lg:w-1/12 flex justify-center lg:justify-start">
              <AlertCircle className="w-8 h-8 text-blue-400 lg:mt-1 flex-shrink-0" />
            </div>
            
            {/* Colonne droite : Contenu */}
            <div className="lg:w-11/12">
              <h3 className="text-xl font-bold mb-4 text-white">
                📊 Analyse détaillée de vos {videos.length} vidéos
              </h3>
              
              {videos.length > 0 ? (
                <>
                  {/* Section Top vidéo - Mise en avant */}
                  <div className="mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                          <span className="text-white font-bold">🏆</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg text-yellow-300 mb-1">
                          Vidéo star du moment
                        </h4>
                        {(() => {
                          const bestVideo = getBestPerformingVideo(videos);
                          return bestVideo ? (
                            <div className="space-y-2">
                              <p className="text-gray-300">
                                <span className="font-medium text-white">
                                  "{bestVideo.video_title.length > 50 
                                    ? bestVideo.video_title.substring(0, 50) + "..." 
                                    : bestVideo.video_title}"
                                </span>
                              </p>
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Eye className="w-4 h-4 text-blue-400" />
                                  <span className="text-gray-300">
                                    <span className="font-semibold text-white">{bestVideo.views}</span> vues
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ThumbsUp className="w-4 h-4 text-green-400" />
                                  <span className="text-gray-300">
                                    <span className="font-semibold text-white">{bestVideo.likes}</span> likes
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageCircle className="w-4 h-4 text-purple-400" />
                                  <span className="text-gray-300">
                                    <span className="font-semibold text-white">{bestVideo.comments}</span> commentaires
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Grid des stats principales - VERSION AMÉLIORÉE */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Carte Performances */}
                    <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center">
                          <BarChart3 className="w-4 h-4 text-blue-400" />
                        </div>
                        <h4 className="font-semibold text-blue-300">📊 Performances globales</h4>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Vues moyennes</span>
                            <span className="text-xs text-gray-500">(par vidéo)</span>
                          </div>
                          <div className="font-semibold text-white text-lg">
                            {Math.round(calculateTotalViews(videos) / videos.length)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Engagement moyen</span>
                            <span className="text-xs text-gray-500">(likes + comments)</span>
                          </div>
                          <div className="font-semibold text-white text-lg">
                            {calculateAverageEngagement(videos)}%
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Vidéos avec interactions</span>
                          </div>
                          <div className="font-semibold text-white">
                            {videos.filter(v => v.likes > 0 || v.comments > 0).length}/{videos.length}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Carte Publication optimale - NOUVELLE VERSION */}
                    <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-900/50 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-purple-400" />
                        </div>
                        <h4 className="font-semibold text-purple-300">📅 Publication optimale</h4>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Meilleur jour</span>
                            <span className="text-xs text-gray-500">(performances)</span>
                          </div>
                          <div className="font-semibold text-white text-lg">
                            {getBestPerformingDay(videos)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Meilleure tranche horaire</span>
                            <span className="text-xs text-gray-500">(performances)</span>
                          </div>
                          <div className="font-semibold text-white text-lg">
                            {getBestPerformingTimeSlot(videos)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Heure moyenne de publication</span>
                          </div>
                          <div className="font-semibold text-white">
                            {getAveragePublishingTime(videos)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Carte Performances temporelles - NOUVELLE VERSION */}
                    <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-700">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-900/50 flex items-center justify-center">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                        </div>
                        <h4 className="font-semibold text-green-300">📈 Performances temporelles</h4>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Mois le plus performant</span>
                            <span className="text-xs text-gray-500">(vues moy.)</span>
                          </div>
                          <div className="font-semibold text-white text-lg">
                            {getBestPerformingMonth(videos)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Période d'activité</span>
                          </div>
                          <div className="font-semibold text-white">
                            {getPublicationConsistency(videos)}
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-400 text-sm">Fréquence de publication</span>
                          </div>
                          <div className="font-semibold text-white">
                            {getPublicationFrequency(videos)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Section Recommandations */}
                  <div className="bg-gray-900/70 rounded-xl p-5 border border-yellow-700/30">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-600/20 to-orange-600/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        {/* Alternative si Lightbulb ne fonctionne pas :
                        <Star className="w-5 h-5 text-yellow-400" /> 
                        <Zap className="w-5 h-5 text-yellow-400" /> */}
                      </div>
                      <div>
                        <h4 className="font-semibold text-xl text-yellow-300">
                          💡 Recommandations stratégiques
                        </h4>
                        <p className="text-sm text-gray-400">
                          Basé sur l'analyse de vos {videos.length} vidéos
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {getDetailedRecommendations(videos)
                        .slice(0, 8)
                        .map((rec: string, index: number) => (
                          <div 
                            key={index} 
                            className="bg-gray-800/50 p-3 rounded-lg border-l-4 border-blue-500 hover:bg-gray-800/70 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <div className={`mt-1 w-5 h-5 rounded-full flex items-center justify-center text-xs
                                ${index < 2 ? 'bg-red-500/20 text-red-400' : 
                                  index < 4 ? 'bg-yellow-500/20 text-yellow-400' : 
                                  'bg-blue-500/20 text-blue-400'}`}
                              >
                                {index + 1}
                              </div>
                              <p className="text-sm text-gray-300 flex-1">{rec}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                    
                    {getDetailedRecommendations(videos).length > 8 && (
                      <div className="mt-4 text-center">
                        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                          + {getDetailedRecommendations(videos).length - 8} autres recommandations
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-gray-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-300 mb-2">
                    Aucune donnée à analyser
                  </h4>
                  <p className="text-gray-500 mb-4">
                    Importez vos données YouTube pour voir des insights personnalisés
                  </p>
                  <button 
                    onClick={handleImportData}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Importer mes données
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}