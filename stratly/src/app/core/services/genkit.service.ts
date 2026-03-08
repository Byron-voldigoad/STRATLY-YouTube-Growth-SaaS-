import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { lastValueFrom } from 'rxjs';

export interface VideoData {
    id: string;
    title: string;
    views: number;
    likes?: number;
    comments?: number;
    publishedAt: string;
}

export interface ChannelStats {
    subscriberCount: number;
    viewCount: number;
    videoCount: number;
    channelTitle?: string;
}

export interface AnalysisResponse {
    result: string;
    cached?: boolean;
    flowId?: string;
    traceId?: string;
}

export interface IdeasResponse {
    result: string[];
    cached?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class GenkitService {
    private apiUrl = environment.genkitApiUrl || 'http://localhost:3400';

    constructor(private http: HttpClient) { }

    /**
     * Analyse les performances d'une chaîne YouTube
     */
    async analyzeChannel(
        userId: string,
        channelId: string,
        videos: VideoData[],
        channelStats: ChannelStats
    ): Promise<AnalysisResponse> {
        try {
            const response = await lastValueFrom(
                this.http.post<AnalysisResponse>(`${this.apiUrl}/analyzeChannel`, {
                    data: { userId, channelId, videos, channelStats }
                })
            );
            return response;
        } catch (error) {
            console.error("Erreur lors de l'analyse de la chaîne: ", error);
            throw error;
        }
    }

    /**
     * Génère des idées de vidéos
     */
    async generateIdeas(
        userId: string,
        channelId: string,
        niche: string,
        topVideos: Array<{ title: string; views: number }>
    ): Promise<IdeasResponse> {
        try {
            const response = await lastValueFrom(
                this.http.post<IdeasResponse>(`${this.apiUrl}/generateIdeas`, {
                    data: { userId, channelId, niche, topVideos }
                })
            );
            return response;
        } catch (error) {
            console.error("Erreur lors de la génération d'idées: ", error);
            throw error;
        }
    }

    /**
     * Lance un import YouTube (tâche longue)
     */
    async importYouTubeData(userId: string, channelId: string) {
        try {
            const response = await lastValueFrom(
                this.http.post(`${this.apiUrl}/importYouTube`, {
                    data: { userId, channelId }
                })
            );
            return response;
        } catch (error) {
            console.error("Erreur lors de l'import YouTube: ", error);
            throw error;
        }
    }

    /**
     * Vérifie si le backend Genkit est accessible
     */
    async healthCheck(): Promise<boolean> {
        try {
            await lastValueFrom(this.http.get(`${this.apiUrl}/health`));
            return true;
        } catch {
            return false;
        }
    }
}
