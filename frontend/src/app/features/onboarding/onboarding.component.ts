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
import { NerraLoaderComponent } from '../../shared/components/nerra-loader/nerra-loader.component';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, NerraLoaderComponent],
  providers: [provideIcons({ lucideYoutube, lucideLoader2, lucideCheckCircle, lucideAlertCircle })],
  template: `
    <div class="min-h-screen bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden font-heading text-zinc-50 selection:bg-violet-500/30">
      <!-- Background elements -->
      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/[0.03] rounded-full blur-[120px] pointer-events-none"></div>
      <div class="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-500/[0.02] rounded-full blur-[100px] pointer-events-none"></div>

      <!-- Top Logo -->
      <div class="absolute top-8 left-0 right-0 flex justify-center">
        <h1 class="text-3xl font-black tracking-tight text-zinc-50 flex items-center gap-2">
          <img src="/assets/images/nerra_dark.png" alt="Nerra" class="h-8.5 w-auto object-contain">
        </h1>
      </div>

      <!-- Progress Bar -->
      <div class="w-full max-w-2xl mx-auto mb-12 px-6 relative z-10">
        <div class="flex items-center justify-between relative">
          <!-- Backing Line -->
          <div class="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-800 z-0"></div>
          <!-- Progress Line -->
          <div class="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-violet-500 z-0 transition-all duration-500"
               [style.width]="(step === 1 ? '0%' : step === 2 ? '50%' : '100%')"></div>

          <!-- Step 1 -->
          <div class="relative z-10 flex flex-col items-center gap-2" [ngClass]="{'opacity-50': step < 1}">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors duration-300"
                 [ngClass]="step >= 1 ? 'bg-zinc-900 border-violet-500 text-zinc-50' : 'bg-zinc-950 border-zinc-800 text-zinc-500'">
              1
            </div>
            <span class="text-[11px] font-bold uppercase tracking-wider" [ngClass]="step >= 1 ? 'text-zinc-300' : 'text-zinc-500'">Connexion</span>
          </div>

          <!-- Step 2 -->
          <div class="relative z-10 flex flex-col items-center gap-2" [ngClass]="{'opacity-50': step < 2}">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors duration-300"
                 [ngClass]="step >= 2 ? 'bg-zinc-900 border-violet-500 text-zinc-50' : 'bg-zinc-950 border-zinc-800 text-zinc-500'">
              2
            </div>
            <span class="text-[11px] font-bold uppercase tracking-wider" [ngClass]="step >= 2 ? 'text-zinc-300' : 'text-zinc-500'">Analyse</span>
          </div>

          <!-- Step 3 -->
          <div class="relative z-10 flex flex-col items-center gap-2" [ngClass]="{'opacity-50': step < 3}">
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors duration-300"
                 [ngClass]="step >= 3 ? 'bg-zinc-900 border-violet-500 text-zinc-50' : 'bg-zinc-950 border-zinc-800 text-zinc-500'">
              3
            </div>
            <span class="text-[11px] font-bold uppercase tracking-wider" [ngClass]="step >= 3 ? 'text-zinc-300' : 'text-zinc-500'">Décision</span>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="w-full max-w-xl mx-auto px-6 relative z-10">
        <div class="bg-zinc-900 rounded-3xl p-8 md:p-12 border border-zinc-800/80 shadow-2xl shadow-black/40 animate-in zoom-in-95 duration-500">
          
          <!-- STEP 1: Connect -->
          @if (step === 1) {
            <div class="text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div class="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 transform -rotate-6 shadow-inner">
                <ng-icon name="lucideYoutube" class="w-8 h-8 text-red-500"></ng-icon>
              </div>
              <div class="space-y-2">
                <h2 class="text-2xl font-black text-zinc-50 tracking-tight">Connecte ta chaîne YouTube</h2>
                <p class="text-zinc-400 font-medium text-sm leading-relaxed max-w-md mx-auto">
                  Nerra a besoin d'accéder à tes données pour te proposer des décisions basées sur ta réalité, pas sur des suppositions.
                </p>
              </div>
              
              <!-- Manual ID Option (if they already connected but the channel picker issue happened) -->
              @if (profile?.youtube_refresh_token && !profile?.youtube_channel_id) {
                <div class="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-left mt-6">
                  <p class="text-xs text-zinc-300 font-bold mb-1">Forcer une chaîne spécifique :</p>
                  <p class="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                    Google ne vous a pas laissé choisir votre chaîne ? Collez son ID ici (commence par "UC") :
                  </p>
                  <div class="flex gap-2">
                    <input 
                      type="text" 
                      [(ngModel)]="manualChannelId" 
                      placeholder="UCxxxxxxxxxxxxxxxxx" 
                      class="flex-1 text-xs px-3.5 h-[38px] bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-500 text-zinc-100 placeholder:text-zinc-600"
                      [disabled]="isGeneratingManual"
                    />
                    <button 
                      class="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-xs font-bold px-4 rounded-xl shrink-0 cursor-pointer disabled:opacity-50 transition-colors" 
                      (click)="forceChannelId()"
                      [disabled]="!manualChannelId || isGeneratingManual"
                    >
                      Forcer
                    </button>
                  </div>
                </div>
              }

              <button class="w-full py-4 mt-6 text-sm font-bold bg-[#FF0000] hover:bg-[#CC0000] text-white rounded-xl transition-all shadow-lg shadow-red-600/10 cursor-pointer"
                      (click)="connectYouTube()">
                Connecter ma chaîne
              </button>
            </div>
          }

          <!-- STEP 2: Analyze -->
          @if (step === 2) {
            <div class="text-center space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              @if (error) {
                <div class="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ng-icon name="lucideAlertCircle" class="w-8 h-8 text-rose-500"></ng-icon>
                </div>
                <div>
                  <h2 class="text-xl font-black text-zinc-50 mb-2">L'analyse a échoué</h2>
                  <p class="text-rose-400 text-sm font-medium">{{ error }}</p>
                </div>
                <button class="w-full py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-100 hover:bg-zinc-800/80 rounded-xl font-bold text-sm cursor-pointer transition-colors" (click)="startAnalysis()">Réessayer</button>
              } @else {
                <div class="py-6">
                  <nerra-loader variant="decision" [messages]="['Initialisation de l\\'analyse...', 'Téléchargement de l\\'historique YouTube...', 'Examen des patterns de performance...', 'Calcul des tensions stratégiques...', 'Génération de la première décision...']"></nerra-loader>
                </div>
              }
            </div>
          }

          <!-- STEP 3: First Decision -->
          @if (step === 3) {
            <div class="text-center space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div class="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <ng-icon name="lucideCheckCircle" class="w-8 h-8 text-emerald-400"></ng-icon>
              </div>
              <div class="space-y-2">
                <h2 class="text-2xl font-black text-zinc-50 tracking-tight">Premier protocole prêt</h2>
                <p class="text-zinc-400 font-medium text-sm leading-relaxed max-w-sm mx-auto">
                  L'audit initial est terminé. Nerra a conçu votre première recommandation décisionnelle.
                </p>
              </div>

              @if (decisionPreview) {
                <div class="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl text-left shadow-sm space-y-2">
                  <span class="text-[9px] font-bold text-violet-400 uppercase tracking-widest">{{ decisionPreview.experiment_type }}</span>
                  <p class="font-bold text-zinc-100 text-sm leading-snug">{{ decisionPreview.hypothesis }}</p>
                </div>
              }

              <button class="w-full py-4 mt-6 text-sm font-black bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all shadow-lg shadow-violet-600/10 flex items-center justify-center gap-2 cursor-pointer"
                      (click)="finish()">
                Voir ma décision complète
                <span>→</span>
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
