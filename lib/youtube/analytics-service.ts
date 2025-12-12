// lib/youtube/analytics-service.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

const youtube = google.youtube('v3');

export interface YouTubeChannelAnalytics {
  date: string;
  subscribers: number;
  totalViews: number;
  totalVideos: number;
  views: number;
  watchTimeMinutes: number;
  estimatedRevenue?: number;
  likes: number;
  comments: number;
  shares: number;
  avgViewDuration: number;
  impressions: number;
  impressionsCtr: number;
}

export interface YouTubeVideoAnalytics {
  videoId: string;
  title: string;
  description: string;
  publishedAt: string;
  views: number;
  likes: number;
  comments: number;
  watchTimeMinutes: number;
  avgViewDuration: number;
  impressions: number;
  impressionsCtr: number;
  clickThroughRate: number;
  thumbnailUrl: string;
  tags: string[];
  categoryId: string;
  durationSeconds: number;
}

export class YouTubeAnalyticsService {
  private async getAuthenticatedClient(userId: string) {
    const supabase = await createServerSupabaseClient();
    
    // Récupère les tokens depuis la base de données
    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_access_token, youtube_refresh_token, youtube_token_expires_at')
      .eq('id', userId)
      .single();

    if (!profile?.youtube_access_token) {
      throw new Error('YouTube not connected');
    }

    // Crée un client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
    );

    oauth2Client.setCredentials({
      access_token: profile.youtube_access_token,
      refresh_token: profile.youtube_refresh_token,
      expiry_date: new Date(profile.youtube_token_expires_at!).getTime()
    });

