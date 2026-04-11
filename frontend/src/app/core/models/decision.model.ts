/**
 * NERRA — Decision Types & Interfaces
 * Modèles TypeScript pour le moteur décisionnel.
 */

export type ExperimentType =
  | 'TYPE_HOOK'
  | 'TYPE_NICHE'
  | 'TYPE_FORMAT'
  | 'TYPE_TITRE'
  | 'TYPE_MINIATURE'
  | 'TYPE_FREQUENCE'
  | 'TYPE_PIVOT';

export type DecisionVerdict = 'VALIDATED' | 'FAILED' | 'PENDING' | 'SKIPPED';
export type ChannelMode = 'ASSISTED' | 'PILOT';

export interface Decision {
  id: string;
  user_id: string;
  channel_id: string;
  experiment_type: ExperimentType;
  hypothesis: string;
  variable: string;
  target_metric: string;
  video_id: string | null;
  video_title: string | null;
  baseline_value: number | null;
  result_value: number | null;
  verdict: DecisionVerdict;
  confidence_score: number;
  mode: ChannelMode;
  resistance_count: number;
  is_resistance_confirmed: boolean;
  ai_reasoning: string | null;
  created_at: string;
  accepted_at: string | null;
  evaluated_at: string | null;
  updated_at: string;
}

export interface TensionScore {
  score: number;
  resistedLevers: Array<{
    experiment_type: ExperimentType;
    hypothesis: string;
    created_at: string;
  }>;
  totalDecisions: number;
  validatedCount: number;
  failedCount: number;
  skippedCount: number;
}

export interface ChannelModeInfo {
  mode: ChannelMode;
  consecutiveValidated: number;
  totalVerified: number;
  reason: string;
  reboot?: RebootStatus;
}

export interface RebootStatus {
  eligible: boolean;
  daysSinceLastVideo: number;
  recommendation: string | null;
}

export interface ResistanceResult {
  level: number;
  message: string;
  newDecisionId?: string;
}

export interface EvaluationResult {
  verdict: DecisionVerdict;
  improvement: number;
}

/** Résumé de l'audit IA transmis au moteur décisionnel */
export interface AuditInsights {
  channelStatus: string;
  statusExplanation: string;
  engagement: number;
  trend: string;
  patternsToRepeat: Array<{ videoTitle: string; reason: string }>;
  patternsToAvoid: Array<{ videoTitle: string; reason: string }>;
  recommendedAction: string;
  recommendedProof: string;
  recommendedNextStep?: string;
}

/** Contexte utilisateur (vidéo en cours, etc.) */
export interface UserContext {
  hasVideoInProgress: boolean;
  videoInProgressTitle?: string;
  videoInProgressTopic?: string;
  additionalNotes?: string;
}

/** Labels lisibles pour les types d'expériences */
export const EXPERIMENT_LABELS: Record<ExperimentType, string> = {
  TYPE_HOOK: 'Hook / Intro',
  TYPE_NICHE: 'Niche / Sujet',
  TYPE_FORMAT: 'Format',
  TYPE_TITRE: 'Titre',
  TYPE_MINIATURE: 'Miniature',
  TYPE_FREQUENCE: 'Fréquence',
  TYPE_PIVOT: 'Pivot Stratégique',
};

/** Métriques associées à chaque type */
export const EXPERIMENT_METRICS: Record<ExperimentType, string> = {
  TYPE_HOOK: 'watch_time_30s',
  TYPE_NICHE: 'views_7days',
  TYPE_FORMAT: 'engagement_rate',
  TYPE_TITRE: 'ctr',
  TYPE_MINIATURE: 'ctr',
  TYPE_FREQUENCE: 'avg_views',
  TYPE_PIVOT: 'engagement_rate',
};

/** Labels lisibles pour les métriques */
export const METRIC_LABELS: Record<string, string> = {
  watch_time_30s: 'Rétention à 30s',
  views_7days: 'Vues à 7 jours',
  engagement_rate: "Taux d'engagement",
  ctr: 'Taux de clic (CTR)',
  avg_views: 'Vues moyennes',
};

/** Couleurs pour les verdicts */
export const VERDICT_COLORS: Record<DecisionVerdict, string> = {
  VALIDATED: '#10b981',
  FAILED: '#ef4444',
  PENDING: '#6366f1',
  SKIPPED: '#94a3b8',
};
