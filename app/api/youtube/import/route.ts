// app/api/youtube/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { youtubeAnalyticsService } from '@/lib/youtube/analytics-service';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    // Récupère le channel_id de l'utilisateur
    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_channel_id')
      .eq('id', user.id)
      .single();

    if (!profile?.youtube_channel_id) {
      return NextResponse.json(
        { error: 'YouTube channel not connected' },
        { status: 400 }
      );
    }

    // Lance l'import en arrière-plan (ne pas await)
    youtubeAnalyticsService.importYouTubeData(
      user.id,
      profile.youtube_channel_id
    );

    return NextResponse.json({
      success: true,
      message: 'Data import started in the background.',
    }, { status: 202 });

  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}