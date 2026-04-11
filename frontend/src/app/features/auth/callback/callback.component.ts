import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div class="text-center">
        @if (error) {
          <div class="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
            <p class="font-medium">Erreur d'authentification</p>
            <p class="text-sm mt-1">{{ error }}</p>
            <a routerLink="/login" class="text-blue-600 text-sm mt-3 inline-block hover:underline">Retourner au login</a>
          </div>
        } @else {
          <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-500 mt-4">Authentification en cours...</p>
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
        this.router.navigate(['/dashboard']);
      } else {
        // Attendre un peu que Supabase récupère la session depuis l'URL
        setTimeout(async () => {
          const retrySession = await this.supabase.getSession();
          if (retrySession) {
            this.router.navigate(['/dashboard']);
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
