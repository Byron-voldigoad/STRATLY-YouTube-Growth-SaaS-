import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase.service';

import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css',
})
export class SignupComponent {
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) { }

  async handleSignup() {
    if (!this.email || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Veuillez remplir tous les champs.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }
    if (this.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      await this.supabase.signUp(this.email, this.password);
      this.successMessage = 'Compte créé ! Vérifiez votre email pour confirmer votre inscription.';
    } catch (error: any) {
      this.errorMessage = error?.message || 'Erreur lors de l\'inscription.';
    } finally {
      this.loading = false;
    }
  }

  async handleGoogleSignup() {
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