    return oauth2Client;
  }

  /**
   * Récupère les statistiques de base de la chaîne
   */
  async getChannelStatistics(userId: string, channelId: string) {
    try {
      const auth = await this.getAuthenticatedClient(userId);
      
      const response = await youtube.channels.list({
        auth,
        part: ['statistics', 'snippet', 'contentDetails'],
        id: [channelId]
      });

      const channel = response.data.items?.[0];
      if (!channel) {
        throw new Error('Channel not found');
      }

      return {
        channelId,
        title: channel.snippet?.title || '',
        description: channel.snippet?.description || '',
        thumbnail: channel.snippet?.thumbnails?.high?.url || '',
        publishedAt: channel.snippet?.publishedAt || '',
        statistics: {
          subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
          videoCount: parseInt(channel.statistics?.videoCount || '0'),
          viewCount: parseInt(channel.statistics?.viewCount || '0'),
          hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount || false
        }
      };
    } catch (error) {
      console.error('Error fetching channel statistics:', error);
      throw error;
    }
  }

  /**
   * Récupère les dernières vidéos de la chaîne
   */
  async getRecentVideos(userId: string, channelId: string, maxResults = 50) {
    try {
      const auth = await this.getAuthenticatedClient(userId);
      
      // D'abord, on récupère l'ID de la playlist "uploads"
      const channelResponse = await youtube.channels.list({
        auth,
        part: ['contentDetails'],
        id: [channelId]
      });

      const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new Error('Uploads playlist not found');
      }

      // Récupère les vidéos de la playlist
      const playlistResponse = await youtube.playlistItems.list({
        auth,
        part: ['snippet', 'contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults
      });

      // Pour chaque vidéo, récupère les statistiques détaillées
      const videoIds = playlistResponse.data.items?.map(item => item.contentDetails?.videoId).filter(Boolean) as string[];
      
      if (!videoIds.length) {
        return [];
      }

      const videosResponse = await youtube.videos.list({
        auth,
        part: ['snippet', 'statistics', 'contentDetails', 'topicDetails'],
        id: videoIds
      });

      const videos: YouTubeVideoAnalytics[] = [];

      for (const video of videosResponse.data.items || []) {
        videos.push({
          videoId: video.id!,
          title: video.snippet?.title || '',
          description: video.snippet?.description || '',
          publishedAt: video.snippet?.publishedAt || '',
          views: parseInt(video.statistics?.viewCount || '0'),
          likes: parseInt(video.statistics?.likeCount || '0'),
          comments: parseInt(video.statistics?.commentCount || '0'),
          watchTimeMinutes: 0, // À calculer via YouTube Analytics API
          avgViewDuration: 0, // À calculer via YouTube Analytics API
          impressions: 0, // À récupérer via YouTube Analytics API
          impressionsCtr: 0, // À récupérer via YouTube Analytics API
          clickThroughRate: 0, // À récupérer via YouTube Analytics API
          thumbnailUrl: video.snippet?.thumbnails?.high?.url || '',
          tags: video.snippet?.tags || [],
          categoryId: video.snippet?.categoryId || '',
          durationSeconds: this.parseDuration(video.contentDetails?.duration || 'PT0S')
        });
      }

      return videos;
    } catch (error) {
      console.error('Error fetching recent videos:', error);
      throw error;
    }
  }

  /**
   * Parse la durée ISO 8601 en secondes
   */
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Importe les données YouTube dans la base de données
   */
  async importYouTubeData(userId: string, channelId: string) {
    const supabase = await createServerSupabaseClient();
    
    try {
      // 1. Récupère les statistiques de base
      const channelStats = await this.getChannelStatistics(userId, channelId);
      
      // 2. Récupère les vidéos récentes
      const recentVideos = await this.getRecentVideos(userId, channelId, 30);
      
      // 3. Sauvegarde les statistiques journalières
      const today = new Date().toISOString().split('T')[0];
      
      await supabase
        .from('channel_analytics')
        .upsert({
          user_id: userId,
          channel_id: channelId,
          date: today,
          subscribers: channelStats.statistics.subscriberCount,
          total_views: channelStats.statistics.viewCount,
          total_videos: channelStats.statistics.videoCount,
          views: 0, // À implémenter avec YouTube Analytics API
          watch_time_minutes: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          avg_view_duration: 0,
          impressions: 0,
          impressions_ctr: 0
        }, {
          onConflict: 'channel_id,date'
        });

      // 4. Sauvegarde les vidéos
      if (recentVideos.length > 0) {
        const videosToInsert = recentVideos.map(video => ({
          user_id: userId,
          channel_id: channelId,
          video_id: video.videoId,
          video_title: video.title,
          video_description: video.description,
          published_at: video.publishedAt,
          views: video.views,
          likes: video.likes,
          comments: video.comments,
          watch_time_minutes: video.watchTimeMinutes,
          avg_view_duration: video.avgViewDuration,
          impressions: video.impressions,
          impressions_ctr: video.impressionsCtr,
          click_through_rate: video.clickThroughRate,
          thumbnail_url: video.thumbnailUrl,
          tags: video.tags,
          category_id: video.categoryId,
          duration_seconds: video.durationSeconds
        }));

        // Insert ou update en batch
        for (const video of videosToInsert) {
          await supabase
            .from('video_analytics')
            .upsert(video, {
              onConflict: 'video_id'
            });
        }
      }

      // 5. Met à jour le profil avec les dernières infos
      await supabase
        .from('profiles')
        .update({
          youtube_channel_title: channelStats.title,
          youtube_channel_thumbnail: channelStats.thumbnail
        })
        .eq('id', userId);

      return {
        success: true,
        channelStats,
        videosImported: recentVideos.length
      };

    } catch (error) {
      console.error('Error importing YouTube data:', error);
      throw error;
    }
  }

  /**
   * Récupère les données historiques pour les graphiques
   */
  async getHistoricalData(userId: string, channelId: string, days = 30) {
    const supabase = await createServerSupabaseClient();
    
    const { data: analytics } = await supabase
      .from('channel_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .order('date', { ascending: true })
      .limit(days);

    const { data: videos } = await supabase
      .from('video_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('channel_id', channelId)
      .order('published_at', { ascending: false })
      .limit(20);

    return {
      analytics: analytics || [],
      videos: videos || []
    };
  }
}

export const youtubeAnalyticsService = new YouTubeAnalyticsService();