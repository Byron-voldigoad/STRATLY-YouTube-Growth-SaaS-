import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { lastValueFrom } from 'rxjs';
import {
  Decision,
  TensionScore,
  ChannelModeInfo,
  ResistanceResult,
  EvaluationResult,
  AuditInsights,
  UserContext,
} from '../models/decision.model';

@Injectable({
  providedIn: 'root',
})
export class DecisionService {
  private apiUrl = environment.genkitApiUrl || 'http://localhost:3400';

  constructor(private http: HttpClient) {}

  /**
   * Génère la prochaine décision stratégique.
   * Accepte optionnellement les insights de l'audit et le contexte utilisateur.
   */
  async getNextDecision(
    userId: string,
    channelId: string,
    auditInsights?: AuditInsights,
    userContext?: UserContext,
  ): Promise<Decision> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean; decision: Decision }>(
        `${this.apiUrl}/decisions/next`,
        { userId, channelId, auditInsights, userContext },
      ),
    );
    return response.decision;
  }

  /**
   * Accepte une décision proposée
   */
  async acceptDecision(decisionId: string): Promise<void> {
    await lastValueFrom(
      this.http.post(`${this.apiUrl}/decisions/${decisionId}/accept`, {}),
    );
  }

  /**
   * Refuse une décision (déclenche la gestion de résistance)
   */
  async rejectDecision(decisionId: string): Promise<ResistanceResult> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean } & ResistanceResult>(
        `${this.apiUrl}/decisions/${decisionId}/reject`,
        {},
      ),
    );
    return {
      level: response.level,
      message: response.message,
      newDecisionId: response.newDecisionId,
    };
  }

  /**
   * Évalue une décision après publication de la vidéo
   */
  async evaluateDecision(
    decisionId: string,
    resultValue: number,
  ): Promise<EvaluationResult> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean } & EvaluationResult>(
        `${this.apiUrl}/decisions/${decisionId}/evaluate`,
        { resultValue },
      ),
    );
    return { verdict: response.verdict, improvement: response.improvement };
  }

  /**
   * Récupère l'historique des décisions
   */
  async getHistory(
    userId: string,
    channelId: string,
  ): Promise<Decision[]> {
    const response = await lastValueFrom(
      this.http.get<{ success: boolean; history: Decision[] }>(
        `${this.apiUrl}/decisions/history`,
        { params: { userId, channelId } },
      ),
    );
    return response.history;
  }

  /**
   * Génère 3 suggestions de titres pour une décision acceptée
   */
  async getTitleSuggestions(
    decisionId: string,
    userContext?: any,
  ): Promise<{ titles: string[]; reasoning: string }> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean; titles: string[]; reasoning: string }>(
        `${this.apiUrl}/decisions/${decisionId}/titles`,
        { userContext },
      ),
    );
    return { titles: response.titles, reasoning: response.reasoning };
  }

  /**
   * Génère 3 concepts/idées de vidéos pour une décision acceptée
   */
  async generateConcepts(
    decisionId: string,
    userNotes?: string,
  ): Promise<{ concepts: string[]; reasoning: string }> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean; concepts: string[]; reasoning: string }>(
        `${this.apiUrl}/decisions/${decisionId}/concepts`,
        { userNotes },
      ),
    );
    return { concepts: response.concepts, reasoning: response.reasoning };
  }

  /**
   * Évalue un concept personnalisé proposé par l'utilisateur
   */
  async evaluateConcept(
    decisionId: string,
    concept: string,
  ): Promise<{ score: number; feedback: string }> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean; score: number; feedback: string }>(
        `${this.apiUrl}/decisions/${decisionId}/evaluate-concept`,
        { concept },
      ),
    );
    return { score: response.score, feedback: response.feedback };
  }
  /**
   * Brainstorm : développe un concept de vidéo en détail
   */
  async brainstormConcept(
    decisionId: string,
    concept: string,
    userNotes?: string,
  ): Promise<{
    scenes: string[];
    style: string;
    duration: string;
    musicDirection: string;
    hookSuggestion: string;
    refinedConcept: string;
  }> {
    const response = await lastValueFrom(
      this.http.post<{
        success: boolean;
        scenes: string[];
        style: string;
        duration: string;
        musicDirection: string;
        hookSuggestion: string;
        refinedConcept: string;
      }>(`${this.apiUrl}/decisions/${decisionId}/brainstorm`, { concept, userNotes }),
    );
    return {
      scenes: response.scenes,
      style: response.style,
      duration: response.duration,
      musicDirection: response.musicDirection,
      hookSuggestion: response.hookSuggestion,
      refinedConcept: response.refinedConcept,
    };
  }

  /**
   * Demande l'évaluation d'un titre personnalisé
   */
  async evaluateTitle(
    decisionId: string,
    title: string,
    userContext?: any,
  ): Promise<{ score: number; feedback: string }> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean; score: number; feedback: string }>(
        `${this.apiUrl}/decisions/${decisionId}/evaluate-title`,
        { title, userContext },
      ),
    );
    return { score: response.score, feedback: response.feedback };
  }

  /**
   * Génère un brief créatif pour la miniature
   */
  async getThumbnailBrief(
    decisionId: string,
    videoTitle?: string
  ): Promise<{
    visualElements: string[];
    colorPalette: string[];
    textOverlay: string;
    composition: string;
    inspiration: string;
    generationPrompt: string;
    referencedVideos: { title: string; thumbnailUrl: string; views: number; engagement: string }[];
  }> {
    const response = await lastValueFrom(
      this.http.post<{
        success: boolean;
        visualElements: string[];
        colorPalette: string[];
        textOverlay: string;
        composition: string;
        inspiration: string;
        generationPrompt: string;
        referencedVideos: { title: string; thumbnailUrl: string; views: number; engagement: string }[];
      }>(`${this.apiUrl}/decisions/${decisionId}/thumbnail-brief`, { videoTitle }),
    );
    return {
      visualElements: response.visualElements,
      colorPalette: response.colorPalette,
      textOverlay: response.textOverlay,
      composition: response.composition,
      inspiration: response.inspiration,
      generationPrompt: response.generationPrompt,
      referencedVideos: response.referencedVideos || [],
    };
  }

  /**
   * Évalue une miniature (base64)
   */
  async evaluateThumbnail(
    decisionId: string,
    base64Image: string,
  ): Promise<{ score: number; feedback: string }> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean; score: number; feedback: string }>(
        `${this.apiUrl}/decisions/${decisionId}/evaluate-thumbnail`,
        { base64Image },
      ),
    );
    return { score: response.score, feedback: response.feedback };
  }

  /**
   * Scanne la chaîne pour découvrir des vidéos récentes à lier
   */
  async discoverRecentVideos(decisionId: string): Promise<any[]> {
    const response = await lastValueFrom(
      this.http.get<{ success: boolean; candidates: any[] }>(
        `${this.apiUrl}/decisions/${decisionId}/discover-recent-videos`,
      ),
    );
    return response.candidates;
  }

  /**
   * Lie une vidéo YouTube à une décision (lance l'évaluation auto)
   */
  async linkVideo(
    decisionId: string,
    videoId: string,
    videoTitle?: string,
  ): Promise<{ linked: boolean; message: string }> {
    const response = await lastValueFrom(
      this.http.post<{ success: boolean; linked: boolean; message: string }>(
        `${this.apiUrl}/decisions/${decisionId}/link-video`,
        { videoId, videoTitle },
      ),
    );
    return { linked: response.linked, message: response.message };
  }

  /**
   * Récupère le score de tension stratégique
   */
  async getTensionScore(
    userId: string,
    channelId: string,
  ): Promise<TensionScore> {
    const response = await lastValueFrom(
      this.http.get<{ success: boolean } & TensionScore>(
        `${this.apiUrl}/decisions/tension-score`,
        { params: { userId, channelId } },
      ),
    );
    return {
      score: response.score,
      resistedLevers: response.resistedLevers,
      totalDecisions: response.totalDecisions,
      validatedCount: response.validatedCount,
      failedCount: response.failedCount,
      skippedCount: response.skippedCount,
    };
  }

  /**
   * Récupère le mode actuel de la chaîne (ASSISTED / PILOT)
   */
  async getChannelMode(
    userId: string,
    channelId: string,
  ): Promise<ChannelModeInfo> {
    const response = await lastValueFrom(
      this.http.get<{ success: boolean } & ChannelModeInfo>(
        `${this.apiUrl}/decisions/mode`,
        { params: { userId, channelId } },
      ),
    );
    return {
      mode: response.mode,
      consecutiveValidated: response.consecutiveValidated,
      totalVerified: response.totalVerified,
      reason: response.reason,
      reboot: response.reboot,
    };
  }
}
