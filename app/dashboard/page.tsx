// app/dashboard/page.tsx (Server Component)
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { google } from 'googleapis';

import { DashboardClient } from "./dashboard-client";
import { RefreshCw } from "lucide-react";

const youtube = google.youtube('v3');

// Define interfaces for the data shapes
interface ChannelStats {
    title: string;
    thumbnail: string;
    subscribers: number;
    totalViews: number;
    totalVideos: number;
    growthRate: number; // This might be calculated on the client or passed
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

async function getCurrentChannelStats(profile: any, channelId: string) {
    if (!profile?.youtube_access_token) {
        console.warn('User does not have a YouTube access token.');
        return null;
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
        );

        oauth2Client.setCredentials({
            access_token: profile.youtube_access_token,
            refresh_token: profile.youtube_refresh_token
        });

        const response = await youtube.channels.list({
            auth: oauth2Client,
            part: ['statistics', 'snippet'],
            id: [channelId]
        });

        const channel = response.data.items?.[0];
        if (!channel) {
            return null;
        }

        return {
            subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
            views: parseInt(channel.statistics?.viewCount || '0'),
            videos: parseInt(channel.statistics?.videoCount || '0'),
        };
    } catch (error) {
        console.error('Failed to fetch current channel stats from YouTube:', error);
        return null; // Return null on error to avoid crashing the whole page
    }
}


async function getDashboardData() {
    const cookieStore = cookies();
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        if (profileError?.code === 'PGRST116') { // Not found
             redirect("/dashboard/connect");
        }
        throw new Error("Failed to fetch user profile.");
    }
    
    if (!profile.youtube_channel_id) {
        redirect("/dashboard/connect");
    }

    const channelId = profile.youtube_channel_id;

    // Fetch all data in parallel
    const [
        latestStatsResult,
        historicalDataResult,
        videosDataResult,
        currentStatsResult
    ] = await Promise.allSettled([
        supabase
            .from("channel_analytics")
            .select("*")
            .eq("channel_id", channelId)
            .order("date", { ascending: false })
            .limit(1)
            .single(),
        supabase
            .from("channel_analytics")
            .select("*")
            .eq("channel_id", channelId)
            .order("date", { ascending: true }),
        supabase
            .from("video_analytics")
            .select("*")
            .eq("channel_id", channelId)
            .order("published_at", { ascending: false })
            .limit(10),
        getCurrentChannelStats(profile, channelId)
    ]);
    
    // Process results
    const latestStats = latestStatsResult.status === 'fulfilled' ? latestStatsResult.value.data : null;
    const historicalData = historicalDataResult.status === 'fulfilled' ? historicalDataResult.value.data : [];
    const videosData = videosDataResult.status === 'fulfilled' ? videosDataResult.value.data : [];
    const currentStats = currentStatsResult.status === 'fulfilled' ? currentStatsResult.value : null;

    const channel: ChannelStats = {
        title: profile.youtube_channel_title || "Ma Chaîne",
        thumbnail: profile.youtube_channel_thumbnail || "",
        subscribers: currentStats?.subscribers ?? latestStats?.subscribers ?? 0,
        totalViews: currentStats?.views ?? latestStats?.total_views ?? 0,
        totalVideos: currentStats?.videos ?? latestStats?.videos_count ?? 0,
        growthRate: 0, // Calculated on client
    };

    const formattedAnalytics: AnalyticsData[] = (historicalData || []).map(
        (item: any) => ({
            date: item.date,
            subscribers: item.subscribers || 0,
            views: item.total_views || 0, // Corrected field name
            watchTime: item.watch_time_minutes || 0,
            newSubscribers: 0, // This needs to be calculated if required
        })
    );

    const formattedVideos: VideoData[] = (videosData || []).map((video: any) => ({
        id: video.id,
        video_title: video.video_title || "Sans titre",
        published_at: video.published_at,
        views: video.views || 0,
        likes: video.likes || 0,
        comments: video.comments || 0,
        watch_time_minutes: video.watch_time_minutes || 0,
        avg_view_duration: video.avg_view_duration || 0,
        thumbnail_url: video.thumbnail_url || `https://picsum.photos/seed/${video.video_id}/320/180`,
    }));

    return {
        initialChannel: channel,
        initialAnalyticsData: formattedAnalytics,
        initialVideos: formattedVideos,
        userId: user.id,
    };
}


export default async function DashboardPage() {
    
    const data = await getDashboardData();
    
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardClient 
                initialChannel={data.initialChannel}
                initialAnalyticsData={data.initialAnalyticsData}
                initialVideos={data.initialVideos}
                userId={data.userId}
            />
        </Suspense>
    );
}

function DashboardLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-gray-300">Chargement des données du tableau de bord...</p>
            </div>
        </div>
    );
}
