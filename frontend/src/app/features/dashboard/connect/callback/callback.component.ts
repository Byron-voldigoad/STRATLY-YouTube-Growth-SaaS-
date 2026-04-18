import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { YouTubeService } from '../../../../core/services/youtube.service';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideLoader2, lucideAlertCircle, lucideCheckCircle } from '@ng-icons/lucide';

@Component({
    selector: 'app-connect-callback',
    standalone: true,
    imports: [CommonModule, HlmCardImports, NgIconComponent],
    providers: [
        provideIcons({ lucideLoader2, lucideAlertCircle, lucideCheckCircle })
    ],
    template: `
    <div class="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-heading">
      <div class="w-full max-w-sm mx-auto text-center animate-in fade-in zoom-in duration-500">
        @if (status === 'loading') {
          <div class="relative w-20 h-20 mx-auto mb-6">
            <div class="absolute inset-0 border-4 border-slate-100 rounded-2xl"></div>
            <div class="absolute inset-0 border-4 border-indigo-600 rounded-2xl border-t-transparent animate-spin"></div>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-indigo-600 text-xl font-black">N</span>
            </div>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">Authentification...</h3>
          <p class="text-sm text-slate-500">Sécurisation de la connexion avec Google</p>
        }
        
        @if (status === 'success') {
          <div class="w-20 h-20 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ng-icon name="lucideCheckCircle" class="w-10 h-10 text-emerald-600"></ng-icon>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">Canal sécurisé</h3>
          <p class="text-sm text-slate-500">Redirection vers l'analyse...</p>
        }
        
        @if (status === 'error') {
          <div class="w-20 h-20 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ng-icon name="lucideAlertCircle" class="w-10 h-10 text-rose-600"></ng-icon>
          </div>
          <h3 class="text-xl font-bold text-slate-900 mb-2">Échec de connexion</h3>
          <p class="text-sm text-rose-600 mb-6">{{ errorMessage }}</p>
          <button class="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg"
                  (click)="retry()">
            Réessayer
          </button>
        }
      </div>
    </div>
  `
})
export class CallbackComponent implements OnInit {
    status: 'loading' | 'success' | 'error' = 'loading';
    errorMessage = '';

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private youtubeService: YouTubeService
    ) { }

    ngOnInit() {
        this.processCallback();
    }

    async processCallback() {
        const code = this.route.snapshot.queryParamMap.get('code');
        const error = this.route.snapshot.queryParamMap.get('error');

        if (error) {
            this.status = 'error';
            this.errorMessage = `Erreur Google : ${error}`;
            return;
        }

        if (!code) {
            this.status = 'error';
            this.errorMessage = "Code d'autorisation manquant.";
            return;
        }

        try {
            await this.youtubeService.handleCallback(code);
            this.status = 'success';

            // Rediriger après un court délai vers la fin du tunnel
            // Le guard onboardingGuard interceptera automatiquement et redirigera
            // vers /dashboard/ai-insights si l'audit n'est pas encore fait.
            setTimeout(() => {
                this.router.navigate(['/dashboard/decision']);
            }, 1000);
        } catch (err: any) {
            console.error('YouTube Callback Error:', err);
            this.status = 'error';
            this.errorMessage = err.error?.message || "Une erreur est survenue lors de l'échange des tokens.";
        }
    }

    retry() {
        this.router.navigate(['/dashboard/connect']);
    }
}
