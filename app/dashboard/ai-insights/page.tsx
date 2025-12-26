// app/dashboard/ai-insights/page.tsx (Server Component)
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { RefreshCw } from 'lucide-react';
import { AIInsightsClientPage } from './client-page'; // Import the new client component

interface VideoData {
  video_title: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string;
}

interface ChannelStats {
  title: string;
  subscribers: number;
  totalViews: number;
}

async function getInitialData() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Determine if AI is enabled based on server-side env variable
  const isAiEnabled = !!process.env.OPENAI_API_KEY;

  let videos: VideoData[] = [];
  let channelStats: ChannelStats | null = null;

  try {
    // Fetch videos
    const { data: videosData, error: videosError } = await supabase
      .from('video_analytics')
      .select('video_title, views, likes, comments, published_at')
      .eq('user_id', user.id)
      .order('views', { ascending: false })
      .limit(10); // Limit to recent videos for AI analysis

    if (videosError) {
      console.error('Error fetching videos:', videosError);
    } else if (videosData) {
      videos = videosData;
    }

    // Fetch channel profile for title and thumbnail
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('youtube_channel_title, youtube_channel_thumbnail')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    } else if (profile) {
      const totalViews = videos.reduce((sum, v) => sum + v.views, 0);
      channelStats = {
        title: profile.youtube_channel_title || 'Votre chaîne',
        subscribers: 0, // Subscribers are usually fetched from live YouTube API or dedicated analytics table
        totalViews: totalViews
      };
    }
  } catch (error) {
    console.error('Error in getInitialData:', error);
  }

  return { initialVideos: videos, initialChannelStats: channelStats, isAiEnabled };
}

export default async function AIInsightsServerPage() {
  const { initialVideos, initialChannelStats, isAiEnabled } = await getInitialData();

  return (
    <Suspense fallback={<AIInsightsLoading />}>
      <AIInsightsClientPage 
        initialVideos={initialVideos} 
        initialChannelStats={initialChannelStats} 
        isAiEnabled={isAiEnabled} 
      />
    </Suspense>
  );
}

function AIInsightsLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
        <p className="text-gray-300">Chargement des insights IA...</p>
      </div>
    </div>
  );
}
