import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenkitService, VideoData, ChannelStats, ChannelAnalysis } from '../../../core/services/genkit.service';
import { YouTubeService } from '../../../core/services/youtube.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButton } from '@spartan-ng/helm/button';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideSparkles, lucideBarChart2, lucideLightbulb, lucideLoader2, lucideCheckCircle2, lucideAlertCircle, lucideTrendingUp, lucideTrendingDown, lucideMinus, lucideRefreshCw } from '@ng-icons/lucide';
import { AuditScoreComponent } from './components/audit-score.component';

@Component({
  selector: 'app-ai-insights',
  standalone: true,
  imports: [CommonModule, HlmCardImports, HlmButton, NgIconComponent, AuditScoreComponent],
  providers: [
    provideIcons({
      lucideSparkles, lucideBarChart2, lucideLightbulb, lucideLoader2, lucideCheckCircle2, lucideAlertCircle, lucideTrendingUp, lucideTrendingDown, lucideMinus, lucideRefreshCw,
      lucSparkles: lucideSparkles, lucBarChart2: lucideBarChart2, lucLightbulb: lucideLightbulb,
      lucLoader2: lucideLoader2, lucCheckCircle2: lucideCheckCircle2, lucAlertCircle: lucideAlertCircle,
      lucTrendUp: lucideTrendingUp, lucTrendDown: lucideTrendingDown, lucMinus: lucideMinus
    })
  ],
  template: `
    <div class="space-y-8 animate-in fade-in duration-700 pb-12">
      <div class="flex flex-col gap-2">
        <h2 class="text-3xl font-bold tracking-tight text-slate-900 font-heading flex items-center gap-3">
          <ng-icon name="lucideSparkles" class="text-blue-600"></ng-icon>
          AI Insights
        </h2>
        <p class="text-muted-foreground">Utilisez l'intelligence artificielle pour booster la croissance de votre chaîne.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Sidebar / Navigation -->
        <div class="space-y-4">
          <button (click)="activeTab = 'analysis'"
                  class="w-full flex items-center gap-3 p-4 rounded-2xl transition-all border shadow-sm text-left group"
                  [class.bg-slate-900]="activeTab === 'analysis'"
                  [class.text-white]="activeTab === 'analysis'"
                  [class.border-slate-800]="activeTab === 'analysis'"
                  [class.bg-white]="activeTab !== 'analysis'"
                  [class.text-slate-600]="activeTab !== 'analysis'"
                  [class.hover:bg-slate-50]="activeTab !== 'analysis'">
            <div class="size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                 [class.bg-slate-800]="activeTab === 'analysis'"
                 [class.bg-slate-100]="activeTab !== 'analysis'">
              <ng-icon name="lucideBarChart2" class="size-5"></ng-icon>
            </div>
            <div>
              <p class="font-bold">Analyse Stratégique</p>
              <p class="text-xs opacity-70">Audit complet de vos KPIs</p>
            </div>
          </button>

          <button (click)="activeTab = 'ideas'"
                  class="w-full flex items-center gap-3 p-4 rounded-2xl transition-all border shadow-sm text-left group"
                  [class.bg-slate-900]="activeTab === 'ideas'"
                  [class.text-white]="activeTab === 'ideas'"
                  [class.border-slate-800]="activeTab === 'ideas'"
                  [class.bg-white]="activeTab !== 'ideas'"
                  [class.text-slate-600]="activeTab !== 'ideas'"
                  [class.hover:bg-slate-50]="activeTab !== 'ideas'">
            <div class="size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors"
                 [class.bg-slate-800]="activeTab === 'ideas'"
                 [class.bg-slate-100]="activeTab !== 'ideas'">
              <ng-icon name="lucideLightbulb" class="size-5"></ng-icon>
            </div>
            <div>
              <p class="font-bold">Idées de Contenu</p>
              <p class="text-xs opacity-70">Suggestions basées sur la tendance</p>
            </div>
          </button>
        </div>

        <!-- Main Content Area -->
        <div class="lg:col-span-2 space-y-6">
          <section hlmCard class="border-border/50 shadow-lg min-h-[500px] flex flex-col bg-white overflow-hidden">
            @if (activeTab === 'analysis') {
              <div hlmCardHeader class="border-b border-border/10 bg-slate-50/50">
                <h3 hlmCardTitle>Audit IA de la chaîne</h3>
                <p hlmCardDescription>Cette analyse se base sur vos dernières vidéos.</p>
              </div>
              
              <div hlmCardContent class="flex-1 p-8">
                @if (isAnalyzing) {
                  <div class="flex flex-col items-center justify-center h-full py-12">
                    <ng-icon name="lucideLoader2" class="size-12 text-blue-600 animate-spin mb-4"></ng-icon>
                    <p class="font-bold text-slate-900 text-lg animate-pulse">L'IA parcourt vos données...</p>
                    <p class="text-sm text-muted-foreground mt-2">Cela peut prendre jusqu'à 20 secondes.</p>
                  </div>
                } @else if (analysisResult) {
                  <div class="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    
                    <!-- Score & Explanation -->
                    <div class="space-y-4 border-b border-slate-100 pb-12">
                      <app-audit-score [score]="analysisResult.globalScore"></app-audit-score>
                      <p class="text-slate-600 font-semibold">{{ analysisResult.scoreExplanation }}</p>
                    </div>

                    <!-- KPIs Section -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div class="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Réactions audience</p>
                        <p class="text-sm font-bold text-slate-900 mb-3">{{ viewerRatio(analysisResult.metrics.engagement) }}</p>
                        <p class="text-xs text-slate-500 mb-2">taux d'engagement : {{ analysisResult.metrics.engagement.toFixed(1) }}%</p>
                        <p class="text-xs text-slate-600 italic">{{ analysisResult.metrics.engagementContext }}</p>
                      </div>
                      <div class="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Découverte</p>
                        <p class="text-2xl font-black text-slate-900 mb-2">{{ (analysisResult.metrics.views / 1000).toFixed(1) }}k vues</p>
                        <p class="text-xs text-slate-600">tendance : <span class="font-bold capitalize">{{ analysisResult.metrics.trend }}</span></p>
                      </div>
                    </div>

                    <!-- Patterns (toAvoid / toRepeat) -->
                    <div class="space-y-6">
                      <h4 class="text-lg font-black text-slate-900 flex items-center gap-2">
                        <div class="size-2 bg-blue-500 rounded-full"></div>
                        Patterns à Retenir
                      </h4>
                      
                      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="space-y-3" *ngIf="analysisResult.patterns.toAvoid.length > 0">
                          <p class="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                            <ng-icon name="lucideTrendingDown"></ng-icon> À éviter
                          </p>
                          @for (pattern of analysisResult.patterns.toAvoid; track pattern.videoTitle) {
                            <div class="p-4 rounded-2xl border border-rose-100 bg-rose-50/30">
                              <p class="text-sm font-bold text-slate-900 mb-2">{{ pattern.videoTitle }}</p>
                              <p class="text-xs text-rose-600">{{ pattern.reason }}</p>
                            </div>
                          }
                        </div>

                        <div class="space-y-3" *ngIf="analysisResult.patterns.toRepeat.length > 0">
                          <p class="text-xs font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                            <ng-icon name="lucideTrendingUp"></ng-icon> À multiplier
                          </p>
                          @for (pattern of analysisResult.patterns.toRepeat; track pattern.videoTitle) {
                            <div class="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/30">
                              <p class="text-sm font-bold text-slate-900 mb-2">{{ pattern.videoTitle }}</p>
                              <p class="text-xs text-emerald-600">{{ pattern.reason }}</p>
                            </div>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Recommendation Block -->
                    <div class="space-y-6 p-6 rounded-2xl bg-amber-50/50 border border-amber-100">
                      <h4 class="text-lg font-black text-slate-900 flex items-center gap-2">
                        <div class="size-2 bg-amber-500 rounded-full"></div>
                        Stratégie Recommandée
                      </h4>
                      
                      <div class="space-y-4">
                        <p class="text-base font-bold text-slate-900">
                          {{ analysisResult.recommendation.action }}
                        </p>
                        
                        <div class="bg-white p-4 rounded-xl border border-amber-200">
                          <span class="text-xs font-bold text-amber-600 uppercase tracking-wider">Pourquoi</span>
                          <p class="text-sm text-slate-700 mt-2">
                            {{ analysisResult.recommendation.proof }}
                          </p>
                        </div>
                        
                        <span class="text-xs text-slate-500 italic">
                          {{ analysisResult.recommendation.confidence }}
                        </span>
                        
                        <button (click)="showNextStep = !showNextStep"
                                class="mt-4 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm transition-colors">
                          {{ showNextStep ? 'Masquer' : 'Voir' }} la prochaine étape
                        </button>
                        
                        @if (showNextStep) {
                          <div class="p-4 rounded-xl bg-amber-100/30 border border-amber-200 animate-in fade-in slide-in-from-top-2 duration-300">
                            <p class="text-sm text-slate-700">
                              {{ analysisResult.recommendation.nextStep }}
                            </p>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="pt-12 text-center text-slate-400">
                       <button (click)="analysisResult = null" class="text-xs font-bold hover:text-blue-600 transition-colors">
                         Générer une nouvelle analyse
                       </button>
                    </div>
                  </div>
                } @else {
                  <div class="flex flex-col items-center justify-center h-full text-center py-12">
                    <div class="size-20 rounded-full bg-blue-50 flex items-center justify-center mb-6 shadow-inner">
                      <ng-icon name="lucideSparkles" class="size-10 text-blue-300"></ng-icon>
                    </div>
                    <h4 class="text-xl font-bold text-slate-900 mb-2">Prêt pour l'analyse ?</h4>
                    <p class="text-slate-500 max-w-sm mb-8">Obtenez un rapport personnalisé sur vos points forts et les opportunités de croissance.</p>
                    <button hlmBtn class="px-8 py-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-500/20"
                            (click)="runAnalysis()">
                      Lancer l'audit stratégique
                    </button>
                  </div>
                }
              </div>
            }

            @if (activeTab === 'ideas') {
              <div hlmCardHeader class="border-b border-border/10 bg-slate-50/50">
                <h3 hlmCardTitle>Suggestions de Vidéos</h3>
                <p hlmCardDescription>Basé sur vos vidéos les plus performantes.</p>
              </div>
              
              <div hlmCardContent class="flex-1 p-8">
                @if (isGenerating) {
                  <div class="flex flex-col items-center justify-center h-full py-12">
                    <ng-icon name="lucideLoader2" class="size-12 text-blue-600 animate-spin mb-4"></ng-icon>
                    <p class="font-bold text-slate-900 text-lg">Brainstorming en cours...</p>
                  </div>
                } @else if (ideas.length > 0) {
                  <div class="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    @for (idea of ideas; track idea; let i = $index) {
                      <div class="group flex items-start gap-4 p-5 rounded-2xl border border-border/30 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-default shadow-sm hover:shadow-md">
                        <div class="size-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 font-bold text-blue-600 text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          {{ i + 1 }}
                        </div>
                        <p class="text-slate-800 font-bold leading-relaxed pt-1">{{ idea }}</p>
                      </div>
                    }
                    <div class="mt-8 pt-6 border-t border-border/30 flex justify-center">
                      <button (click)="runGenerateIdeas()" 
                               class="text-blue-600 font-bold text-sm hover:underline flex items-center gap-2">
                         <ng-icon name="lucideRefreshCw"></ng-icon>
                        Générer d'autres idées
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="flex flex-col items-center justify-center h-full text-center py-12">
                    <div class="size-20 rounded-full bg-amber-50 flex items-center justify-center mb-6 shadow-inner">
                      <ng-icon name="lucideLightbulb" class="size-10 text-amber-300"></ng-icon>
                    </div>
                    <h4 class="text-xl font-bold text-slate-900 mb-2">Besoin d'inspiration ?</h4>
                    <p class="text-slate-500 max-w-sm mb-8">L'IA analyse ce qui marche sur votre chaîne pour suggérer vos prochains succès.</p>
                    <button hlmBtn class="px-8 py-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg shadow-xl shadow-amber-500/20"
                            (click)="runGenerateIdeas()">
                      Générer des idées
                    </button>
                  </div>
                }
              </div>
            }
          </section>
        </div>
      </div>
    </div>
  `
})
export class AiInsightsComponent implements OnInit {
  activeTab: 'analysis' | 'ideas' = 'analysis';
  isAnalyzing = false;
  isGenerating = false;
  showNextStep = false;

