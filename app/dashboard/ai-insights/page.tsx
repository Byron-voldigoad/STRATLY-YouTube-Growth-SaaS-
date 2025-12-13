// app/dashboard/ai-insights/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { youtubeAIAnalyzer } from '@/lib/ai/gemini-service';
import { Brain, Sparkles, Lightbulb, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface VideoData {
  video_title: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string;
}

export default function AIInsightsPage() {
  const [analysis, setAnalysis] = useState<string>('');
  const [videoIdeas, setVideoIdeas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [videos, setVideos] = useState<VideoData[]>([]);
  const [channelStats, setChannelStats] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  
  const supabase = createClient();
  
  // Récupère les données au chargement
  useEffect(() => {
    fetchData();
  }, []);
  
  async function fetchData() {
    try {
      // Vérifie l'utilisateur
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUser(user);
      
      // Récupère les vidéos
      const { data: videosData } = await supabase
        .from('video_analytics')
        .select('video_title, views, likes, comments, published_at')
        .eq('user_id', user.id)
        .order('views', { ascending: false })
        .limit(10);
      
      if (videosData) {
        setVideos(videosData);
      }
      
      // Récupère les stats de la chaîne
      const { data: profile } = await supabase
        .from('profiles')
        .select('youtube_channel_title, youtube_channel_thumbnail')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        const totalViews = videosData?.reduce((sum: number, v: VideoData) => sum + v.views, 0) || 0;
        setChannelStats({
          title: profile.youtube_channel_title || 'Votre chaîne',
          subscribers: 0, // À récupérer via API YouTube si disponible
          totalViews
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }
  
  const handleAnalyze = async () => {
    if (!videos.length || !channelStats) {
      alert('Veuillez d\'abord importer vos données YouTube');
      return;
    }
    
    setLoading(true);
    const aiAnalysis = await youtubeAIAnalyzer.analyzeChannelPerformance(videos, channelStats);
    setAnalysis(aiAnalysis);
    setLoading(false);
  };
  
  const handleGenerateIdeas = async () => {
    if (!videos.length) {
      alert('Veuillez d\'abord importer vos données YouTube');
      return;
    }
    
    setLoadingIdeas(true);
    const ideas = await youtubeAIAnalyzer.generateVideoIdeas(videos);
    setVideoIdeas(ideas);
    setLoadingIdeas(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-500" />
            🤖 Assistant IA YouTube
          </h1>
          <p className="text-gray-400">
            Analyse intelligente et recommandations personnalisées par Gemini AI
          </p>
        </div>
        
        {/* Stats rapides */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Vidéo analysées</p>
              <p className="text-2xl font-bold">{videos.length}</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Vues totales</p>
              <p className="text-2xl font-bold">
                {videos.reduce((sum, v) => sum + v.views, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Meilleure vidéo</p>
              <p className="text-lg font-bold truncate">
                {videos[0]?.video_title.substring(0, 30)}...
              </p>
            </div>
          </div>
        )}
        
        {/* Actions rapides */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <h2 className="text-xl font-bold">Analyse complète de chaîne</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Obtenez une analyse détaillée de vos performances avec recommandations personnalisées.
            </p>
            <Button 
              onClick={handleAnalyze} 
              disabled={loading || videos.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : videos.length === 0 ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Importez d'abord vos données
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Lancer l'analyse IA
                </>
              )}
            </Button>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold">Idées de contenu</h2>
            </div>
            <p className="text-gray-300 mb-4">
              Générez des idées de vidéos basées sur vos meilleures performances.
            </p>
            <Button 
              onClick={handleGenerateIdeas} 
              disabled={loadingIdeas || videos.length === 0}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
            >
              {loadingIdeas ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Génération en cours...
                </>
              ) : videos.length === 0 ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Importez d'abord vos données
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Générer des idées
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Résultats */}
        <div className="space-y-8">
          {analysis && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-400" />
                Analyse IA de votre chaîne
              </h2>
              <div 
                className="prose prose-invert max-w-none whitespace-pre-line"
                dangerouslySetInnerHTML={{ 
                  __html: analysis
                    .replace(/\n/g, '<br/>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-yellow-300">$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')
                }}
              />
            </div>
          )}
          
          {videoIdeas.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-green-400" />
                Idées de vidéos générées par IA ({videoIdeas.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videoIdeas.map((idea, index) => (
                  <div key={index} className="bg-gray-900/70 p-4 rounded-lg hover:bg-gray-900/90 transition-colors">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600/30 to-purple-600/30 flex items-center justify-center">
                        <span className="font-bold text-white">{index + 1}</span>
                      </div>
                      <h3 className="font-semibold text-lg">Idée #{index + 1}</h3>
                    </div>
                    <div className="space-y-3">
                      {idea.split('\n').map((line, lineIndex) => {
                        if (line.includes('**Titre** :')) {
                          return (
                            <div key={lineIndex} className="bg-blue-900/30 p-3 rounded-lg">
                              <span className="text-blue-300 font-semibold">🎬 Titre :</span>
                              <p className="text-white mt-1">{line.replace('**Titre** :', '').trim()}</p>
                            </div>
                          );
                        } else if (line.includes('**Concept** :')) {
                          return (
                            <div key={lineIndex} className="bg-purple-900/30 p-3 rounded-lg">
                              <span className="text-purple-300 font-semibold">💡 Concept :</span>
                              <p className="text-white mt-1">{line.replace('**Concept** :', '').trim()}</p>
                            </div>
                          );
                        } else if (line.includes('**Tags** :')) {
                          return (
                            <div key={lineIndex} className="bg-green-900/30 p-3 rounded-lg">
                              <span className="text-green-300 font-semibold">🏷️ Tags :</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {line.replace('**Tags** :', '').trim().split(', ').map((tag, tagIndex) => (
                                  <span key={tagIndex} className="bg-gray-800 px-2 py-1 rounded text-sm">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Info gratuite */}
        <div className="mt-8 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-700/30">
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-600/20 to-orange-600/20 flex items-center justify-center">
      <span className="text-2xl">💰</span>
    </div>
    <div>
      <h3 className="font-bold text-lg">✨ Service totalement GRATUIT</h3>
      <p className="text-gray-300">
        Cette analyse utilise Gemini AI de Google, entièrement gratuit pour nos utilisateurs.
        <span className="text-yellow-400 block mt-1">
          ⚠️ Mode démo activé. Configurez GEMINI_API_KEY dans .env.local pour l'IA réelle.
        </span>
      </p>
    </div>
  </div>
</div>
        
        {/* Message si pas de données */}
        {videos.length === 0 && (
          <div className="mt-8 text-center py-12 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl">
            <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Aucune donnée à analyser</h3>
            <p className="text-gray-400 mb-6">
              Importez d'abord vos données YouTube depuis le dashboard principal
            </p>
            <a 
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              Aller au dashboard
            </a>
          </div>
        )}
      </div>
    </div>
  );
}