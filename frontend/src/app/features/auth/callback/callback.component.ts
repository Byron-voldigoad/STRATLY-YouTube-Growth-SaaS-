import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';
import { NerraLoaderComponent } from '../../../shared/components/nerra-loader/nerra-loader.component';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule, RouterLink, NerraLoaderComponent],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-50 font-sans selection:bg-violet-500/30">
      <div class="text-center max-w-md w-full px-6">
        @if (error) {
          <div class="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-8 rounded-2xl shadow-xl">
            <p class="font-black text-lg tracking-tight mb-2">Erreur d'authentification</p>
            <p class="text-sm text-zinc-400 font-medium leading-relaxed mb-6">{{ error }}</p>
            <a routerLink="/login" class="inline-flex h-[42px] px-6 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-[13px] font-bold text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100 transition-colors shadow-lg shadow-black/20 cursor-pointer">
              Retourner à la connexion
            </a>
          </div>
        } @else {
          <nerra-loader variant="section" message="Authentification en cours..."></nerra-loader>
        }
      </div>
    </div>
  `,
})
export class CallbackComponent implements OnInit {
  error = '';

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) { }

  async ngOnInit() {
    try {
      // Supabase gère automatiquement l'échange du code via l'URL
      // On attend juste que la session soit établie
      const session = await this.supabase.getSession();
      if (session) {
        const profile = await this.supabase.getProfile();
        if (!profile?.youtube_channel_id) {
          this.router.navigate(['/onboarding']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      } else {
        // Attendre un peu que Supabase récupère la session depuis l'URL
        setTimeout(async () => {
          const retrySession = await this.supabase.getSession();
          if (retrySession) {
            const profile = await this.supabase.getProfile();
            if (!profile?.youtube_channel_id) {
              this.router.navigate(['/onboarding']);
            } else {
              this.router.navigate(['/dashboard']);
            }
          } else {
            this.error = 'Session non trouvée. Veuillez réessayer.';
          }
        }, 2000);
      }
    } catch (err: any) {
      this.error = err?.message || 'Erreur lors de l\'authentification.';
    }
  }
}