  analysisResult: ChannelAnalysis | null = null;
  ideas: string[] = [];

  constructor(
    private genkit: GenkitService,
    private youtube: YouTubeService,
    private supabase: SupabaseService
  ) { }

  ngOnInit() {
    this.loadStoredAnalyses();
  }

  viewerRatio(engagement: number): string {
    if (!engagement || engagement <= 0)
      return 'Pas assez de données';
    const ratio = Math.round(100 / engagement);
    return `1 viewer sur ${ratio} a réagi`;
  }

  async loadStoredAnalyses() {
    try {
      const profile = await this.supabase.getProfile();
      console.log('Loading profile for AI analyses:', profile?.id);
      if (!profile?.youtube_channel_id) {
        console.warn('No youtube_channel_id found for profile');
        return;
      }

      const { data: analyses, error } = await this.supabase.client
        .from('ai_analyses')
        .select('*')
        .eq('user_id', profile.id)
        .eq('channel_id', profile.youtube_channel_id);

      if (error) throw error;
      console.log('Stored analyses found:', analyses?.length || 0);

      if (analyses) {
        const channelAnalysis = analyses.find(a => a.analysis_type === 'channel');

        if (channelAnalysis) {
          console.log('Found channel analysis row:', channelAnalysis.id);
          try {
            const rawContent = channelAnalysis.analysis_text;
            const parsed = typeof rawContent === 'string'
              ? JSON.parse(rawContent)
              : rawContent;

            console.log('Parsed analysis content properties:', Object.keys(parsed || {}));

            if (
              parsed &&
              typeof parsed === 'object' &&
              typeof parsed.globalScore === 'number' &&
              parsed.recommendation?.action &&
              Array.isArray(parsed.patterns?.toAvoid) &&
              Array.isArray(parsed.patterns?.toRepeat)
            ) {
              this.analysisResult = parsed;
              console.log('Analysis result successfully loaded from Supabase. Score:', this.analysisResult?.globalScore);
            } else {
              console.warn('Invalid data format in Supabase, content:', rawContent);
              this.analysisResult = null;
            }
          } catch (e) {
            console.error('Error parsing stored channel analysis:', e);
            this.analysisResult = null;
          }
        }

        const ideasAnalysis = analyses.find(a => a.analysis_type === 'ideas');
        if (ideasAnalysis) {
          try {
            this.ideas = typeof ideasAnalysis.content === 'string'
              ? JSON.parse(ideasAnalysis.content)
              : ideasAnalysis.content;
          } catch (e) {
            console.error('Error parsing stored ideas:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error loading stored analyses:', err);
    }
  }

  async runAnalysis() {
    this.isAnalyzing = true;
    try {
      const profile = await this.supabase.getProfile();
      const stats = await this.youtube.getChannelAnalytics();
      const videos = await this.youtube.getVideoAnalytics();

      if (!profile || !profile.youtube_channel_id || !stats || stats.length === 0 || !videos || videos.length === 0) {
        alert("Pas assez de données pour l'analyse. Synchronisez votre chaîne d'abord.");
        return;
      }

      const latestStats = stats[stats.length - 1];
      const channelStats: ChannelStats = {
        subscriberCount: latestStats.subscribers,
        viewCount: latestStats.total_views,
        videoCount: latestStats.total_videos,
        channelTitle: profile.youtube_channel_title || 'Votre Chaîne'
      };

      const videoData: VideoData[] = videos.map(v => ({
        id: v.video_id,
        title: v.video_title,
        views: v.views,
        likes: v.likes || 0,
        comments: v.comments || 0,
        publishedAt: v.published_at
      }));

      console.log('--- DEBUG UI: DATA BEFORE ANALYSIS ---');
      console.log('Videos count:', videoData.length);
      console.log('Videos views:', videoData.map(v => v.views));
      console.log('Channel Stats:', channelStats);
      console.log('---------------------------------------');

      console.log('Calling Genkit analyzeChannel...');

      // Charger les niches sélectionnées par l'utilisateur
      let focusNiches: string[] = [];
      try {
        const { data: nicheData } = await this.supabase.client
          .from('user_niches')
          .select('selected_niches')
          .eq('user_id', profile.id)
          .eq('channel_id', profile.youtube_channel_id)
          .maybeSingle();

        if (nicheData?.selected_niches) {
          focusNiches = typeof nicheData.selected_niches === 'string'
            ? JSON.parse(nicheData.selected_niches)
            : nicheData.selected_niches;
          console.log('Focus niches loaded:', focusNiches);
        }
      } catch (e) {
        console.warn('Impossible de charger les niches, analyse sans filtre:', e);
      }

      const response = await this.genkit.analyzeChannel(
        profile.id,
        profile.youtube_channel_id,
        videoData,
        channelStats,
        focusNiches.length > 0 ? focusNiches : undefined
      );

      console.log('Genkit Response received:', response);
      if (response && response.result) {
        this.analysisResult = response.result;
        console.log('analysisResult set to:', this.analysisResult);
      } else {
        throw new Error("Réponse Genkit invalide");
      }
    } catch (err) {
      console.error('Analysis Error:', err);
      alert("Erreur lors de l'analyse IA. Est-ce que le serveur est lancé ?");
    } finally {
      this.isAnalyzing = false;
    }
  }

  async runGenerateIdeas() {
    this.isGenerating = true;
    try {
      const profile = await this.supabase.getProfile();
      const videos = await this.youtube.getVideoAnalytics();

      if (!profile || !profile.youtube_channel_id || !videos || videos.length === 0) {
        alert("Besoin de données vidéos pour générer des idées.");
        return;
      }

      const topVideos = videos
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)
        .map(v => ({ title: v.video_title, views: v.views }));

      const response = await this.genkit.generateIdeas(
        profile.id,
        profile.youtube_channel_id,
        profile.youtube_channel_title || "votre niche",
        topVideos
      );
      if (response && response.result) {
        this.ideas = response.result;
      }
    } catch (err) {
      console.error('Generation Error:', err);
      alert("Erreur lors de la génération d'idées.");
    } finally {
      this.isGenerating = false;
    }
  }
}
