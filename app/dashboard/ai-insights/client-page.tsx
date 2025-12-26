// app/dashboard/ai-insights/client-page.tsx

'use client';

import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Brain, Sparkles, Lightbulb, TrendingUp, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface VideoData {
  video_title: string;
  views: number;
  likes: number;
  comments: number;
  published_at: string;
}

interface ChannelStats {
  title: string;
  subscribers: number;
  totalViews: number;
}

interface AIClientPageProps {
  initialVideos: VideoData[];
  initialChannelStats: ChannelStats | null;
  isAiEnabled: boolean;
}

export function AIInsightsClientPage({ initialVideos, initialChannelStats, isAiEnabled }: AIClientPageProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [videoIdeas, setVideoIdeas] = useState<string[]>([]);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  
  const videos = useMemo(() => initialVideos, [initialVideos]);
  const channelStats = useMemo(() => initialChannelStats, [initialChannelStats]);

  const handleAnalyze = async () => {
    if (!videos.length || !channelStats) {
      alert('Données de la chaîne insuffisantes pour l\'analyse.');
      return;
    }
    
    setLoadingAnalysis(true);
    setAnalysis('');
    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos, channelStats, analysisType: 'channel' }),
      });

      if (!response.ok) {
        throw new Error(`Erreur de l\'API : ${response.statusText}`);
      }

      const result = await response.json();
      setAnalysis(result.analysis);
    } catch (error) {
      console.error('Erreur lors de l\'analyse IA:', error);
      setAnalysis('Une erreur est survenue. Impossible de générer l\'analyse.');
    } finally {
      setLoadingAnalysis(false);
    }
  };
  
  const handleGenerateIdeas = async () => {
    if (!videos.length) {
      alert('Données des vidéos insuffisantes pour générer des idées.');
      return;
    }
    
    setLoadingIdeas(true);
    setVideoIdeas([]);
    try {
        const response = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videos, channelStats, analysisType: 'ideas' }),
          });
    
          if (!response.ok) {
            throw new Error(`Erreur de l\'API : ${response.statusText}`);
          }
    
          const result = await response.json();
          setVideoIdeas(result.ideas);
    } catch (error) {
        console.error('Erreur lors de la génération d\'idées:', error);
    } finally {
        setLoadingIdeas(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Brain className="w-8 h-8 text-purple-500" />
                    🤖 Assistant IA YouTube
                </h1>
                <p className="text-gray-400">
                    Analyse intelligente et recommandations personnalisées par OpenAI
                </p>
            </div>
            {isAiEnabled ? (
                <div className="flex items-center gap-2 bg-green-900/50 text-green-300 border border-green-700/50 px-3 py-2 rounded-lg">
                    <CheckCircle className="w-5 h-5"/>
                    <span className="font-semibold">IA Réelle Activée</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-5 h-5"/>
                    <span className="font-semibold">Mode Démo</span>
                </div>
            )}
        </div>
        
        {videos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800/50 p-4 rounded-lg"><p className="text-gray-400 text-sm">Vidéos analysées</p><p className="text-2xl font-bold">{videos.length}</p></div>
            <div className="bg-gray-800/50 p-4 rounded-lg"><p className="text-gray-400 text-sm">Vues totales</p><p className="text-2xl font-bold">{videos.reduce((sum, v) => sum + v.views, 0).toLocaleString()}</p></div>
            <div className="bg-gray-800/50 p-4 rounded-lg"><p className="text-gray-400 text-sm">Meilleure vidéo</p><p className="text-lg font-bold truncate">{videos[0]?.video_title.substring(0, 30)}...</p></div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-xl p-6"><div className="flex items-center gap-3 mb-4"><Sparkles className="w-6 h-6 text-yellow-400" /><h2 className="text-xl font-bold">Analyse complète de chaîne</h2></div><p className="text-gray-300 mb-4">Obtenez une analyse détaillée de vos performances avec recommandations personnalisées.</p><Button onClick={handleAnalyze} disabled={loadingAnalysis || videos.length === 0} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50">{loadingAnalysis ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analyse en cours...</> : videos.length === 0 ? <><AlertCircle className="w-4 h-4 mr-2" />Importez d\'abord vos données</> : <><Brain className="w-4 h-4 mr-2" />Lancer l\'analyse IA</>}</Button></div>
          <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6"><div className="flex items-center gap-3 mb-4"><Lightbulb className="w-6 h-6 text-green-400" /><h2 className="text-xl font-bold">Idées de contenu</h2></div><p className="text-gray-300 mb-4">Générez des idées de vidéos basées sur vos meilleures performances.</p><Button onClick={handleGenerateIdeas} disabled={loadingIdeas || videos.length === 0} className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50">{loadingIdeas ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Génération en cours...</> : videos.length === 0 ? <><AlertCircle className="w-4 h-4 mr-2" />Importez d\'abord vos données</> : <><TrendingUp className="w-4 h-4 mr-2" />Générer des idées</>}</Button></div>
        </div>
        
        <div className="space-y-8">
          {analysis && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 prose prose-invert max-w-none">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Sparkles className="w-6 h-6 text-yellow-400" />Analyse IA de votre chaîne</h2>
              <ReactMarkdown>{analysis}</ReactMarkdown>
            </div>
          )}
          
          {videoIdeas.length > 0 && (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2"><Lightbulb className="w-6 h-6 text-green-400" />Idées de vidéos générées par IA ({videoIdeas.length})</h2>
              <div className="space-y-6">
                {videoIdeas.map((idea, index) => (
                  <div key={index} className="bg-gray-900/70 p-4 rounded-lg hover:bg-gray-900/90 transition-colors prose prose-invert max-w-none">
                     <ReactMarkdown>{idea}</ReactMarkdown>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {!isAiEnabled && (
            <div className="mt-8 p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 rounded-lg border border-yellow-700/30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-600/20 to-orange-600/20 flex items-center justify-center"><span className="text-2xl">💰</span></div>
                    <div>
                        <h3 className="font-bold text-lg">Mode Démo Actif</h3>
                        <p className="text-gray-300">
                        Pour activer l'IA réelle et obtenir des analyses personnalisées, veuillez configurer votre clé API OpenAI dans un fichier 
                        <code className="bg-gray-700 text-yellow-300 px-1 py-0.5 rounded text-sm">.env.local</code> à la racine de votre projet.
                        <br />
                        Exemple: <code className="bg-gray-700 text-yellow-300 px-1 py-0.5 rounded text-sm">OPENAI_API_KEY=sk-...</code>
                        </p>
                    </div>
                </div>
            </div>
        )}

        {videos.length === 0 && (
          <div className="mt-8 text-center py-12 bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl"><AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" /><h3 className="text-xl font-semibold mb-2">Aucune donnée à analyser</h3><p className="text-gray-400 mb-6">Importez d\'abord vos données YouTube depuis le dashboard principal</p><Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors">Aller au dashboard</Link></div>
        )}
      </div>
    </div>
  );
}
