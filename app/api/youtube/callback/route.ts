import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  console.log('🔥🔥🔥 YOUTUBE CALLBACK TRIGGERED 🔥🔥🔥');
  console.log('Full URL:', request.url);
  
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    const state = url.searchParams.get('state');
    
    console.log('📋 Callback parameters:');
    console.log('- Code present:', !!code, '(length:', code?.length, ')');
    console.log('- Error:', error);
    console.log('- State:', state);
    console.log('- All params:', Object.fromEntries(url.searchParams.entries()));
    
    // 1. VÉRIFIER LES VARIABLES D'ENVIRONNEMENT
    console.log('🔧 Environment check:');
    console.log('- Client ID:', process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? '✅ Present' : '❌ MISSING');
    console.log('- Client Secret:', process.env.GOOGLE_CLIENT_SECRET ? '✅ Present' : '❌ MISSING');
    console.log('- App URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('- Redirect URI:', `${process.env.NEXT_PUBLIC_APP_URL}/api/youtube/callback`);
    
    if (error) {
      console.error('❌ OAuth error from Google:', error);
      return NextResponse.redirect(new URL('/dashboard/connect?error=' + error, request.url));
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(new URL('/dashboard/connect?error=no_code', request.url));
    }

    // 2. DÉCODER LE STATE
    let userId = null;
    if (state) {
      try {
        const stateObj = JSON.parse(state);
        userId = stateObj.userId;
        console.log('📌 User ID from state:', userId);
      } catch (e) {
        console.error('❌ Error parsing state:', e);
      }
    }
    
    // 3. ÉCHANGER LE CODE CONTRE DES TOKENS
    console.log('🔄 Exchanging code for tokens...');
    const tokenBody = new URLSearchParams({
      code,
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/youtube/callback`,
      grant_type: 'authorization_code',
    });
    
    console.log('📤 Token request body:', tokenBody.toString());
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody,
    });

    const tokenText = await tokenResponse.text();
    console.log('📥 Token raw response:', tokenText);
    
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch (e) {
      console.error('❌ Error parsing token response:', e);
      console.error('Raw response:', tokenText);
      return NextResponse.redirect(new URL('/dashboard/connect?error=token_parse_error', request.url));
    }
    
    console.log('🔑 Token response analysis:');
    console.log('- Status:', tokenResponse.status);
    console.log('- Has access_token:', !!tokenData.access_token);
    console.log('- Has refresh_token:', !!tokenData.refresh_token);
    console.log('- Error from Google:', tokenData.error);
    console.log('- Error description:', tokenData.error_description);

    if (!tokenResponse.ok) {
      console.error('❌ Token exchange failed:', tokenData);
      return NextResponse.redirect(
        new URL('/dashboard/connect?error=token_exchange_failed', request.url)
      );
    }

    const { access_token, refresh_token, expires_in } = tokenData;
    
    // 4. RÉCUPÉRER LES INFOS DE LA CHAÎNE
    console.log('🎬 Fetching YouTube channel info...');
    const channelResponse = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    const channelText = await channelResponse.text();
    console.log('📥 Channel raw response:', channelText);
    
    let channelData;
    try {
      channelData = JSON.parse(channelText);
    } catch (e) {
      console.error('❌ Error parsing channel response:', e);
      return NextResponse.redirect(new URL('/dashboard/connect?error=channel_parse_error', request.url));
    }
    
    console.log('📊 Channel response analysis:');
    console.log('- Status:', channelResponse.status);
    console.log('- Items count:', channelData.items?.length);
    console.log('- Error:', channelData.error?.message);
    
    if (!channelResponse.ok || !channelData.items?.[0]) {
      console.error('❌ Failed to fetch channel data:', channelData);
      
      // Essayer une requête plus simple
      console.log('🔄 Trying simple channel request...');
      const simpleResponse = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet',
        {
          headers: {
            'Authorization': `Bearer ${access_token}`,
          },
        }
      );
      const simpleData = await simpleResponse.json();
      console.log('Simple response:', simpleData);
      
      return NextResponse.redirect(
        new URL('/dashboard/connect?error=no_channel_found', request.url)
      );
    }

    const channelId = channelData.items[0].id;
    const channelSnippet = channelData.items[0].snippet;
    const channelStats = channelData.items[0].statistics;

    console.log('✅ Channel info retrieved:');
    console.log('- Channel ID:', channelId);
    console.log('- Channel Title:', channelSnippet.title);
    console.log('- Subscribers:', channelStats?.subscriberCount);
    console.log('- Thumbnail:', channelSnippet.thumbnails?.default?.url);

    // 5. SAUVEGARDER DANS LA BASE
    console.log('💾 Saving to database...');
    console.log('- User ID to update:', userId);
    
    const supabase = await createServerSupabaseClient();
    
    // D'abord, vérifier si l'utilisateur existe
    const { data: userCheck } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();
    
    console.log('👤 User check result:', userCheck);
    
    if (!userCheck) {
      console.error('❌ User not found in profiles table');
      // Si l'utilisateur n'existe pas, le créer
      console.log('🔄 Creating user profile...');
      
      // Récupérer l'email depuis auth.users
      const { data: authUser } = await supabase.auth.getUser();
      console.log('Auth user:', authUser);
      
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: authUser.user?.email || 'unknown@email.com',
          created_at: new Date().toISOString(),
        });
      
      if (createError) {
        console.error('❌ Error creating profile:', createError);
      } else {
        console.log('✅ Profile created');
      }
    }
    
    // Calculer l'expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);
    
    console.log('📝 Update data:', {
      access_token_length: access_token?.length,
      refresh_token_length: refresh_token?.length,
      channelId,
      expiresAt: expiresAt.toISOString()
    });
    
    // Mettre à jour le profil
    const { error: updateError, data: updateResult } = await supabase
      .from('profiles')
      .update({
        youtube_access_token: access_token,
        youtube_refresh_token: refresh_token,
        youtube_channel_id: channelId,
        youtube_token_expires_at: expiresAt.toISOString(),
        youtube_channel_title: channelSnippet.title,
        youtube_channel_thumbnail: channelSnippet.thumbnails?.default?.url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select();
    
    console.log('💾 Update result:', {
      error: updateError,
      rowsUpdated: updateResult?.length,
      data: updateResult
    });

    if (updateError) {
      console.error('❌ Database update failed:', updateError);
      console.error('Error details:', updateError.details, updateError.hint, updateError.message);
      return NextResponse.redirect(
        new URL('/dashboard/connect?error=database_error', request.url)
      );
    }

    console.log('🎉 YOUTUBE CONNECTION SUCCESSFUL!');
    console.log('🔄 Redirecting to dashboard...');
    
    return NextResponse.redirect(new URL('/dashboard?success=youtube_connected', request.url));

  } catch (error: any) {
    console.error('💥 CALLBACK CATCH ERROR:', error);
    console.error('Stack:', error.stack);
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=unexpected', request.url)
    );
  }
}