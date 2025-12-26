// app/api/youtube/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const state = url.searchParams.get('state');

  if (error) {
    console.error('❌ [YT Callback] OAuth error from Google:', error);
    return NextResponse.redirect(new URL(`/dashboard/connect?error=${error}`, request.url));
  }

  if (!code) {
    console.error('❌ [YT Callback] No authorization code received.');
    return NextResponse.redirect(new URL('/dashboard/connect?error=no_code', request.url));
  }

  let userId: string | null = null;
  try {
    if (state) {
      const stateObj = JSON.parse(state);
      userId = stateObj.userId;
    }
  } catch (e) {
    console.error('❌ [YT Callback] Error parsing state:', e);
    return NextResponse.redirect(new URL('/dashboard/connect?error=invalid_state', request.url));
  }
  
  if (!userId) {
    console.error('❌ [YT Callback] No user ID found in state.');
    return NextResponse.redirect(new URL('/dashboard/connect?error=no_user_id', request.url));
  }

  try {
    const oauth2Client = new OAuth2Client(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`
    );

    // 1. Échanger le code contre des tokens
    console.log('🔄 [YT Callback] Exchanging code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    console.log('🔑 [YT Callback] Tokens received. Refresh token present:', !!tokens.refresh_token);

    if (!tokens.access_token) {
        throw new Error('Failed to retrieve access token.');
    }
    
    // 2. Récupérer les infos de la chaîne YouTube
    oauth2Client.setCredentials(tokens);
    const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
    
    console.log('🎬 [YT Callback] Fetching YouTube channel info...');
    const channelResponse = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        mine: true,
    });

    const channel = channelResponse.data.items?.[0];
    if (!channel || !channel.id || !channel.snippet) {
      console.error('❌ [YT Callback] No channel found for this Google account.');
      return NextResponse.redirect(new URL('/dashboard/connect?error=no_channel_found', request.url));
    }

    console.log(`✅ [YT Callback] Found channel: ${channel.snippet.title} (${channel.id})`);

    // 3. Sauvegarder les informations dans Supabase
    const supabase = await createClient();
    const updateData = {
      youtube_access_token: tokens.access_token,
      // IMPORTANT: Sauvegarder le refresh_token SEULEMENT s'il est fourni.
      // Google ne renvoie le refresh_token que lors de la toute première autorisation.
      ...(tokens.refresh_token && { youtube_refresh_token: tokens.refresh_token }),
      youtube_token_expires_at: new Date(tokens.expiry_date!).toISOString(),
      youtube_channel_id: channel.id,
      youtube_channel_title: channel.snippet.title,
      youtube_channel_thumbnail: channel.snippet.thumbnails?.default?.url,
      updated_at: new Date().toISOString(),
    };

    console.log('💾 [YT Callback] Saving channel data to Supabase...');
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('❌ [YT Callback] Supabase update error:', updateError);
      return NextResponse.redirect(new URL('/dashboard/connect?error=database_error', request.url));
    }

    console.log('🎉 [YT Callback] YouTube connection successful!');
    return NextResponse.redirect(new URL('/dashboard?success=youtube_connected', request.url));

  } catch (e: any) {
    console.error('💥 [YT Callback] A critical error occurred:', e.message);
    const errorCode = e.code === 'invalid_grant' ? 'invalid_grant' : 'token_exchange_failed';
    return NextResponse.redirect(new URL(`/dashboard/connect?error=${errorCode}`, request.url));
  }
}
