import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { YouTubeService } from '../../../core/services/youtube.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButton } from '@spartan-ng/helm/button';
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
  lucideMousePointerClick
} from '@ng-icons/lucide';

@Component({
  selector: 'app-connect',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmCardImports, HlmButton, NgIconComponent],
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
      lucideMousePointerClick
    })
  ],
  template: `
    <div class="space-y-8 animate-in fade-in duration-500">
      <div class="flex flex-col gap-2">
        <h2 class="text-3xl font-bold tracking-tight text-slate-900 font-heading">Connexion YouTube</h2>
        <p class="text-muted-foreground">Gérez la connexion entre Nerra et votre chaîne YouTube.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <!-- Status Card -->
        <section hlmCard class="border-border/50 shadow-sm">
          <div hlmCardHeader>
            <h3 hlmCardTitle>État de la connexion</h3>
            <p hlmCardDescription>Votre statut actuel sur la plateforme</p>
          </div>
          <div hlmCardContent class="py-6">
            @if (isLoading) {
              <div class="flex items-center gap-3 text-muted-foreground animate-pulse">
                <div class="size-4 bg-slate-200 rounded-full"></div>
                Vérification du profil...
              </div>
            } @else {
              <div class="flex flex-col gap-6">
                <!-- Current Profile Info -->
                <div class="flex items-center gap-4">
                  <div class="size-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-border/50">
                    @if (profile?.youtube_channel_thumbnail) {
                      <img [src]="profile.youtube_channel_thumbnail" class="w-full h-full object-cover">
                    } @else {
                      <ng-icon name="lucideYoutube" class="size-8 text-red-600"></ng-icon>
                    }
                  </div>
                  <div>
                    <h4 class="font-bold text-lg text-slate-900">
                      {{ profile?.youtube_channel_title || 'Non connecté' }}
                    </h4>
                    <div class="flex items-center gap-1.5 mt-0.5">
                      @if (isConnected) {
                        <span class="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          <ng-icon name="lucideCheckCircle2" class="size-3"></ng-icon>
                          Connecté
                        </span>
                      } @else {
                        <span class="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                          <ng-icon name="lucideAlertCircle" class="size-3"></ng-icon>
                          Déconnecté
                        </span>
                      }
                    </div>
                  </div>
                </div>

                @if (isConnected) {
                  <div class="p-4 bg-slate-50 rounded-xl border border-border/10 space-y-4">
                    <p class="text-sm text-slate-600 leading-relaxed">
                      Votre chaîne est correctement liée. Nerra importe automatiquement vos données pour générer des analyses.
                    </p>
                    <div class="flex flex-col gap-3">
                       <button hlmBtn variant="outline" size="sm" class="w-full gap-2 text-xs py-5" (click)="connect()">
                        <ng-icon name="lucideRotateCcw" class="size-3"></ng-icon>
                        Changer de compte ou de chaîne
                      </button>
                    </div>
                  </div>
                } @else {
                  <div class="space-y-4">
                    <p class="text-sm text-muted-foreground">
                      Connectez votre compte Google pour autoriser Nerra à accéder à vos statistiques YouTube Analytics.
                    </p>
                    <button hlmBtn class="w-full py-6 text-base font-bold bg-[#FF0000] hover:bg-[#CC0000] text-white shadow-lg shadow-red-500/20 gap-3"
                            (click)="connect()">
                      <ng-icon name="lucideYoutube" class="size-5"></ng-icon>
                      Se connecter avec YouTube
                    </button>
                  </div>
                }

                <!-- Troubleshooting Zone -->
                <div class="mt-4 pt-6 border-t border-slate-100 space-y-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 text-slate-500">
                      <ng-icon name="lucideHelpCircle" class="size-4"></ng-icon>
                      <h5 class="text-[10px] font-bold uppercase tracking-wider">Problème de compte ?</h5>
                    </div>
                    <span class="text-[9px] px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded uppercase tracking-tighter animate-pulse">Solution critique</span>
                  </div>
                  
                  <div class="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200/50 shadow-sm space-y-4">
                    <div class="flex gap-2">
                      <ng-icon name="lucideAlertTriangle" class="size-5 text-amber-600 shrink-0"></ng-icon>
                      <p class="text-[13px] font-bold text-amber-900 leading-tight">Google ne vous demande pas de choisir votre chaîne ?</p>
                    </div>
                    
                    <div class="space-y-4">
                      <!-- Manual ID Override -->
                      <div class="p-4 bg-white/80 rounded-xl border border-amber-200 shadow-sm">
                        <p class="text-xs text-amber-900 font-bold mb-2">Forcer une chaîne spécifique :</p>
                        <p class="text-[11px] text-amber-700/80 mb-3 leading-snug">
                          Si vos sous-chaînes n'apparaissent pas, connectez-vous avec votre profil principal ci-dessus, puis collez l'ID de votre chaîne ici (commence par UC...) :
                        </p>
                        <div class="flex gap-2">
                          <input 
                            type="text" 
                            [(ngModel)]="manualChannelId" 
                            placeholder="UCxxxxxxxxxxxxxxxxx" 
                            class="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                            [disabled]="isGeneratingManual"
                          />
                          <button 
                            hlmBtn 
                            variant="default" 
                            size="sm" 
                            class="bg-amber-600 hover:bg-amber-700 text-white shrink-0" 
                            (click)="forceChannelId()"
                            [disabled]="!manualChannelId || isGeneratingManual"
                          >
                            Forcer
                          </button>
                        </div>
                      </div>

                      <div class="flex gap-3 items-start">
                        <div class="size-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-amber-200 text-[10px] font-bold text-amber-700">1</div>
                        <p class="text-[12px] text-amber-800 leading-snug">
                          <strong>Solution classique :</strong> Utilisez la <span class="bg-amber-200/50 px-1 rounded">Navigation Privée</span> (Incognito).
                        </p>
                      </div>
                      
                      <div class="flex gap-3 items-start">
                        <div class="size-5 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm border border-amber-200 text-[10px] font-bold text-amber-700">2</div>
                        <div class="space-y-2">
                          <p class="text-[12px] text-amber-800 leading-snug">
                            <strong>Réinitialisation TOTALE :</strong> Ouvrez ce lien de gestion Google, cherchez <strong>Nerra</strong> / <strong>Stratly</strong> et supprimez l'accès.
                          </p>
                          <a href="https://myaccount.google.com/permissions" target="_blank" hlmBtn variant="link" size="sm" class="h-auto p-0 text-orange-600 hover:text-orange-800 decoration-orange-600/30 font-bold text-[12px] gap-2 mt-1">
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
        </section>

        <!-- Info Card -->
        <section hlmCard class="border-border/50 shadow-sm bg-slate-50/50">
          <div hlmCardHeader>
            <h3 hlmCardTitle>Pourquoi connecter YouTube ?</h3>
          </div>
          <div hlmCardContent class="space-y-4">
            <div class="flex gap-4">
              <div class="size-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-border/10">
                <span class="text-slate-900 font-bold">1</span>
              </div>
              <div>
                <p class="font-bold text-slate-900 text-sm">Analyses Précises</p>
                <p class="text-sm text-muted-foreground">Accédez à vos données réelles de vues et d'abonnés directement depuis la console.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="size-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-border/10">
                <span class="text-slate-900 font-bold">2</span>
              </div>
              <div>
                <p class="font-bold text-slate-900 text-sm">IA Custom</p>
                <p class="text-sm text-muted-foreground">L'IA analyse vos performances passées pour vous proposer des idées de vidéos sur mesure.</p>
              </div>
            </div>
            <div class="flex gap-4">
              <div class="size-8 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0 border border-border/10">
                <span class="text-slate-900 font-bold">3</span>
              </div>
              <div>
                <p class="font-bold text-slate-900 text-sm">Suivi Quotidien</p>
                <p class="text-sm text-muted-foreground">Visualisez votre croissance jour après jour avec des graphiques interactifs.</p>
              </div>
            </div>
          </div>
        </section>
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
