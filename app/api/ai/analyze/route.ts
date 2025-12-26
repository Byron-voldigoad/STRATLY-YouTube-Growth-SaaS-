// app/api/ai/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { OpenAIAnalyzer } from '@/lib/ai/openai-service';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[AI ANALYZE] Authentication failed.', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const { videos, channelStats, analysisType, forceRefresh = false } = await request.json();
    if (!videos || !channelStats || !analysisType) {
      return NextResponse.json({ error: 'Missing required parameters: videos, channelStats, analysisType' }, { status: 400 });
    }

    // This caching logic only applies to the main channel analysis
    if (analysisType === 'channel') {
      // 3. Get user's channel ID from their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('youtube_channel_id')
        .eq('id', user.id)
        .single();
        
      if (!profile?.youtube_channel_id) {
        return NextResponse.json({ error: 'YouTube channel not connected.' }, { status: 400 });
      }
      const channelId = profile.youtube_channel_id;

      // 4. Check for a cached analysis in the database if not forcing refresh
      if (!forceRefresh) {
        const { data: cachedAnalysis } = await supabase
          .from('ai_analyses')
          .select('analysis_text, created_at')
          .eq('user_id', user.id)
          .eq('channel_id', channelId)
          .gt('expires_at', new Date().toISOString())
          .single();

        if (cachedAnalysis) {
          console.log('✅ [AI ANALYZE] Using cached analysis from database.');
          return NextResponse.json({
            analysis: cachedAnalysis.analysis_text,
            generatedAt: cachedAnalysis.created_at,
            cached: true,
          });
        }
      }
    }

    // 5. If not cached or not applicable, generate new analysis
    console.log(`🔄 [AI ANALYZE] Generating new analysis for type: ${analysisType}`);
    const analyzer = new OpenAIAnalyzer();
    let responseData: any;
    const generatedAt = new Date().toISOString();

    if (analysisType === 'channel') {
      const analysis = await analyzer.analyzeChannelPerformance(videos, channelStats);
      
      // 6. Save the new analysis to the database
      const { data: profile } = await supabase.from('profiles').select('youtube_channel_id').eq('id', user.id).single();
      if (profile?.youtube_channel_id) {
        console.log('💾 [AI ANALYZE] Saving new analysis to database cache.');
        await supabase.from('ai_analyses').upsert({
          user_id: user.id,
          channel_id: profile.youtube_channel_id,
          analysis_text: analysis,
          provider: 'openai',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'user_id,channel_id' });
      }
      
      responseData = { analysis, generatedAt, cached: false };

    } else if (analysisType === 'ideas') {
      const ideas = await analyzer.generateVideoIdeas(videos);
      responseData = { ideas, generatedAt };
    } else {
      return NextResponse.json({ error: 'Invalid analysisType' }, { status: 400 });
    }

    // 7. Return the response
    return NextResponse.json(responseData);

  } catch (error: any) {
    console.error('[AI ANALYZE API_ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to generate AI analysis', details: error.message },
      { status: 500 }
    );
  }
}
