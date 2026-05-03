import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  lucideSparkles,
  lucideLoader2,
  lucideCheck,
  lucideX,
  lucideTrendingUp,
  lucideTrendingDown,
  lucideAlertTriangle,
  lucideShield,
  lucideZap,
  lucideTarget,
  lucideFlame,
  lucideHistory,
  lucideChevronRight,
  lucideMessageCircle,
} from '@ng-icons/lucide';
import { DecisionService } from '../../../core/services/decision.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import {
  Decision,
  TensionScore,
  ChannelModeInfo,
  ExperimentType,
  EXPERIMENT_LABELS,
  METRIC_LABELS,
  ResistanceResult,
  AuditInsights,
  UserContext,
} from '../../../core/models/decision.model';

@Component({
  selector: 'app-decision',
  standalone: true,
  imports: [CommonModule, FormsModule, HlmCardImports, NgIconComponent],
  providers: [
    provideIcons({
      lucideSparkles,
      lucideLoader2,
      lucideCheck,
      lucideX,
      lucideTrendingUp,
      lucideTrendingDown,
      lucideAlertTriangle,
      lucideShield,
      lucideZap,
      lucideTarget,
      lucideFlame,
      lucideHistory,
      lucideChevronRight,
      lucideMessageCircle,
    }),
  ],
  templateUrl: './decision.component.html',
})
export class DecisionComponent implements OnInit {
  isLoading = true;
  isGenerating = false;
  isActioning = false;
  showContextPopup = false;

  currentDecision: Decision | null = null;
  decisionHistory: Decision[] = [];
  tensionScore: TensionScore | null = null;
  modeInfo: ChannelModeInfo | null = null;

  resistanceMessage: string | null = null;
  resistanceLevel = 0;

  // Evaluation
  evaluationValue: number | null = null;
  lastEvaluationImprovement: number | null = null;

  // Workshop (atelier vidéo post-acceptation)
  workshopStep = 1;
  isLoadingWorkshop = false;
  titleSuggestions: string[] = [];
  titleReasoning = '';
  selectedTitle = '';
  customTitle = '';
  titleEvaluation: { score: number; feedback: string } | null = null;
  isEvaluatingTitle = false;

  // Concept workshop (idéation)
  conceptSuggestions: { idea: string; marketInsight: string }[] = [];
  conceptReasoning = '';
  selectedConcept = '';
  customConcept = '';
  conceptEvaluation: { score: number; feedback: string } | null = null;
  isEvaluatingConcept = false;

  // Brainstorm workshop
  brainstormData: {
    scenes: string[];
    style: string;
    duration: string;
    musicDirection: string;
    musicSuggestions: { name: string; reason: string }[];
    hookSuggestion: string;
    refinedConcept: string;
    resourceVideos: { title: string; url: string; thumbnailUrl: string; why: string }[];
    tutorialVideos: { title: string; url: string; thumbnailUrl: string }[];
    notesEvaluation: { score: number; feedback: string } | null;
  } | null = null;
  brainstormNotes = '';

  thumbnailBrief: {
    visualElements: string[];
    colorPalette: string[];
    textOverlay: string;
    composition: string;
    inspiration: string;
    generationPrompt: string;
    referencedVideos: { title: string; thumbnailUrl: string; views: number; engagement: string }[];
  } | null = null;

  uploadedThumbnailBase64: string | null = null;
  thumbnailEvaluation: { score: number; feedback: string } | null = null;
  isEvaluatingThumbnail = false;

  videoUrl = '';
  linkMessage = '';

  // État de découverte automatique
  discoveredVideos: any[] = [];
  isDiscoveringVideos = false;

  saveWorkshopState() {
    if (!this.currentDecision) return;
    this.decisionService.updateWorkshopState(this.currentDecision.id, {
      workshop_step: this.workshopStep,
      selected_concept: this.selectedConcept || this.customConcept,
      brainstorm_data: this.brainstormData,
      selected_title: this.selectedTitle || this.customTitle,
      thumbnail_brief: this.thumbnailBrief
    });
  }

