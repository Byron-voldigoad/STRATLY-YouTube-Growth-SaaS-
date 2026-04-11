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
    <div class="flex items-center justify-center min-h-[60vh]">
      <section hlmCard class="w-full max-w-md border-border/50 shadow-lg">
        <div hlmCardHeader class="text-center">
          <h3 hlmCardTitle class="text-xl font-bold">Connexion YouTube</h3>
          <p hlmCardDescription>Finalisation de la connexion à votre chaîne</p>
        </div>
        
        <div hlmCardContent class="flex flex-col items-center py-6">
          @if (status === 'loading') {
            <ng-icon name="lucideLoader2" class="size-12 text-blue-600 animate-spin mb-4"></ng-icon>
            <p class="text-muted-foreground animate-pulse">Échange des codes avec Google...</p>
          }
          
          @if (status === 'success') {
            <ng-icon name="lucideCheckCircle" class="size-12 text-green-500 mb-4"></ng-icon>
            <p class="font-medium text-slate-900 mb-2">Connexion réussie !</p>
            <p class="text-sm text-muted-foreground text-center">Votre chaîne est maintenant connectée. Redirection vers le dashboard...</p>
          }
          
          @if (status === 'error') {
            <ng-icon name="lucideAlertCircle" class="size-12 text-red-500 mb-4"></ng-icon>
            <p class="font-medium text-slate-900 mb-2">Échec de la connexion</p>
            <p class="text-sm text-red-500 text-center mb-6">{{ errorMessage }}</p>
            <button class="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                    (click)="retry()">
              Nouvelle tentative
            </button>
          }
        </div>
      </section>
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

            // Rediriger après un court délai
            setTimeout(() => {
                this.router.navigate(['/dashboard'], {
                    queryParams: { success: 'youtube_connected' }
                });
            }, 2000);
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
