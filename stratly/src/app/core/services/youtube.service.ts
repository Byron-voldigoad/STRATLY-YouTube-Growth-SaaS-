import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SupabaseService } from './supabase.service';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class YouTubeService {
    private readonly GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    private readonly SCOPES = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
    ];

    constructor(
        private http: HttpClient,
        private supabase: SupabaseService
    ) { }

    /**
     * Génère l'URL d'authentification Google OAuth pour YouTube
     */
    async getOAuthUrl(): Promise<string> {
        const user = await this.supabase.getUser();
        if (!user) throw new Error('Utilisateur non authentifié');

        const params = new URLSearchParams({
            client_id: environment.googleClientId,
            redirect_uri: `${window.location.origin}/dashboard/connect/callback`,
            response_type: 'code',
            scope: this.SCOPES.join(' '),
            access_type: 'offline',
            prompt: 'consent',
            state: JSON.stringify({ userId: user.id })
        });

        return `${this.GOOGLE_OAUTH_URL}?${params.toString()}`;
    }

    /**
     * Échange le code d'autorisation contre des tokens via le backend
     */
    async handleCallback(code: string): Promise<any> {
        const user = await this.supabase.getUser();
        if (!user) throw new Error('Utilisateur non authentifié');

        return firstValueFrom(
            this.http.post(`${environment.genkitApiUrl}/auth/youtube/callback`, {
                code,
                userId: user.id
            })
        );
    }

    /**
     * Déclenche l'importation des données YouTube via le flow Genkit
     */
    async importData(): Promise<any> {
        const user = await this.supabase.getUser();
        if (!user) throw new Error('Utilisateur non authentifié');

        return firstValueFrom(
            this.http.post(`${environment.genkitApiUrl}/importYouTube`, {
                data: { userId: user.id }
            })
        );
    }

    /**
     * Récupère les statistiques historiques de la chaîne depuis Supabase
     */
    async getChannelAnalytics() {
        const user = await this.supabase.getUser();
        if (!user) return null;

        const { data, error } = await this.supabase.client
            .from('channel_analytics')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: true })
            .limit(30);

        if (error) throw error;
        return data;
    }

    /**
     * Récupère les dernières performances vidéos depuis Supabase
     */
    async getVideoAnalytics() {
        const user = await this.supabase.getUser();
        if (!user) return null;

        const { data, error } = await this.supabase.client
            .from('video_analytics')
            .select('*')
            .eq('user_id', user.id)
            .order('published_at', { ascending: false })
            .limit(10);

        if (error) throw error;
        return data;
    }

    /**
     * Vérifie si la chaîne YouTube est connectée
     */
    async isConnected(): Promise<boolean> {
        const profile = await this.supabase.getProfile();
        return !!(profile?.youtube_channel_id && profile?.youtube_refresh_token);
    }
}
