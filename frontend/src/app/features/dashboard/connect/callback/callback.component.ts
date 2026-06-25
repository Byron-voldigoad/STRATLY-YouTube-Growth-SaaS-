import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { YouTubeService } from '../../../../core/services/youtube.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { lucideAlertCircle, lucideCheckCircle } from '@ng-icons/lucide';
import { NerraLoaderComponent } from '../../../../shared/components/nerra-loader/nerra-loader.component';

@Component({
    selector: 'app-connect-callback',
    standalone: true,
    imports: [CommonModule, NgIconComponent, NerraLoaderComponent],
    providers: [
        provideIcons({ lucideAlertCircle, lucideCheckCircle })
    ],
    template: `
    <div class="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-heading">
      @if (status === 'loading') {
        <nerra-loader
          variant="fullpage"
          [message]="'Sécurisation de votre connexion…'"
        />
      }

      @if (status === 'success') {
        <div class="text-center animate-in fade-in zoom-in duration-500">
          <div class="w-20 h-20 bg-emerald-950/50 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ng-icon name="lucideCheckCircle" class="w-10 h-10 text-emerald-400"></ng-icon>
          </div>
          <h3 class="text-xl font-bold text-zinc-50 mb-2">Canal sécurisé</h3>
          <p class="text-sm text-zinc-500">Redirection vers l'analyse…</p>
        </div>
      }

      @if (status === 'error') {
        <div class="text-center animate-in fade-in zoom-in duration-500">
          <div class="w-20 h-20 bg-rose-950/50 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ng-icon name="lucideAlertCircle" class="w-10 h-10 text-rose-400"></ng-icon>
          </div>
          <h3 class="text-xl font-bold text-zinc-50 mb-2">Échec de connexion</h3>
          <p class="text-sm text-rose-400 mb-6">{{ errorMessage }}</p>
          <button class="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-500 transition-all shadow-lg shadow-violet-600/20 cursor-pointer"
                  (click)="retry()">
            Réessayer
          </button>
        </div>
      }
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

