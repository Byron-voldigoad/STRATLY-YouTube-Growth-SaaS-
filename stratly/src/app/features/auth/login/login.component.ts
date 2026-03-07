import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HlmButton],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) { }

  async handleEmailLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.supabase.signInWithEmail(this.email, this.password);
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error?.message || 'Erreur de connexion.';
    } finally {
      this.loading = false;
    }
  }

  async handleGoogleLogin() {
    this.loading = true;
    this.errorMessage = '';

    try {
      await this.supabase.signInWithGoogle();
    } catch (error: any) {
      this.errorMessage = error?.message || 'Erreur de connexion Google.';
      this.loading = false;
    }
  }
}
