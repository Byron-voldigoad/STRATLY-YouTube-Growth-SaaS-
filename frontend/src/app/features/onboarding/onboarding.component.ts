import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { YouTubeService } from '../../core/services/youtube.service';
import { GenkitService } from '../../core/services/genkit.service';
import { DecisionService } from '../../core/services/decision.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideYoutube, lucideLoader2, lucideCheckCircle, lucideAlertCircle } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, HlmButton],
  providers: [provideIcons({ lucideYoutube, lucideLoader2, lucideCheckCircle, lucideAlertCircle })],
  template: `
    <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center relative overflow-hidden font-heading">
      <!-- Background elements -->
      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <!-- Top Logo -->
      <div class="absolute top-8 left-0 right-0 flex justify-center">
        <h1 class="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
          <img src="assets/images/nerra_ligth.png" alt="Nerra" class="h-10 w-auto object-contain drop-shadow-md">
        </h1>
      </div>

      <!-- Progress Bar -->
      <div class="w-full max-w-2xl mx-auto mb-12 px-6 relative z-10">
        <div class="flex items-center justify-between relative">
          <!-- Backing Line -->
          <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0"></div>
          <!-- Progress Line -->
          <div class="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 z-0 transition-all duration-500"
               [style.width]="(step === 1 ? '0%' : step === 2 ? '50%' : '100%')"></div>

          <!-- Step 1 -->
          <div class="relative z-10 flex flex-col items-center gap-2" [ngClass]="{'opacity-50': step < 1}">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors"
                 [ngClass]="step >= 1 ? 'bg-indigo-600 border-indigo-100 text-white' : 'bg-white border-slate-200 text-slate-400'">
              1
            </div>
            <span class="text-xs font-bold" [ngClass]="step >= 1 ? 'text-indigo-900' : 'text-slate-400'">Connexion</span>
          </div>

          <!-- Step 2 -->
          <div class="relative z-10 flex flex-col items-center gap-2" [ngClass]="{'opacity-50': step < 2}">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors"
                 [ngClass]="step >= 2 ? 'bg-indigo-600 border-indigo-100 text-white' : 'bg-white border-slate-200 text-slate-400'">
              2
            </div>
            <span class="text-xs font-bold" [ngClass]="step >= 2 ? 'text-indigo-900' : 'text-slate-400'">Analyse</span>
          </div>

          <!-- Step 3 -->
          <div class="relative z-10 flex flex-col items-center gap-2" [ngClass]="{'opacity-50': step < 3}">
            <div class="w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 transition-colors"
                 [ngClass]="step >= 3 ? 'bg-indigo-600 border-indigo-100 text-white' : 'bg-white border-slate-200 text-slate-400'">
              3
            </div>
            <span class="text-xs font-bold" [ngClass]="step >= 3 ? 'text-indigo-900' : 'text-slate-400'">Décision</span>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="w-full max-w-xl mx-auto px-6 relative z-10">
        <div class="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 animate-in zoom-in-95 duration-500">
          
          <!-- STEP 1: Connect -->
          @if (step === 1) {
            <div class="text-center space-y-6 animate-in fade-in slide-in-from-right-4">
              <div class="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6 shadow-inner">
                <ng-icon name="lucideYoutube" class="w-10 h-10 text-red-600"></ng-icon>
              </div>
              <div>
                <h2 class="text-2xl font-black text-slate-900 mb-2">Connecte ta chaîne YouTube</h2>
                <p class="text-slate-500 font-medium leading-relaxed">
                  Nerra a besoin d'accéder à tes données pour te donner des décisions basées sur ta réalité, pas sur des suppositions.
                </p>
              </div>
              <!-- Manual ID Option (if they already connected but the channel picker issue happened) -->
              @if (profile?.youtube_refresh_token && !profile?.youtube_channel_id) {
                <div class="p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm mt-4 text-left">
                  <p class="text-xs text-amber-900 font-bold mb-2">Forcer une chaîne spécifique :</p>
                  <p class="text-[11px] text-amber-700/80 mb-3 leading-snug">
                    Google ne vous a pas laissé choisir votre chaîne ? Collez son ID ici (UC...) :
                  </p>
                  <div class="flex gap-2">
                    <input 
                      type="text" 
                      [(ngModel)]="manualChannelId" 
                      placeholder="UCxxxxxxxxxxxxxxxxx" 
                      class="flex-1 text-xs px-3 py-2 border border-amber-200 rounded-lg focus:outline-none bg-white"
                      [disabled]="isGeneratingManual"
                    />
                    <button 
                      hlmBtn 
                      size="sm" 
                      class="bg-amber-600 hover:bg-amber-700 text-white shrink-0" 
                      (click)="forceChannelId()"
                      [disabled]="!manualChannelId || isGeneratingManual"
                    >
                      Forcer
                    </button>
                  </div>
                </div>
              }

              <button hlmBtn class="w-full py-6 mt-4 text-base font-bold bg-[#FF0000] hover:bg-[#CC0000] text-white shadow-lg shadow-red-500/20"
                      (click)="connectYouTube()">
                Connecter ma chaîne
              </button>
            </div>
          }

          <!-- STEP 2: Analyze -->
          @if (step === 2) {
            <div class="text-center space-y-8 animate-in fade-in slide-in-from-right-4">
              @if (error) {
                <div class="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ng-icon name="lucideAlertCircle" class="w-10 h-10 text-rose-600"></ng-icon>
                </div>
                <div>
                  <h2 class="text-xl font-black text-slate-900 mb-2">L'analyse a échoué</h2>
                  <p class="text-rose-600 text-sm font-medium">{{ error }}</p>
                </div>
                <button hlmBtn class="w-full bg-slate-900 text-white hover:bg-slate-800" (click)="startAnalysis()">Réessayer</button>
              } @else {
                <div class="mb-10 w-full max-w-sm mx-auto">
                  <div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                    <div class="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-1/2 rounded-full animate-[shimmer_1.5s_infinite_linear] bg-[length:200%_100%] shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                  </div>
                </div>
                <div>
                  <h2 class="text-2xl font-black text-slate-900 mb-2">Nerra analyse ta chaîne...</h2>
                  <p class="text-slate-500 font-medium leading-relaxed">
                    On scanne tes patterns de succès et d'échec de tes dernières vidéos.
                  </p>
                </div>
              }
            </div>
          }

          <!-- STEP 3: First Decision -->
          @if (step === 3) {
            <div class="text-center space-y-6 animate-in fade-in slide-in-from-right-4">
              <div class="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ng-icon name="lucideCheckCircle" class="w-10 h-10 text-emerald-600"></ng-icon>
              </div>
              <div>
                <h2 class="text-2xl font-black text-slate-900 mb-2">Ton premier protocole est prêt.</h2>
                <p class="text-slate-500 font-medium mb-6">
                  L'audit est terminé. Nerra a généré sa première recommandation stricte pour ta croissance.
                </p>
              </div>

              @if (decisionPreview) {
                <div class="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left shadow-sm">
                  <span class="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">{{ decisionPreview.experiment_type }}</span>
                  <p class="font-bold text-slate-900 mt-2 text-sm leading-snug">{{ decisionPreview.hypothesis }}</p>
                </div>
              }

              <button hlmBtn class="w-full py-6 mt-4 text-base font-black bg-slate-900 hover:bg-indigo-600 text-white shadow-lg shadow-slate-900/20 transition-all"
                      (click)="finish()">
                Voir ma décision complète
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class OnboardingComponent implements OnInit, OnDestroy {
  step = 1;
  error = '';
  pollingInterval: any;
  decisionPreview: any;
  profile: any = null;
  manualChannelId = '';
  isGeneratingManual = false;

  constructor(
    private supabase: SupabaseService,
    private youtubeService: YouTubeService,
    private genkit: GenkitService,
    private decisionService: DecisionService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.checkState();
    
    // Si on est à l'étape 1, poll pour détecter le retour de l'OAuth YouTube
    this.startPolling();
  }

  ngOnDestroy() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  }

  startPolling() {
    this.pollingInterval = setInterval(async () => {
      if (this.step === 1) {
        this.profile = await this.supabase.getProfile();
        if (this.profile?.youtube_channel_id) {
          this.step = 2;
          this.startAnalysis();
        }
      }
    }, 5000);
  }

  async checkState() {
    this.profile = await this.supabase.getProfile();
    if (!this.profile) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.profile.youtube_channel_id) {
      this.step = 1;
      return;
    }

    // Le compte a déjà une chaîne YouTube connectée.
    // On redirige vers /dashboard/decision, et le guard s'occupera
    // de l'envoyer vers /dashboard/ai-insights si l'audit manque.
    this.router.navigate(['/dashboard/decision']);
  }

  async connectYouTube() {
    try {
      const url = await this.youtubeService.getOAuthUrl();
      // On redirige vers l'OAuth normal, qui rouvrira le Dashboard.
      // Le Dashboard verra qu'il n'y a pas d'audit/décision et relancera potentiellement ici via un guard global,
      // MAIS pour être sûr on peut aussi juste le laisser rediriger, puis notre `CallbackComponent` nous renverra sur le Dashboard,
      // et notre logique globale nous jettera sur /onboarding.
      window.location.href = url;
    } catch (err) {
      console.error(err);
      this.error = "Erreur de connexion à YouTube";
    }
  }

  async forceChannelId() {
    if (!this.manualChannelId || !this.manualChannelId.trim().startsWith('UC')) {
      alert('Veuillez entrer un ID de chaîne valide (qui commence par "UC").');
      return;
    }
    
    this.isGeneratingManual = true;
    try {
      await this.youtubeService.importData(this.manualChannelId.trim());
      this.profile = await this.supabase.getProfile(); // Re-fetch
      if (this.profile?.youtube_channel_id) {
        this.step = 2;
        this.startAnalysis();
      }
    } catch (err) {
      console.error('Error forcing channel data import:', err);
      alert("Erreur lors du forçage de l'ID.");
    } finally {
      this.isGeneratingManual = false;
    }
  }

  async startAnalysis() {
    this.error = '';
    try {
      if (!this.profile || !this.profile.youtube_channel_id) throw new Error("Chaine introuvable");

      // 0. IMPORTANT : Forcer la synchronisation avec YouTube pour peupler la DB avant l'audit
      try {
          await this.youtubeService.importData();
      } catch(err) {
          console.warn("Importation optionnelle echouée, poursuite avec donnees existantes", err);
      }

      // 1. Fetch stats
      const stats = await this.youtubeService.getChannelAnalytics();
      const videos = await this.youtubeService.getVideoAnalytics();
      
      let analysisResult = null;
      if (stats && videos && stats.length > 0 && videos.length > 0) {
          const latestStats = stats[stats.length - 1];
          const channelStats = {
            subscriberCount: latestStats.subscribers,
            viewCount: latestStats.total_views,
            videoCount: latestStats.total_videos,
            channelTitle: this.profile.youtube_channel_title || 'Votre Chaîne',
          };

          const videoData = videos.map((v: any) => ({
            id: v.video_id,
            title: v.video_title,
            views: v.views || 0,
            likes: v.likes || 0,
            comments: v.comments || 0,
            publishedAt: v.published_at || '',
            thumbnailUrl: v.thumbnail_url || ''
          }));

          // 2. Analyze Channel (Audit)
          const response = await this.genkit.analyzeChannel(
            this.profile.id,
            this.profile.youtube_channel_id,
            videoData,
            channelStats
          );
          
          if (response && response.result) {
            analysisResult = {
                channelStatus: response.result.channelStatus,
                statusExplanation: response.result.statusExplanation,
                engagement: response.result.metrics.engagement,
                trend: response.result.metrics.trend,
                patternsToRepeat: response.result.patterns.toRepeat,
                patternsToAvoid: response.result.patterns.toAvoid,
                recommendedAction: response.result.recommendation.action,
                recommendedProof: response.result.recommendation.proof,
                recommendedNextStep: response.result.recommendation.nextStep,
            };
          }
      }

      // 3. Generate Next Decision
      const decision = await this.decisionService.getNextDecision(
          this.profile.id,
          this.profile.youtube_channel_id,
          analysisResult as any
      );

      this.decisionPreview = decision;
      this.step = 3;

    } catch (e: any) {
      console.error('Onboarding Analysis Error:', e);
      this.error = e.message || "Impossible d'analyser la chaîne ou de générer la décision.";
      this.step = 2; // Stay on step 2 with error
    }
  }

  finish() {
    this.router.navigate(['/dashboard/decision']);
  }
}
