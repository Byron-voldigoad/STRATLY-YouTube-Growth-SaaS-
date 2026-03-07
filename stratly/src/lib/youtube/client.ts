import { createClient } from '@/lib/supabase/client'

export class YouTubeClient {
  private async getAccessToken() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) throw new Error('Not authenticated')
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('youtube_access_token, youtube_refresh_token, youtube_token_expires_at')
      .eq('id', user.id)
      .single()
    
    if (!profile?.youtube_access_token) {
      throw new Error('YouTube not connected')
    }
    
    // TODO: Gérer le refresh token si expiré
    return profile.youtube_access_token
  }

  async getChannelAnalytics() {
    const token = await this.getAccessToken()
    
    // Récupérer les statistiques de la chaîne
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&mine=true`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      }
    )
    
    return response.json()
  }

  async getVideoAnalytics(videoId?: string) {
    const token = await this.getAccessToken()
    
    let url = 'https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet'
    
    if (videoId) {
      url += `&id=${videoId}`
    } else {
      url += '&myRating=like&maxResults=50'
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })
    
    return response.json()
  }
}

export const youtubeClient = new YouTubeClient()