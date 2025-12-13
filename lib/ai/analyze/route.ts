// app/api/ai/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { youtubeAIAnalyzer } from '@/lib/ai/gemini-service';

// Route simple pour tester l'IA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { videos, channelStats } = body;
    
    if (!videos || !channelStats) {
      return NextResponse.json(
        { error: 'Videos and channelStats are required' },
        { status: 400 }
      );
    }
    
    const analysis = await youtubeAIAnalyzer.analyzeChannelPerformance(videos, channelStats);
    
    return NextResponse.json({
      success: true,
      analysis,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('AI analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed', details: error.message },
      { status: 500 }
    );
  }
}

// Route GET pour tester rapidement
export async function GET() {
  return NextResponse.json({
    message: 'AI Analysis API is working',
    endpoints: {
      POST: '/api/ai/analyze - Send {videos, channelStats} for analysis',
      status: 'operational'
    }
  });
}