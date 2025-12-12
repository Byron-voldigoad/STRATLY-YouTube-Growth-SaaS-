import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { refresh_token, user_id } = await request.json();
    
    if (!refresh_token || !user_id) {
      return NextResponse.json(
        { error: 'Refresh token and user ID required' },
        { status: 400 }
      );
    }

    // Rafraîchir le token avec Google OAuth
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = await response.json();

    if (!response.ok) {
      console.error('Token refresh failed:', tokenData);
      throw new Error(`Token refresh failed: ${tokenData.error}`);
    }

    // Calculer la date d'expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Mettre à jour la base de données
    const supabase = await createServerSupabaseClient();
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        youtube_access_token: tokenData.access_token,
        youtube_token_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user_id);

    if (updateError) {
      console.error('Database update failed:', updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }

    return NextResponse.json({
      success: true,
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
    });
    
  } catch (error: any) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to refresh token' },
      { status: 500 }
    );
  }
}