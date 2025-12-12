// app/api/youtube/channel-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

const youtube = google.youtube('v3');

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Vérifie l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Récupère les tokens YouTube de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_access_token, youtube_refresh_token')
      .eq('id', user.id)
      .single();

    if (!profile?.youtube_access_token) {
      return NextResponse.json(
        { error: 'YouTube not connected' },
        { status: 400 }
      );
    }

    // Configure le client OAuth2
    const oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
    );

    oauth2Client.setCredentials({
      access_token: profile.youtube_access_token,
      refresh_token: profile.youtube_refresh_token
    });

    // Récupère les statistiques de la chaîne
    const response = await youtube.channels.list({
      auth: oauth2Client,
      part: ['statistics', 'snippet'],
      id: [channelId]
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
      views: parseInt(channel.statistics?.viewCount || '0'),
      videos: parseInt(channel.statistics?.videoCount || '0'),
      hiddenSubscriberCount: channel.statistics?.hiddenSubscriberCount || false,
      title: channel.snippet?.title,
      description: channel.snippet?.description,
      thumbnail: channel.snippet?.thumbnails?.high?.url
    });

  } catch (error: any) {
    console.error('Error fetching channel stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch channel statistics',
        details: error.message 
      },
      { status: 500 }
    );
  }
}