'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, RefreshCw } from 'lucide-react'

export default function YouTubeStatusPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [channelData, setChannelData] = useState<any>(null)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      
      // Vérifier l'authentification
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Récupérer le profil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profileData)

      // Si YouTube est connecté, récupérer les données
      if (profileData?.youtube_access_token) {
        try {
          // Récupérer les infos de la chaîne
          const response = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
            {
              headers: {
                'Authorization': `Bearer ${profileData.youtube_access_token}`,
              },
            }
          )
          
          const data = await response.json()
          if (data.items && data.items.length > 0) {
            setChannelData(data.items[0])
            
            // Mettre à jour le channel_id dans la base
            await supabase
              .from('profiles')
              .update({ youtube_channel_id: data.items[0].id })
              .eq('id', user.id)
          }
        } catch (error) {
          console.error('Error fetching YouTube data:', error)
        }
      }
      
      setLoading(false)
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-blue-600 hover:text-blue-800 mb-8 flex items-center"
        >
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">YouTube Connection Status</h1>
          
          <div className="space-y-6">
            {/* Status YouTube */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h3 className="font-semibold text-gray-900">YouTube Connection</h3>
                <p className="text-gray-600 text-sm">
                  {profile?.youtube_access_token ? 'Connected' : 'Not connected'}
                </p>
              </div>
              <div className={`p-2 rounded-full ${profile?.youtube_access_token ? 'bg-green-100' : 'bg-red-100'}`}>
                {profile?.youtube_access_token ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>
            </div>

            {/* Token Info */}
            {profile?.youtube_access_token && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Access Token</h3>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm break-all">
                  {profile.youtube_access_token.substring(0, 50)}...
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Expires: {new Date(profile.youtube_token_expires_at).toLocaleString()}
                </p>
              </div>
            )}

            {/* Channel Data */}
            {channelData && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-4">YouTube Channel Info</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    {channelData.snippet.thumbnails.default && (
                      <img
                        src={channelData.snippet.thumbnails.default.url}
                        alt="Channel"
                        className="w-12 h-12 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{channelData.snippet.title}</p>
                      <p className="text-sm text-gray-600">{channelData.snippet.customUrl}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subscribers:</span>
                      <span className="font-semibold">
                        {parseInt(channelData.statistics.subscriberCount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Views:</span>
                      <span className="font-semibold">
                        {parseInt(channelData.statistics.viewCount).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Videos:</span>
                      <span className="font-semibold">
                        {parseInt(channelData.statistics.videoCount).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
              
              {!profile?.youtube_access_token && (
                <button
                  onClick={() => router.push('/dashboard/connect')}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-green-700"
                >
                  Connect YouTube
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}