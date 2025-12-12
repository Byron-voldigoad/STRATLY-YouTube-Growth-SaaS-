import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const accessToken = "COLLER_TON_TOKEN_ICI"; // Ton token de page.tsx
  
  try {
    // Récupérer d'abord les channels de l'utilisateur
    const response = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      data: data,
      channelId: data.items?.[0]?.id || null,
      channelTitle: data.items?.[0]?.snippet?.title || null,
    });
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}