  onSelectConcept(idea: string) {
    this.selectedConcept = idea;
    this.customConcept = idea;
    this.saveWorkshopState();
  }

  onSelectTitle(title: string) {
    this.selectedTitle = title;
    this.customTitle = title;
    this.saveWorkshopState();
  }

  // Contexte utilisateur pour la popup
  userCtx: UserContext = {
    hasVideoInProgress: false,
    videoInProgressTitle: '',
    videoInProgressTopic: '',
    additionalNotes: '',
  };

  // Audit insights transmis via query params (depuis la page AI Insights)
  auditInsights: AuditInsights | null = null;

  private userId: string | null = null;
  private channelId: string | null = null;

  constructor(
    private decisionService: DecisionService,
    private supabase: SupabaseService,
    private route: ActivatedRoute,
  ) {}

  async ngOnInit() {
    try {
      // Récupérer les audit insights transmis via state (depuis AI Insights)
      const navState = history.state;
      if (navState?.auditInsights) {
        this.auditInsights = navState.auditInsights;
        console.log('[NERRA] Audit insights received from AI Insights page');
      }

      const profile = await this.supabase.getProfile();
      if (!profile?.youtube_channel_id) {
        this.isLoading = false;
        return;
      }

      this.userId = profile.id;
      this.channelId = profile.youtube_channel_id;

      // Récupérer le contexte utilisateur sauvegardé s'il existe
      const savedUserCtx = sessionStorage.getItem('nerra_user_ctx');
      if (savedUserCtx) {
        try {
          this.userCtx = JSON.parse(savedUserCtx);
        } catch (e) {
          console.error("Could not parse saved user context");
        }
      }

      await this.loadDashboardData();

      // Si on arrive depuis l'audit avec des insights, ouvrir directement la popup
      if (this.auditInsights && !this.currentDecision) {
        this.showContextPopup = true;
      } else {
        // Sinon, vérifier si l'utilisateur a déjà répondu dans la session courante
        const hasAnswered = sessionStorage.getItem('nerra_context_answered');
        if (!hasAnswered && (!this.decisionHistory || this.decisionHistory.length === 0)) {
           // Demander systématiquement s'il n'y a pas eu de réponse
           this.showContextPopup = true;
        }
      }
    } catch (err) {
      console.error('[NERRA] Init error:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async loadDashboardData() {
    if (!this.userId || !this.channelId) return;

    try {
      // Charger en parallèle : mode, tension, historique
      const [modeInfo, tensionScore, history] = await Promise.all([
        this.decisionService.getChannelMode(this.userId, this.channelId),
        this.decisionService.getTensionScore(this.userId, this.channelId),
        this.decisionService.getHistory(this.userId, this.channelId),
      ]);

      this.modeInfo = modeInfo;
      this.tensionScore = tensionScore;
      this.decisionHistory = history;

      // Vérifier s'il y a une décision PENDING
      const pending = history.find((d) => d.verdict === 'PENDING');
      if (pending) {
        this.currentDecision = pending;
        if (pending.accepted_at && pending.workshop_step && pending.workshop_step > 1) {
          this.workshopStep = pending.workshop_step;
          this.selectedConcept = pending.selected_concept || '';
          this.customConcept = pending.selected_concept || '';
          this.brainstormData = pending.brainstorm_data || null;
          this.selectedTitle = pending.selected_title || '';
          this.customTitle = pending.selected_title || '';
          this.thumbnailBrief = pending.thumbnail_brief || null;
        }
      } else {
        // Chercher la dernière décision évaluée pour l'afficher
        const lastEvaluated = history.find((d) => d.verdict === 'VALIDATED' || d.verdict === 'FAILED');
        if (lastEvaluated && !this.currentDecision) {
          this.currentDecision = lastEvaluated;
        }
      }
    } catch (err) {
      console.error('[NERRA] Load data error:', err);
    }
  }

  openContextPopup() {
    this.showContextPopup = true;
  }

  async confirmAndGenerate() {
    sessionStorage.setItem('nerra_context_answered', 'true');
    sessionStorage.setItem('nerra_user_ctx', JSON.stringify(this.userCtx));
    this.showContextPopup = false;
    await this.generateDecision();
  }

  async generateDecision() {
    if (!this.userId || !this.channelId) return;

    this.isGenerating = true;
    this.resistanceMessage = null;
    this.resistanceLevel = 0;
    this.lastEvaluationImprovement = null;

    try {
      // Passer le contexte utilisateur et les insights de l'audit
      const userContext: UserContext | undefined = this.userCtx.hasVideoInProgress || this.userCtx.additionalNotes
        ? this.userCtx
        : undefined;

      this.currentDecision = await this.decisionService.getNextDecision(
        this.userId,
        this.channelId,
        this.auditInsights || undefined,
        userContext,
      );
      // Refresh history
      this.decisionHistory = await this.decisionService.getHistory(
        this.userId,
        this.channelId,
      );
    } catch (err) {
      console.error('[NERRA] Generate error:', err);
      alert("Erreur lors de la génération. Le backend est-il lancé ?");
    } finally {
      this.isGenerating = false;
    }
  }

  async onAccept() {
    if (!this.currentDecision) return;

    this.isActioning = true;
    try {
      await this.decisionService.acceptDecision(this.currentDecision.id);
      this.currentDecision.accepted_at = new Date().toISOString();
      this.resistanceMessage = null;
      this.resistanceLevel = 0;
      this.evaluationValue = null;

      // Reset workshop state
      this.workshopStep = this.userCtx.hasVideoInProgress ? 3 : 1;
      this.conceptSuggestions = [];
      this.conceptReasoning = '';
      this.selectedConcept = '';
      this.customConcept = '';
      this.conceptEvaluation = null;
      this.brainstormData = null;
      this.brainstormNotes = '';
      this.titleSuggestions = [];
      this.titleReasoning = '';
      this.selectedTitle = '';
      this.customTitle = '';
      this.thumbnailBrief = null;
      this.videoUrl = '';
      this.linkMessage = '';

      // Refresh tout
      await this.loadDashboardData();
      // Mais garder la décision acceptée comme courante
      if (this.currentDecision) {
        const refreshed = this.decisionHistory.find((d) => d.id === this.currentDecision!.id);
        if (refreshed) {
          this.currentDecision = refreshed;
        }
      }

      if (this.workshopStep === 1) {
        this.loadConceptSuggestions();
      } else {
        this.loadTitleSuggestions();
      }
    } catch (err) {
      console.error('[NERRA] Accept error:', err);
    } finally {
      this.isActioning = false;
    }
  }

  async onReject() {
    if (!this.currentDecision) return;

    this.isActioning = true;
    try {
      const result: ResistanceResult = await this.decisionService.rejectDecision(
        this.currentDecision.id,
      );

      this.resistanceLevel = result.level;
      this.resistanceMessage = result.message;

      if (result.level === 3) {
        // Résistance confirmée — on retire la décision et on permet d'en générer une nouvelle
        this.currentDecision = null;
        await this.loadDashboardData();
      } else if (result.level === 1) {
        // 1er refus → générer une reformulation
        await this.generateDecision();
      }
    } catch (err) {
      console.error('[NERRA] Reject error:', err);
    } finally {
      this.isActioning = false;
    }
  }

  async onEvaluate() {
    if (!this.currentDecision || this.evaluationValue === null) return;

    this.isActioning = true;
    try {
      const result = await this.decisionService.evaluateDecision(
        this.currentDecision.id,
        this.evaluationValue,
      );

      this.lastEvaluationImprovement = result.improvement;

      // Mettre à jour la décision courante avec le verdict
      this.currentDecision.verdict = result.verdict;
      this.currentDecision.result_value = this.evaluationValue;

      // Refresh les données
      await this.loadDashboardData();
      // Garder la décision évaluée comme courante pour afficher le verdict
      const refreshed = this.decisionHistory.find((d) => d.id === this.currentDecision!.id);
      if (refreshed) {
        this.currentDecision = refreshed;
      }
    } catch (err) {
      console.error('[NERRA] Evaluate error:', err);
      alert("Erreur lors de l'évaluation.");
    } finally {
      this.isActioning = false;
    }
  }

  async onSkip() {
    if (!this.currentDecision) return;

    this.isActioning = true;
    try {
      // Marquer comme SKIPPED via reject 3 fois n'est pas idéal,
      // on utilise plutôt un appel direct
      await this.decisionService.rejectDecision(this.currentDecision.id);
      await this.decisionService.rejectDecision(this.currentDecision.id);
      await this.decisionService.rejectDecision(this.currentDecision.id);

      this.currentDecision = null;
      this.evaluationValue = null;
      this.lastEvaluationImprovement = null;
      await this.loadDashboardData();

      // Ouvrir le popup de contexte pour une nouvelle décision
      this.showContextPopup = true;
    } catch (err) {
      console.error('[NERRA] Skip error:', err);
    } finally {
      this.isActioning = false;
    }
  }

  async onGenerateNext() {
    this.currentDecision = null;
    this.evaluationValue = null;
    this.lastEvaluationImprovement = null;
    this.workshopStep = 1;
    this.titleSuggestions = [];
    this.thumbnailBrief = null;
    this.videoUrl = '';
    this.linkMessage = '';
    this.openContextPopup();
  }

  viewDecision(decision: Decision) {
    this.currentDecision = decision;
    this.evaluationValue = null;
    this.lastEvaluationImprovement = null;
    this.resistanceMessage = null;
    this.resistanceLevel = 0;
    // Reset or restore workshop if viewing a different accepted decision
    if (decision.accepted_at && decision.verdict === 'PENDING') {
      if (decision.workshop_step && decision.workshop_step > 1) {
        this.workshopStep = decision.workshop_step;
        this.selectedConcept = decision.selected_concept || '';
        this.customConcept = decision.selected_concept || '';
        this.brainstormData = decision.brainstorm_data || null;
        this.selectedTitle = decision.selected_title || '';
        this.customTitle = decision.selected_title || '';
        this.thumbnailBrief = decision.thumbnail_brief || null;
      } else {
        this.workshopStep = 1;
        this.conceptSuggestions = [];
        this.titleSuggestions = [];
        this.thumbnailBrief = null;
      }
      this.videoUrl = '';
      this.linkMessage = '';
      this.loadConceptSuggestions();
    }
  }

  // ─── Workshop Methods ─────────────────────────────────────

  isConceptFromSuggestions(concept: string): boolean {
    return this.conceptSuggestions.some(c => c.idea === concept);
  }

  async loadConceptSuggestions() {
    if (!this.currentDecision) return;

    this.isLoadingWorkshop = true;
    try {
      const result = await this.decisionService.generateConcepts(
        this.currentDecision.id,
        this.userCtx.additionalNotes || undefined,
      );
      this.conceptSuggestions = result.concepts;
      this.conceptReasoning = result.reasoning;
      // Pre-select first concept
      if (result.concepts.length > 0) {
        this.selectedConcept = result.concepts[0].idea;
        this.customConcept = result.concepts[0].idea;
      }
    } catch (err) {
      console.error('[NERRA] Concept suggestions error:', err);
    } finally {
      this.isLoadingWorkshop = false;
    }
  }

  confirmConcept() {
    // Transfer the selected concept into the user context topic
    this.userCtx.videoInProgressTopic = this.customConcept;
    this.conceptEvaluation = null;
    // Move to brainstorm step
    this.workshopStep = 2;
    this.saveWorkshopState();
    this.loadBrainstorm();
  }

  async loadBrainstorm() {
    if (!this.currentDecision) return;

    this.isLoadingWorkshop = true;
    this.brainstormData = null;
    try {
      this.brainstormData = await this.decisionService.brainstormConcept(
        this.currentDecision.id,
        this.customConcept,
        this.brainstormNotes || undefined,
      );
    } catch (err) {
      console.error('[NERRA] Brainstorm error:', err);
    } finally {
      this.isLoadingWorkshop = false;
    }
  }

  reloadBrainstorm() {
    this.loadBrainstorm();
  }

  confirmBrainstorm() {
    // Enrich the topic with the refined concept for title generation
    if (this.brainstormData?.refinedConcept) {
      this.userCtx.videoInProgressTopic = this.brainstormData.refinedConcept;
    }
    this.workshopStep = 3;
    this.saveWorkshopState();
    this.loadTitleSuggestions();
  }

  async evaluateConcept() {
    if (!this.currentDecision || !this.customConcept) return;

    this.isEvaluatingConcept = true;
    this.conceptEvaluation = null;

    try {
      this.conceptEvaluation = await this.decisionService.evaluateConcept(
        this.currentDecision.id,
        this.customConcept,
      );
    } catch (err) {
      console.error('[NERRA] Concept evaluation error:', err);
    } finally {
      this.isEvaluatingConcept = false;
    }
  }

  async loadTitleSuggestions() {
    if (!this.currentDecision) return;

    this.isLoadingWorkshop = true;
    try {
      const result = await this.decisionService.getTitleSuggestions(
        this.currentDecision.id,
        { topic: this.userCtx.videoInProgressTopic, notes: this.userCtx.additionalNotes }
      );
      this.titleSuggestions = result.titles;
      this.titleReasoning = result.reasoning;
      // Pre-select first title
      if (result.titles.length > 0) {
        this.selectedTitle = result.titles[0];
        this.customTitle = result.titles[0];
      }
    } catch (err) {
      console.error('[NERRA] Title suggestions error:', err);
    } finally {
      this.isLoadingWorkshop = false;
    }
  }

  async evaluateTitle() {
    if (!this.currentDecision || !this.customTitle) return;

    this.isEvaluatingTitle = true;
    this.titleEvaluation = null;

    try {
      this.titleEvaluation = await this.decisionService.evaluateTitle(
        this.currentDecision.id,
        this.customTitle,
        { topic: this.userCtx.videoInProgressTopic, notes: this.userCtx.additionalNotes }
      );
    } catch (err) {
      console.error('[NERRA] Title evaluation error:', err);
    } finally {
      this.isEvaluatingTitle = false;
    }
  }

  async confirmTitle() {
    if (!this.currentDecision || !this.customTitle) return;

    // Sauvegarder le titre choisi dans la décision
    this.currentDecision.video_title = this.customTitle;

    // Passer à l'étape 4 et charger le brief miniature
    this.workshopStep = 4;
    this.saveWorkshopState();
    this.isLoadingWorkshop = true;
    try {
      this.thumbnailBrief = await this.decisionService.getThumbnailBrief(
        this.currentDecision.id,
        this.customTitle
      );
    } catch (err) {
      console.error('[NERRA] Thumbnail brief error:', err);
    } finally {
      this.isLoadingWorkshop = false;
    }
  }

  async confirmTitleSkipThumbnail() {
    if (!this.currentDecision || !this.customTitle) return;
    this.currentDecision.video_title = this.customTitle;
    this.workshopStep = 5;
    this.saveWorkshopState();
    this.discoverVideos();
  }

  async onThumbnailSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("L'image est trop volumineuse (max 10 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      this.uploadedThumbnailBase64 = e.target?.result as string;
      await this.evaluateUploadedThumbnail();
    };
    reader.readAsDataURL(file);
  }

  async evaluateUploadedThumbnail() {
    if (!this.currentDecision || !this.uploadedThumbnailBase64) return;

    this.isEvaluatingThumbnail = true;
    this.thumbnailEvaluation = null;

    try {
      this.thumbnailEvaluation = await this.decisionService.evaluateThumbnail(
        this.currentDecision.id,
        this.uploadedThumbnailBase64
      );
    } catch (err) {
      console.error('[NERRA] Thumbnail evaluation error:', err);
      alert("Erreur lors de l'évaluation de la miniature.");
    } finally {
      this.isEvaluatingThumbnail = false;
    }
  }

  async discoverVideos() {
    if (!this.currentDecision) return;
    this.isDiscoveringVideos = true;
    this.discoveredVideos = [];
    try {
      this.discoveredVideos = await this.decisionService.discoverRecentVideos(this.currentDecision.id);
      console.log('[NERRA] Discovered videos:', this.discoveredVideos);
    } catch (err) {
      console.error('[NERRA] Video discovery error:', err);
    } finally {
      this.isDiscoveringVideos = false;
    }
  }

  async linkDiscoveredVideo(video: any) {
    if (!this.currentDecision) return;
    this.videoUrl = video.id;
    await this.onLinkVideo();
  }

  extractVideoId(url: string): string | null {
    // youtube.com/watch?v=XXX
    const match1 = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match1) return match1[1];
    // youtu.be/XXX
    const match2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match2) return match2[1];
    // youtube.com/shorts/XXX
    const match3 = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match3) return match3[1];
    // If it's already a video ID (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
    return null;
  }

  async onLinkVideo() {
    if (!this.currentDecision || !this.videoUrl) return;

    const videoId = this.extractVideoId(this.videoUrl);
    if (!videoId) {
      this.linkMessage = 'Lien YouTube invalide. Formats acceptés : youtube.com/watch?v=..., youtu.be/..., ou un ID vidéo.';
      return;
    }

    this.isActioning = true;
    this.linkMessage = '';
    try {
      const result = await this.decisionService.linkVideo(
        this.currentDecision.id,
        videoId,
        this.currentDecision.video_title || undefined,
      );
      this.linkMessage = result.message;

      // Refresh to check if evaluation happened
      await this.loadDashboardData();
      const refreshed = this.decisionHistory.find((d) => d.id === this.currentDecision!.id);
      if (refreshed) {
        this.currentDecision = refreshed;
      }
    } catch (err) {
      console.error('[NERRA] Link video error:', err);
      this.linkMessage = 'Erreur lors de la liaison de la vidéo.';
    } finally {
      this.isActioning = false;
    }
  }

  getExperimentLabel(type: ExperimentType): string {
    return EXPERIMENT_LABELS[type] || type;
  }

  getMetricLabel(metric: string): string {
    return METRIC_LABELS[metric] || metric;
  }

  getMetricUnit(metric: string): string {
    switch (metric) {
      case 'engagement_rate':
      case 'ctr':
      case 'watch_time_30s':
        return '%';
      case 'views_7days':
      case 'avg_views':
        return 'vues';
      default:
        return '';
    }
  }

  getMetricPlaceholder(metric: string): string {
    switch (metric) {
      case 'engagement_rate':
        return 'Ex: 8.5';
      case 'ctr':
        return 'Ex: 4.2';
      case 'watch_time_30s':
        return 'Ex: 45';
      case 'views_7days':
      case 'avg_views':
        return 'Ex: 150';
      default:
        return 'Valeur mesurée';
    }
  }

  formatBaseline(value: number, metric: string): string {
    if (metric === 'engagement_rate') {
      return value.toFixed(2) + '%';
    }
    if (metric === 'ctr') {
      return value.toFixed(2) + '%';
    }
    if (metric === 'watch_time_30s') {
      // Si la valeur est < 1, c'est probablement un ratio (0.05 = 5%)
      if (value < 1) {
        return (value * 100).toFixed(1) + '%';
      }
      return value.toFixed(1) + '%';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k vues';
    }
    return Math.round(value).toLocaleString('fr-FR');
  }

  getBaselineContext(metric: string): string {
    switch (metric) {
      case 'engagement_rate':
        return 'Moyenne de vos 3 dernières vidéos';
      case 'ctr':
        return 'Taux de clic moyen récent';
      case 'watch_time_30s':
        return 'Rétention moyenne à 30s';
      case 'views_7days':
        return 'Moyenne de vos 3 dernières vidéos (7j)';
      case 'avg_views':
        return 'Moyenne de vos 3 dernières vidéos';
      default:
        return 'Basé sur votre historique récent';
    }
  }
}

