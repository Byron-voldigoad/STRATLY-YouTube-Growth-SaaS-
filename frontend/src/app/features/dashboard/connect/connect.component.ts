import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YouTubeService } from '../../../core/services/youtube.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { 
  lucideYoutube, 
  lucideCheckCircle2, 
  lucideAlertCircle, 
  lucideExternalLink, 
  lucideInfo, 
  lucideRotateCcw, 
  lucideAlertTriangle, 
  lucideShieldAlert,
  lucideHelpCircle,
  lucideMousePointerClick,
  lucideChevronRight
} from '@ng-icons/lucide';
import { NerraLoaderComponent } from '../../../shared/components/nerra-loader/nerra-loader.component';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, NerraLoaderComponent],
  providers: [
    provideIcons({ 
      lucideYoutube, 
      lucideCheckCircle2, 
      lucideAlertCircle, 
      lucideExternalLink, 
      lucideInfo, 
      lucideRotateCcw, 
      lucideAlertTriangle, 
      lucideShieldAlert,
      lucideHelpCircle,
      lucideMousePointerClick,
      lucideChevronRight
    })
  ],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500 pb-12">
      <div class="flex flex-col gap-2">
        <h2 class="text-3xl font-bold tracking-tight text-zinc-50 font-heading">Connexion YouTube</h2>
        <p class="text-zinc-400">Gérez la connexion entre Nerra et votre chaîne YouTube.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Status Card -->
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col justify-between">
          <div>
            <div class="mb-6">
              <h3 class="text-lg font-bold text-zinc-50 tracking-tight">État de la connexion</h3>
              <p class="text-xs text-zinc-500 font-medium mt-0.5">Votre statut actuel sur la plateforme</p>
            </div>
            
            <div class="py-2">
              @if (isLoading) {
                <div class="py-8 flex items-center justify-center">
                  <nerra-loader variant="section" message="Vérification du profil..."></nerra-loader>
                </div>
              } @else {
                <div class="flex flex-col gap-6">
                  <!-- Current Profile Info -->
                  <div class="flex items-center gap-4">
                    <div class="size-16 rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-850">
                      @if (profile?.youtube_channel_thumbnail) {
                        <img [src]="profile.youtube_channel_thumbnail" class="w-full h-full object-cover">
                      } @else {
                        <ng-icon name="lucideYoutube" class="size-8 text-rose-500"></ng-icon>
                      }
                    </div>
                    <div>
                      <h4 class="font-bold text-lg text-zinc-100 leading-snug">
                        {{ profile?.youtube_channel_title || 'Non connecté' }}
                      </h4>
                      <div class="flex items-center gap-1.5 mt-1.5">
                        @if (isConnected) {
                          <span class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <ng-icon name="lucideCheckCircle2" class="size-3"></ng-icon>
                            Connecté
                          </span>
                        } @else {
                          <span class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                            <ng-icon name="lucideAlertCircle" class="size-3"></ng-icon>
                            Déconnecté
                          </span>
                        }
                      </div>
                    </div>
                  </div>

                  @if (isConnected) {
                    <div class="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-4">
                      <p class="text-xs text-zinc-400 leading-relaxed font-medium">
                        Votre chaîne est correctement liée. Nerra importe automatiquement vos statistiques pour alimenter vos analyses.
                      </p>
                      <button class="w-full py-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer" (click)="connect()">
                        <ng-icon name="lucideRotateCcw" class="size-3.5"></ng-icon>
                        Changer de compte ou de chaîne
                      </button>
                    </div>
                  } @else {
                    <div class="space-y-4">
                      <p class="text-xs text-zinc-450 leading-relaxed font-medium">
                        Connectez votre compte Google pour autoriser Nerra à accéder à vos statistiques de performances de vidéos.
                      </p>
                      <button class="w-full py-4 text-sm font-bold bg-[#FF0000] hover:bg-[#CC0000] text-white rounded-xl shadow-lg shadow-red-650/10 flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                              (click)="connect()">
                        <ng-icon name="lucideYoutube" class="size-4.5"></ng-icon>
                        Se connecter avec YouTube
                      </button>
                    </div>
                  }

                  <!-- Troubleshooting Zone -->
                  <div class="mt-4 pt-6 border-t border-zinc-800 space-y-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2 text-zinc-450">
                        <ng-icon name="lucideHelpCircle" class="size-4"></ng-icon>
                        <h5 class="text-[10px] font-bold uppercase tracking-wider">Problème de compte ?</h5>
                      </div>
                      <span class="text-[9px] px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold rounded uppercase tracking-wider animate-pulse">Solution critique</span>
                    </div>
                    
                    <div class="p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10 space-y-4">
                      <div class="flex gap-2">
                        <ng-icon name="lucideAlertTriangle" class="size-4.5 text-amber-500 shrink-0 mt-0.5"></ng-icon>
                        <p class="text-[13px] font-bold text-zinc-100 leading-tight">Google ne vous demande pas de choisir votre chaîne ?</p>
                      </div>
                      
                      <div class="space-y-4">
                        <!-- Manual ID Override -->
                        <div class="p-4 bg-zinc-950 rounded-xl border border-zinc-800/80 shadow-sm">
                          <p class="text-xs text-zinc-300 font-bold mb-2">Forcer une chaîne spécifique :</p>
                          <p class="text-[11px] text-zinc-500 mb-3 leading-relaxed">
                            Si vos sous-chaînes n'apparaissent pas, connectez-vous avec votre profil principal ci-dessus, puis collez l'ID de votre chaîne ici (UC...) :
                          </p>
                          <div class="flex gap-2">
                            <input 
                              type="text" 
                              [(ngModel)]="manualChannelId" 
                              placeholder="UCxxxxxxxxxxxxxxxxx" 
                              class="flex-1 text-xs px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 text-zinc-100 placeholder:text-zinc-650"
                              [disabled]="isGeneratingManual"
                            />
                            <button 
                              class="bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-xs font-bold px-4 rounded-lg shrink-0 cursor-pointer disabled:opacity-50 transition-colors" 
                              (click)="forceChannelId()"
                              [disabled]="!manualChannelId || isGeneratingManual"
                            >
                              Forcer
                            </button>
                          </div>
                        </div>

                        <div class="flex gap-3 items-start">
                          <div class="size-5 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-[10px] font-bold text-zinc-300">1</div>
                          <p class="text-xs text-zinc-450 leading-relaxed font-medium">
                            <strong>Solution classique :</strong> Utilisez la <span class="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 border border-zinc-750">Navigation Privée</span> (Incognito).
                          </p>
                        </div>
                        
                        <div class="flex gap-3 items-start">
                          <div class="size-5 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800 text-[10px] font-bold text-zinc-300">2</div>
                          <div class="space-y-2">
                            <p class="text-xs text-zinc-455 leading-relaxed font-medium">
                              <strong>Réinitialisation TOTALE :</strong> Ouvrez ce lien de gestion Google, cherchez <strong>Nerra</strong> / <strong>Stratly</strong> et supprimez l'accès.
                            </p>
                            <a href="https://myaccount.google.com/permissions" target="_blank" class="inline-flex items-center text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors gap-1.5 mt-1 underline">
                              <ng-icon name="lucideMousePointerClick" class="size-3.5"></ng-icon>
                              Ouvrir Gestion des Permissions
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Info Card -->
        <div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 flex flex-col">
          <div class="mb-6">
            <h3 class="text-lg font-bold text-zinc-50 tracking-tight">Pourquoi connecter YouTube ?</h3>
            <p class="text-xs text-zinc-500 font-medium mt-0.5">Avantages du protocole analytique</p>
          </div>
          
          <div class="space-y-5">
            <div class="flex gap-4">
              <div class="size-8 rounded-lg bg-zinc-950 border border-zinc-850 shadow-sm flex items-center justify-center shrink-0">
                <span class="text-violet-450 font-bold text-sm">1</span>
              </div>
              <div>
                <p class="font-bold text-zinc-100 text-sm">Analyses Précises</p>
                <p class="text-xs text-zinc-400 leading-relaxed font-medium mt-0.5">Accédez à vos données réelles de vues et d'abonnés directement depuis la console.</p>
              </div>
            </div>
            
            <div class="flex gap-4">
              <div class="size-8 rounded-lg bg-zinc-950 border border-zinc-850 shadow-sm flex items-center justify-center shrink-0">
                <span class="text-violet-450 font-bold text-sm">2</span>
              </div>
              <div>
                <p class="font-bold text-zinc-100 text-sm">IA Custom</p>
                <p class="text-xs text-zinc-400 leading-relaxed font-medium mt-0.5">L'IA analyse vos performances passées pour vous proposer des idées de vidéos sur mesure.</p>
              </div>
            </div>
            
            <div class="flex gap-4">
              <div class="size-8 rounded-lg bg-zinc-950 border border-zinc-850 shadow-sm flex items-center justify-center shrink-0">
                <span class="text-violet-450 font-bold text-sm">3</span>
              </div>
              <div>
                <p class="font-bold text-zinc-100 text-sm">Suivi Quotidien</p>
                <p class="text-xs text-zinc-400 leading-relaxed font-medium mt-0.5">Visualisez votre croissance jour après jour avec des graphiques interactifs.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ConnectComponent implements OnInit {
  profile: any = null;
  isLoading = true;
  isConnected = false;
  manualChannelId = '';
  isGeneratingManual = false;

  constructor(
    private supabase: SupabaseService,
    private youtubeService: YouTubeService
  ) { }

  async ngOnInit() {
    await this.loadStatus();
  }

  async loadStatus() {
    this.isLoading = true;
    try {
      this.profile = await this.supabase.getProfile();
      this.isConnected = !!(this.profile?.youtube_channel_id && this.profile?.youtube_refresh_token);
    } catch (err) {
      console.error('Error loading profile:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async forceChannelId() {
    if (!this.manualChannelId || !this.manualChannelId.trim().startsWith('UC')) {
      alert('Veuillez entrer un ID de chaîne valide (qui commence par "UC").');
      return;
    }
    
    if (!this.profile?.youtube_refresh_token) {
      alert("Vous devez d'abord vous connecter via Google avec votre compte principal.");
      return;
    }

    this.isGeneratingManual = true;
    try {
      await this.youtubeService.importData(this.manualChannelId.trim());
      alert("Succès ! Les données de la chaîne ont été forcées et importées. Le tableau de bord va s'actualiser.");
      await this.loadStatus();
    } catch (err) {
      console.error('Error forcing channel data import:', err);
      alert("Erreur lors du forçage de l'ID. Vérifiez l'ID ou assurez-vous que votre compte Google principal est bien autorisé.");
    } finally {
      this.isGeneratingManual = false;
    }
  }

  async connect() {
    try {
      const url = await this.youtubeService.getOAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Error initiating YouTube connect:', err);
      alert('Erreur lors de la connexion YouTube. Veuillez réessayer.');
    }
  }
}
