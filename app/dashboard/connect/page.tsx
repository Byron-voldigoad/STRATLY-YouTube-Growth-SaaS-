'use client'

import { createClient } from "@/lib/supabase/client";
import { Youtube, AlertCircle, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ConnectYouTubePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    // Vérifier les paramètres d'URL pour les messages
    const urlError = searchParams.get('error');
    const urlSuccess = searchParams.get('success');
    
    if (urlError) {
      setError(getErrorMessage(urlError));
    }
    
    if (urlSuccess) {
      setSuccess(getSuccessMessage(urlSuccess));
    }
    
    // Vérifier l'authentification
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUser(user);
    };
    
    checkAuth();
  }, [router, searchParams]);

  const handleConnectYouTube = () => {
  setLoading(true);
  setError('');
  setSuccess('');
  
  // Récupérer l'ID utilisateur AVANT de rediriger
  const supabase = createClient();
  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  };
  
  getCurrentUser().then(userId => {
    if (!userId) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }
    
    // Configuration OAuth avec l'ID utilisateur dans state
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = `${window.location.origin}/api/youtube/callback`;
    
    // Inclure l'ID utilisateur dans le paramètre state
    const state = JSON.stringify({ userId });
    
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl',
    ];
    
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes.join(' '))}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`; // ← ICI on passe l'ID
    
    console.log('Redirecting to OAuth with state:', state);
    window.location.href = authUrl;
  });
};

  const getErrorMessage = (errorCode: string) => {
    switch (errorCode) {
      case 'no_code':
        return 'No authorization code received from Google.';
      case 'token_exchange_failed':
        return 'Failed to exchange authorization code for tokens.';
      case 'no_channel_found':
        return 'No YouTube channel found for this account.';
      case 'database_error':
        return 'Failed to save connection details.';
      default:
        return `Connection error: ${errorCode}`;
    }
  };

  const getSuccessMessage = (successCode: string) => {
    switch (successCode) {
      case 'youtube_connected':
        return 'YouTube channel successfully connected!';
      default:
        return 'Success!';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-blue-600 rounded-lg"></div>
              <span className="text-xl font-bold text-gray-900">Stratly</span>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <div className="bg-white p-8 rounded-xl shadow-sm border">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <Youtube className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connect Your YouTube Channel
            </h1>
            <p className="text-gray-600">
              Connect your YouTube channel to import analytics and generate personalized growth plans.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-2 text-sm font-medium text-green-700 hover:text-green-600 underline"
                  >
                    Go to Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h3 className="font-semibold text-gray-900 mb-2">What we'll access:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <div className="h-5 w-5 text-green-500 mr-2">✓</div>
                <span>Your YouTube channel information</span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 text-green-500 mr-2">✓</div>
                <span>Video analytics and performance data</span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 text-green-500 mr-2">✓</div>
                <span>Subscriber counts and growth metrics</span>
              </li>
              <li className="flex items-start">
                <div className="h-5 w-5 text-green-500 mr-2">✓</div>
                <span>Watch time and engagement statistics</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 mt-4">
              We only request read-only access. We cannot modify your channel or upload videos.
            </p>
          </div>

          <button
            onClick={handleConnectYouTube}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700'
            } text-white transition`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Connecting...
              </>
            ) : (
              <>
                <Youtube className="w-5 h-5" />
                Connect YouTube Channel
              </>
            )}
          </button>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Skip for now
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}