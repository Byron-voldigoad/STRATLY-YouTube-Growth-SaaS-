/**
 * NERRA — Decision Engine
 * Moteur décisionnel stratégique pour créateurs YouTube.
 *
 * Ce module gère :
 * - La génération de la prochaine décision (expérience)
 * - L'évaluation des résultats
 * - Le calcul du strategic_tension_score
 * - La gestion des modes ASSISTED / PILOT
 * - La gestion de la résistance (refus)
 * - Le protocole REBOOT (chaînes inactives > 90 jours)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { genkit, z } from "genkit";
import { google } from "googleapis";

// ─── Types ──────────────────────────────────────────────────────────

export type ExperimentType =
  | "TYPE_HOOK"
  | "TYPE_NICHE"
  | "TYPE_FORMAT"
  | "TYPE_TITRE"
  | "TYPE_MINIATURE"
  | "TYPE_FREQUENCE"
  | "TYPE_PIVOT";

export type DecisionVerdict = "VALIDATED" | "FAILED" | "PENDING" | "SKIPPED";
export type ChannelMode = "ASSISTED" | "PILOT";

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
  score: number; // 0-100
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
}

export interface RebootStatus {
  eligible: boolean;
  daysSinceLastVideo: number;
  recommendation: string | null;
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

// Mapping des métriques par type d'expérience
const EXPERIMENT_METRICS: Record<ExperimentType, string> = {
  TYPE_HOOK: "watch_time_30s",
  TYPE_NICHE: "views_7days",
  TYPE_FORMAT: "engagement_rate",
  TYPE_TITRE: "ctr",
  TYPE_MINIATURE: "ctr",
  TYPE_FREQUENCE: "avg_views",
  TYPE_PIVOT: "engagement_rate",
};

// ─── Helper ─────────────────────────────────────────────────────────

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * Calcule la baseline à partir des 3 dernières vidéos de même format / type.
 * Retourne null si pas assez de données exploitables.
 */
function calculateBaseline(
  videos: any[],
  targetMetric: string,
): number | null {
  if (!videos || videos.length < 2) return null;

  // Prendre les 3 dernières vidéos (les plus récentes)
  const recentVideos = videos.slice(0, 3);

  switch (targetMetric) {
    case "ctr": {
      // CTR n'est souvent pas disponible via l'API publique
      return null;
    }
    case "engagement_rate": {
      const rates = recentVideos
        .filter((v) => v.views > 0)
        .map((v) => ((v.likes || 0) + (v.comments || 0)) / v.views * 100);
      if (rates.length === 0) return null;
      const avg = rates.reduce((a, b) => a + b, 0) / rates.length;
      return Math.round(avg * 100) / 100; // Ex: 4.52 (%)
    }
    case "views_7days":
    case "avg_views": {
      const views = recentVideos
        .filter((v) => v.views > 0)
        .map((v) => v.views);
      if (views.length === 0) return null;
      return Math.round(views.reduce((a: number, b: number) => a + b, 0) / views.length);
    }
    case "watch_time_30s": {
      // watch_time_30s n'est pas directement disponible via l'API publique
      return null;
    }
    default:
      return null;
  }
}

// ─── Core Functions ─────────────────────────────────────────────────

/**
 * Détermine le mode actuel de la chaîne (ASSISTED ou PILOT)
 *
 * ASSISTED (défaut) : < 15 décisions vérifiées
 * PILOT : après 3 décisions VALIDATED consécutives
 * Downgrade vers ASSISTED après 2 FAILED consécutifs
 */
export async function getChannelMode(
  userId: string,
  channelId: string,
): Promise<ChannelModeInfo> {
  const supabase = getSupabase();

  // Compter les décisions vérifiées (non PENDING)
  const { data: verifiedDecisions, error } = await supabase
    .from("decisions")
    .select("verdict, created_at")
    .eq("user_id", userId)
    .eq("channel_id", channelId)
    .neq("verdict", "PENDING")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const totalVerified = verifiedDecisions?.length || 0;

  // Si moins de 15 décisions vérifiées → ASSISTED
  if (totalVerified < 15) {
    return {
      mode: "ASSISTED",
      consecutiveValidated: 0,
      totalVerified,
      reason: `${totalVerified}/15 décisions vérifiées — mode ASSISTED`,
    };
  }

  // Vérifier les dernières décisions consécutives
  const verdicts = (verifiedDecisions || []).map((d) => d.verdict);

  // Compter les VALIDATED consécutifs depuis le début (les plus récents)
  let consecutiveValidated = 0;
  for (const v of verdicts) {
    if (v === "VALIDATED") consecutiveValidated++;
    else break;
  }

  // Compter les FAILED consécutifs depuis le début
  let consecutiveFailed = 0;
  for (const v of verdicts) {
    if (v === "FAILED") consecutiveFailed++;
    else break;
  }

  // Downgrade si 2 échecs consécutifs
  if (consecutiveFailed >= 2) {
    return {
      mode: "ASSISTED",
      consecutiveValidated: 0,
      totalVerified,
      reason: `${consecutiveFailed} échecs consécutifs — downgrade vers ASSISTED`,
    };
  }

  // PILOT si 3 validations consécutives
  if (consecutiveValidated >= 3) {
    return {
      mode: "PILOT",
      consecutiveValidated,
      totalVerified,
      reason: `${consecutiveValidated} validations consécutives — mode PILOT activé`,
    };
  }

  return {
    mode: "ASSISTED",
    consecutiveValidated,
    totalVerified,
    reason: `En attente de 3 validations consécutives (${consecutiveValidated}/3)`,
  };
}

/**
 * Calcule le strategic_tension_score.
 * Plus le score est haut (0-100), plus la chaîne a des leviers ignorés.
 */
export async function calculateStrategicTensionScore(
  userId: string,
  channelId: string,
): Promise<TensionScore> {
  const supabase = getSupabase();

  // Récupérer toutes les décisions de la chaîne
  const { data: decisions, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("user_id", userId)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const allDecisions = (decisions || []) as Decision[];
  const totalDecisions = allDecisions.length;

  // Compter par verdict
  const validatedCount = allDecisions.filter(
    (d) => d.verdict === "VALIDATED",
  ).length;
  const failedCount = allDecisions.filter(
    (d) => d.verdict === "FAILED",
  ).length;
  const skippedCount = allDecisions.filter(
    (d) => d.verdict === "SKIPPED",
  ).length;

  // Leviers résistés (is_resistance_confirmed = true)
  const resistedLevers = allDecisions
    .filter((d) => d.is_resistance_confirmed)
    .map((d) => ({
      experiment_type: d.experiment_type,
      hypothesis: d.hypothesis,
      created_at: d.created_at,
    }));

  // Score = (leviers résistés + skipped) / total * 100
  const resistanceWeight = resistedLevers.length * 15; // Chaque résistance pèse lourd
  const skippedWeight = skippedCount * 5;
  const failedWeight = failedCount * 2;
  const score = Math.min(
    100,
    totalDecisions > 0
      ? Math.round(
          (resistanceWeight + skippedWeight + failedWeight) /
            Math.max(totalDecisions, 1),
        )
      : 0,
  );

  return {
    score,
    resistedLevers,
    totalDecisions,
    validatedCount,
    failedCount,
    skippedCount,
  };
}

/**
 * Gère un refus de recommandation.
 * Escalade en 3 niveaux :
 * 1er refus → reformulation (on regénère)
 * 2ème refus → marque tension_score en rouge
 * 3ème refus → résistance confirmée
 */
export async function handleResistance(
  decisionId: string,
): Promise<{ level: number; message: string; newDecisionId?: string }> {
  const supabase = getSupabase();

  // Récupérer la décision actuelle
  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  const currentCount = (decision.resistance_count || 0) + 1;

  if (currentCount >= 3) {
    // 3ème refus → résistance confirmée, verdict SKIPPED
    await supabase
      .from("decisions")
      .update({
        resistance_count: currentCount,
        is_resistance_confirmed: true,
        verdict: "SKIPPED",
      })
      .eq("id", decisionId);

    return {
      level: 3,
      message:
        "Levier marqué comme résistance confirmée. Placé dans le tableau des leviers non utilisés.",
    };
  }

  // 1er ou 2ème refus → incrémenter le compteur
  await supabase
    .from("decisions")
    .update({
      resistance_count: currentCount,
    })
    .eq("id", decisionId);

  if (currentCount === 1) {
    return {
      level: 1,
      message:
        "Nerra reformule la recommandation avec un angle différent.",
    };
  }

  // 2ème refus
  return {
    level: 2,
    message:
      "Attention : votre strategic_tension_score augmente. Ce levier est identifié comme un frein à votre croissance.",
  };
}

/**
 * Évalue une décision après publication de la vidéo.
 * Compare baseline_value vs result_value pour rendre un verdict.
 */
export async function evaluateDecision(
  decisionId: string,
  resultValue: number,
): Promise<{ verdict: DecisionVerdict; improvement: number }> {
  const supabase = getSupabase();

  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  const baseline = decision.baseline_value || 0;
  const improvement =
    baseline > 0 ? ((resultValue - baseline) / baseline) * 100 : 0;

  // Verdict : validé si amélioration >= 5%
  const verdict: DecisionVerdict = improvement >= 5 ? "VALIDATED" : "FAILED";

  // Ajuster le confidence_score
  const currentConfidence = decision.confidence_score || 0.5;
  const newConfidence =
    verdict === "VALIDATED"
      ? Math.min(1.0, currentConfidence + 0.05)
      : Math.max(0.1, currentConfidence - 0.03);

  await supabase
    .from("decisions")
    .update({
      result_value: resultValue,
      verdict,
      confidence_score: newConfidence,
      evaluated_at: new Date().toISOString(),
    })
    .eq("id", decisionId);

  return { verdict, improvement: Math.round(improvement * 100) / 100 };
}

/**
 * Vérifie si la chaîne est éligible au protocole REBOOT
 * (inactive > 90 jours)
 */
export async function checkRebootEligibility(
  userId: string,
  channelId: string,
): Promise<RebootStatus> {
  const supabase = getSupabase();

  // Récupérer la dernière vidéo publiée
  const { data: videos, error } = await supabase
    .from("video_analytics")
    .select("published_at")
    .eq("user_id", userId)
    .eq("channel_id", channelId)
    .order("published_at", { ascending: false })
    .limit(1);

  if (error) throw error;

  if (!videos || videos.length === 0) {
    return {
      eligible: true,
      daysSinceLastVideo: 999,
      recommendation:
        "Aucune vidéo détectée. Protocole REBOOT recommandé : publiez 2 vidéos rapides cette semaine.",
    };
  }

  const lastPublished = new Date(videos[0].published_at);
  const daysSince = Math.floor(
    (Date.now() - lastPublished.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSince > 90) {
    return {
      eligible: true,
      daysSinceLastVideo: daysSince,
      recommendation: `Chaîne inactive depuis ${daysSince} jours. Protocole REBOOT activé : 1 vidéo courte trending + 1 format classique cette semaine.`,
    };
  }

  return {
    eligible: false,
    daysSinceLastVideo: daysSince,
    recommendation: null,
  };
}

/**
 * Récupère l'historique des décisions de la chaîne.
 */
export async function getDecisionHistory(
  userId: string,
  channelId: string,
  limit: number = 20,
): Promise<Decision[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("user_id", userId)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as Decision[];
}

/**
 * Accepte une décision proposée.
 */
export async function acceptDecision(decisionId: string): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from("decisions")
    .update({
      accepted_at: new Date().toISOString(),
    })
    .eq("id", decisionId);
}

/**
 * Génère la prochaine décision pour la chaîne.
 * C'est le cœur du moteur Nerra.
 *
 * Utilise :
 * - L'historique des décisions passées
 * - Les données de la chaîne (vidéos, stats)
 * - Le mode actuel (ASSISTED/PILOT)
 * - Le protocole REBOOT si applicable
 * - Les insights de l'audit IA (si disponibles)
 * - Le contexte utilisateur (vidéo en cours, etc.)
 */
export async function generateNextDecision(
  ai: ReturnType<typeof genkit>,
  userId: string,
  channelId: string,
  auditInsights?: AuditInsights,
  userContext?: UserContext,
): Promise<Decision> {
  const supabase = getSupabase();

  // 1. Vérifier le protocole REBOOT
  const rebootStatus = await checkRebootEligibility(userId, channelId);

  // 2. Récupérer le mode actuel
  const modeInfo = await getChannelMode(userId, channelId);

  // 3. Récupérer l'historique des décisions
  const history = await getDecisionHistory(userId, channelId, 50);

  // 4. Récupérer les données de la chaîne
  const { data: videos } = await supabase
    .from("video_analytics")
    .select("*")
    .eq("user_id", userId)
    .eq("channel_id", channelId)
    .order("published_at", { ascending: false })
    .limit(30);

  const { data: channelStats } = await supabase
    .from("channel_analytics")
    .select("*")
    .eq("user_id", userId)
    .eq("channel_id", channelId)
    .order("date", { ascending: false })
    .limit(1);

  // 5. Construire le contexte pour le LLM
  const historyContext =
    history.length > 0
      ? history
          .slice(0, 10)
          .map(
            (d) =>
              `- [${d.experiment_type}] "${d.hypothesis}" → ${d.verdict}`,
          )
          .join("\n")
      : "Aucun historique — première décision.";

  // Contexte vidéo enrichi avec métriques réelles
  const videoContext =
    videos && videos.length > 0
      ? videos
          .slice(0, 15)
          .map((v: any) => {
            const engRate = v.views > 0
              ? (((v.likes || 0) + (v.comments || 0)) / v.views * 100).toFixed(2)
              : "0";
            return `- "${v.video_title}" | ${v.views} vues | ${v.likes || 0} likes | ${v.comments || 0} commentaires | engagement: ${engRate}% | publié: ${v.published_at}`;
          })
          .join("\n")
      : "Aucune vidéo importée.";

  const statsContext =
    channelStats && channelStats.length > 0
      ? `Abonnés: ${channelStats[0].subscribers}, Vues totales: ${channelStats[0].total_views}, Vidéos: ${channelStats[0].total_videos}`
      : "Stats non disponibles.";

  // Contexte de l'audit IA (si provenant de la page AI Insights)
  const auditContext = auditInsights
    ? `
RÉSULTATS DE L'AUDIT IA — TU DOIS BASER TA DÉCISION SUR CES DONNÉES :
- Statut chaîne : ${auditInsights.channelStatus} — ${auditInsights.statusExplanation}
- Engagement moyen : ${auditInsights.engagement.toFixed(2)}%
- Tendance : ${auditInsights.trend}

RECOMMANDATIONS STRATÉGIQUES DE L'AUDIT (TOUTES doivent être prises en compte) :
- Action principale : "${auditInsights.recommendedAction}"
- Preuve : "${auditInsights.recommendedProof}"
${auditInsights.recommendedNextStep ? `- Prochaine étape recommandée : "${auditInsights.recommendedNextStep}"` : ""}

VIDÉOS DE RÉFÉRENCE (TU DOIS citer au moins 2 de ces vidéos dans ton raisonnement) :
- Vidéos qui marchent : ${auditInsights.patternsToRepeat.map((p) => `"${p.videoTitle}" → ${p.reason}`).join(" | ") || "Aucun"}
- Vidéos qui ne marchent pas : ${auditInsights.patternsToAvoid.map((p) => `"${p.videoTitle}" → ${p.reason}`).join(" | ") || "Aucun"}

RÈGLES DE COHÉRENCE OBLIGATOIRES :
1. Si l'audit mentionne les miniatures → ta décision DOIT inclure les miniatures.
2. Si l'audit mentionne les titres → ta décision DOIT inclure les titres.
3. Si l'audit cite des vidéos performantes → tu DOIS les citer dans ai_reasoning avec leurs métriques exactes.
4. NE CONTREDIS JAMAIS l'audit. Ta décision est le prolongement opérationnel de l'audit.`
    : "";

  // Contexte utilisateur (vidéo en cours)
  const userCtxBlock = userContext?.hasVideoInProgress
    ? `
CONTEXTE UTILISATEUR :
L'utilisateur a une vidéo en préparation : "${userContext.videoInProgressTitle || "Sans titre"}"
Sujet : "${userContext.videoInProgressTopic || "Non précisé"}"
${userContext.additionalNotes ? `Notes : "${userContext.additionalNotes}"` : ""}
IMPORTANT : Adapte ta décision pour qu'elle puisse s'appliquer à cette vidéo en cours. Ne propose PAS de changer de sujet si l'utilisateur a déjà un contenu en production.`
    : "";

  // Types déjà expérimentés récemment
  const recentTypes = history
    .filter((d) => d.verdict !== "SKIPPED")
    .slice(0, 5)
    .map((d) => d.experiment_type);

  // Types résistés (à éviter dans les suggestions)
  const resistedTypes = history
    .filter((d) => d.is_resistance_confirmed)
    .map((d) => d.experiment_type);

  const DecisionOutputSchema = z.object({
    experiment_type: z.enum([
      "TYPE_HOOK",
      "TYPE_NICHE",
      "TYPE_FORMAT",
      "TYPE_TITRE",
      "TYPE_MINIATURE",
      "TYPE_FREQUENCE",
      "TYPE_PIVOT",
    ]),
    hypothesis: z.string(),
    variable: z.string(),
    target_metric: z.string(),
    cited_videos: z.array(z.object({
      title: z.string().describe("Titre exact de la vidéo depuis l'audit"),
      metric: z.string().describe("Ex: 20% d'engagement, 100 vues"),
    })).describe("Tu DOIS extraire ici au moins 2 vidéos spécifiques de l'audit pour justifier ta décision."),
    ai_reasoning: z.string().describe("Raisonnement qui INCLUT OBLIGATOIREMENT le nom et chiffre des vidéos extraites dans cited_videos."),
  });

  const { output } = await ai.generate({
    model: "openai/llama-3.3-70b-versatile",
    system: `Tu es NERRA, un système de pilotage stratégique YouTube. Tu ne suggères pas — tu DÉCIDES.

RÈGLES ABSOLUES :
1. Tu proposes UNE SEULE expérience avec UNE SEULE variable modifiée.
2. Tu REFUSES les protocoles multi-variables.
3. Tu bases ta décision sur l'historique des résultats réels, pas sur l'intuition.
4. Chaque décision doit avoir une hypothèse claire et mesurable.
5. Tu utilises les métriques standardisées : watch_time_30s, views_7days, engagement_rate, ctr, avg_views.
6. RENVOIE UNIQUEMENT DU JSON VALIDE. Aucun texte avant ou après.
7. ⚠️ RÈGLE ANTI-HALLUCINATION : Si les vidéos récentes sont de format 'clip' (Shorts), TU AS L'INTERDICTION ABSOLUE de proposer "TYPE_MINIATURE" ou de mentionner le mot "miniature". Les Shorts n'ont pas de miniatures. Concentre-toi sur "TYPE_HOOK" ou "TYPE_FORMAT".

RÈGLE CRITIQUE — CITATIONS OBLIGATOIRES (NON NÉGOCIABLE) :
Dans le champ "ai_reasoning", tu DOIS OBLIGATOIREMENT :
- Citer au moins 2 vidéos SPÉCIFIQUES de la chaîne par leur TITRE EXACT entre guillemets
- Pour chaque vidéo citée, donner le taux d'engagement EXACT (ex: 20.5%) OU le nombre de vues EXACT
- Comparer les performances CHIFFRÉES entre les vidéos pour justifier ta décision
- Si l'audit fournit des données (patterns à répéter/éviter), tu DOIS les reprendre mot pour mot

EXEMPLE VALIDE :
"Ta vidéo 'Kuroko no basket last game AMV' affiche un engagement de 20% contre 0% pour 'AMV Tokyo revenger'. Le format AMV sport/action performe 20x mieux. En appliquant une miniature personnalisée (comme recommandé par l'audit), on peut viser un CTR supérieur."

EXEMPLE INVALIDE (REJETÉ) :
"Les AMV sont un format populaire sur ta chaîne" → TROP VAGUE, pas de vidéo spécifique, pas de chiffre.

MODE ACTUEL : ${modeInfo.mode}
${modeInfo.mode === "PILOT" ? "En mode PILOT, tu IMPOSES une décision unique. Pas de suggestion, pas d'option." : "En mode ASSISTED, tu formules une hypothèse que l'utilisateur peut accepter ou refuser."}

${rebootStatus.eligible ? `⚠️ PROTOCOLE REBOOT ACTIVÉ : Chaîne inactive depuis ${rebootStatus.daysSinceLastVideo} jours. Propose une expérience de réactivation rapide basée sur un format qui a déjà fonctionné pour cette chaîne (cite la vidéo).` : ""}`,
    prompt: `Génère la prochaine décision stratégique pour cette chaîne YouTube.

STATS CHAÎNE :
${statsContext}

DERNIÈRES VIDÉOS (avec métriques réelles) :
${videoContext}

HISTORIQUE DES DÉCISIONS (les plus récentes en premier) :
${historyContext}

TYPES RÉCEMMENT TESTÉS (éviter la répétition) : ${recentTypes.join(", ") || "Aucun"}
TYPES RÉSISTÉS (l'utilisateur a refusé 3 fois) : ${resistedTypes.join(", ") || "Aucun"}
${auditContext}
${userCtxBlock}

CONTRAINTES :
- Ne propose PAS un type déjà résisté sauf si c'est absolument critique.
- Varie les types d'expériences pour couvrir tous les leviers de croissance.
- Le ai_reasoning DOIT citer des vidéos spécifiques avec leurs métriques réelles (vues, engagement). PAS de généralités.
${auditInsights ? "- Ta décision DOIT être alignée avec les conclusions de l'audit IA ci-dessus." : ""}
${userContext?.hasVideoInProgress ? "- Adapte la décision à la vidéo en cours de préparation." : ""}`,
    output: {
      format: "json",
      schema: DecisionOutputSchema,
    },
    config: {
      temperature: 0.2,
      // @ts-ignore
      response_format: { type: "json_object" },
    },
  });

  if (!output) {
    throw new Error("Le modèle IA n'a pas généré de décision.");
  }

  // 6. Calculer la baseline à partir des données réelles
  const computedBaseline = calculateBaseline(
    videos || [],
    output.target_metric,
  );

  // 7. Persister la décision dans Supabase
  const newDecision = {
    user_id: userId,
    channel_id: channelId,
    experiment_type: output.experiment_type,
    hypothesis: output.hypothesis,
    variable: output.variable,
    target_metric: output.target_metric,
    baseline_value: computedBaseline,
    ai_reasoning: output.ai_reasoning,
    mode: modeInfo.mode,
    confidence_score: 0.5,
    verdict: "PENDING" as DecisionVerdict,
    resistance_count: 0,
    is_resistance_confirmed: false,
  };

  const { data: inserted, error } = await supabase
    .from("decisions")
    .insert(newDecision)
    .select()
    .single();

  if (error) throw error;

  console.log(
    `[NERRA] Decision generated: ${output.experiment_type} — "${output.hypothesis}"`,
  );

  return inserted as Decision;
}

// ─── Post-Acceptance: Concept Workshop ──────────────────────────────

/**
 * Génère 3 suggestions de concepts/idées de vidéos pour une décision acceptée.
 * Utilise les tendances YouTube pour identifier les opportunités haute demande / faible concurrence.
 */
export async function generateVideoConcepts(
  ai: ReturnType<typeof genkit>,
  decisionId: string,
  userNotes?: string
): Promise<{ concepts: { idea: string; marketInsight: string }[]; reasoning: string }> {
  const supabase = getSupabase();

  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  // Récupérer les tendances YouTube pour identifier les opportunités
  const apiKey = process.env.YOUTUBE_API_KEY;
  let trendData: any[] = [];
  if (apiKey) {
    const searchQuery = userNotes || decision.hypothesis;
    trendData = await fetchNicheTrends(searchQuery, apiKey);
  }

  const ConceptOutputSchema = z.object({
    concepts: z.array(z.object({
      idea: z.string().describe("L'idée de vidéo concrète et spécifique"),
      marketInsight: z.string().describe("Pourquoi c'est une opportunité : demande VS concurrence. Ex: 'Ce sujet a 50k+ recherches/mois mais seulement 3 vidéos de qualité existantes'"),
    })).length(3),
    reasoning: z.string().describe("Raisonnement global sur les opportunités de la niche"),
  });

  const { output } = await ai.generate({
    model: "openai/llama-3.3-70b-versatile",
    system: `Tu es NERRA, un producteur stratégique YouTube.
Tu génères EXACTEMENT 3 concepts de vidéos en te basant sur les DONNÉES DE TENDANCES YouTube fournies.

RÈGLES :
1. Chaque concept doit cibler une opportunité : forte demande + peu de concurrence de qualité.
2. Analyse les tendances fournies : quels sujets marchent ? Quels angles sont saturés ? Quels sous-sujets sont sous-exploités ?
3. Pour chaque concept, fournis un 'marketInsight' expliquant POURQUOI c'est une opportunité (ex: "Les vidéos sur X font 500k+ vues mais aucune ne couvre l'angle Y").
4. Adapte le format au type de décision (clip/Short = concepts visuels rapides, vidéo longue = contenu dense).
5. Sois ULTRA spécifique. Pas "Une vidéo sur l'anime" mais "Un edit de 30s comparant la puissance de Jinwoo saison 1 vs saison 2".
6. RENVOIE UNIQUEMENT DU JSON VALIDE.`,
    prompt: `Génère 3 idées de vidéos en exploitant les tendances marché.

DÉCISION STRATÉGIQUE :
- Hypothèse : "${decision.hypothesis}"
- Type : ${decision.experiment_type}

${userNotes ? `NOTES UTILISATEUR : "${userNotes}"` : ""}

TENDANCES YOUTUBE (vidéos les plus performantes de la niche) :
${trendData.length > 0
  ? trendData.map((v: any) => {
    const eng = v.views > 0 ? (((v.likes || 0) + (v.comments || 0)) / v.views * 100).toFixed(1) : "0";
    return `- "${v.title}" (${v.views.toLocaleString()} vues, ${eng}% engagement, chaîne: ${v.channelTitle})`;
  }).join("\n")
  : "Données non disponibles — base tes propositions sur ta connaissance du marché."
}

Propose 3 concepts qui exploitent des TROUS dans le marché : sujets recherchés mais mal couverts.`,
    output: { format: "json", schema: ConceptOutputSchema },
    config: { temperature: 0.8 },
  });

  if (!output) throw new Error("Échec de la génération de concepts");

  return { concepts: output.concepts, reasoning: output.reasoning };
}

/**
 * Évalue un concept/idée de vidéo personnalisé proposé par l'utilisateur.
 * Compare l'idée aux tendances YouTube pour valider le potentiel marché.
 */
export async function evaluateVideoConcept(
  ai: ReturnType<typeof genkit>,
  decisionId: string,
  concept: string,
): Promise<{ score: number; feedback: string }> {
  const supabase = getSupabase();

  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  // Récupérer les tendances pour comparer l'idée au marché
  const apiKey = process.env.YOUTUBE_API_KEY;
  let trendData: any[] = [];
  if (apiKey) {
    // Utiliser l'hypothèse (plus large) comme query pour obtenir des tendances pertinentes
    const trendQuery = decision.hypothesis || concept;
    trendData = await fetchNicheTrends(trendQuery, apiKey);
  }

  const EvalSchema = z.object({
    score: z.number().min(1).max(10).describe("Note de 1 à 10"),
    feedback: z.string().describe("Feedback constructif en 2-3 phrases max, incluant l'analyse marché"),
  });

  const { output } = await ai.generate({
    model: "openai/llama-3.3-70b-versatile",
    system: `Tu es NERRA, un producteur stratégique YouTube.
On te soumet une idée de vidéo. Tu dois l'évaluer en fonction de la stratégie ET des données de marché.

RÈGLES :
1. Note de 1 à 10 (10 = idée avec fort potentiel marché et alignée avec la stratégie).
2. Dans ton feedback, mentionne OBLIGATOIREMENT :
   - Si le sujet est demandé (vues des vidéos similaires dans les tendances)
   - Si le sujet est saturé ou peu couvert
   - Ce qui manque pour maximiser les chances
3. Sois direct et constructif.
4. Vérifie que l'idée correspond au FORMAT attendu (clip/Short vs vidéo longue).
5. RENVOIE UNIQUEMENT DU JSON VALIDE.`,
    prompt: `Évalue cette idée de vidéo :

IDÉE PROPOSÉE : "${concept}"

DÉCISION STRATÉGIQUE :
- Hypothèse : "${decision.hypothesis}"
- Type : ${decision.experiment_type}
- Variable : ${decision.variable}

TENDANCES YOUTUBE (marché actuel sur ce sujet) :
${trendData.length > 0
  ? trendData.map((v: any) => {
    const eng = v.views > 0 ? (((v.likes || 0) + (v.comments || 0)) / v.views * 100).toFixed(1) : "0";
    return `- "${v.title}" (${v.views.toLocaleString()} vues, ${eng}% eng.)`;
  }).join("\n")
  : "Données de tendances non disponibles."
}

L'idée est-elle une bonne opportunité marché ? Est-elle alignée avec la stratégie ?`,
    output: { format: "json", schema: EvalSchema },
    config: { temperature: 0.3 },
  });

  if (!output) throw new Error("Échec de l'évaluation");
  return { score: output.score, feedback: output.feedback };
}

// ─── Post-Acceptance: Brainstorm Workshop ───────────────────────────

/**
 * Développe un concept de vidéo avec l'utilisateur.
 * Génère un brief structuré avec intelligence musicale, ressources réelles YouTube,
 * et évaluation des notes utilisateur lors du raffinement.
 */
export async function brainstormConcept(
  ai: ReturnType<typeof genkit>,
  decisionId: string,
  concept: string,
  userNotes?: string,
): Promise<{
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
}> {
  const supabase = getSupabase();

  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  // Schema de base
  const baseFields: Record<string, any> = {
    scenes: z.array(z.string()).min(3).max(5).describe(
      "3 à 5 scènes. CHAQUE scène DOIT référencer un ÉPISODE ou MOMENT PRÉCIS (ex: 'Ép.10 S2 — Cha Hae-in tranche la tête de la Reine Fourmi, ralenti + flash'). INTERDICTION d'écrire 'montage de scènes d'action' sans préciser LESQUELLES."
    ),
    style: z.string().describe("Style de montage recommandé"),
    duration: z.string().describe("Durée recommandée"),
    musicDirection: z.string().describe("Analyse du genre musical : identifier le sous-genre exact et le mood"),
    musicSuggestions: z.array(z.object({
      name: z.string().describe("Nom EXACT du son (artiste - titre)"),
      reason: z.string().describe("Pourquoi ce son colle au montage — mentionne un moment précis du montage"),
    })).min(2).max(3).describe("2-3 sons du MÊME GENRE/SOUS-GENRE que celui mentionné par l'utilisateur"),
    hookSuggestion: z.string().describe("Comment capter l'attention dans les 3 premières secondes — un moment PRÉCIS de l'oeuvre"),
    refinedConcept: z.string().describe("Le concept reformulé et enrichi en une phrase"),
    searchQueries: z.array(z.string()).length(3).describe(
      "3 requêtes YouTube pour trouver du MATÉRIEL SOURCE (pas de concurrents). Ex: 'Solo Leveling S2 EP10 Cha Hae-in fight scene'"
    ),
    tutorialQueries: z.array(z.string()).length(2).describe(
      "2 requêtes YouTube pour trouver des TUTORIELS utiles. Ex: 'AMV editing tutorial after effects', 'anime edit smooth transitions'"
    ),
  };

  // Ajouter l'évaluation des notes si l'utilisateur en a fourni
  if (userNotes) {
    baseFields.notesEvaluation = z.object({
      score: z.number().min(1).max(10).describe("Note /10 sur la pertinence des suggestions de l'utilisateur"),
      feedback: z.string().describe("Avis en 2-3 phrases : ce qui est pertinent, ce qui peut être amélioré"),
    }).describe("Évaluation des notes/suggestions de l'utilisateur");
  }

  const BrainstormSchema = z.object(baseFields);

  const { output } = await ai.generate({
    model: "openai/llama-3.3-70b-versatile",
    system: `Tu es NERRA, un directeur créatif YouTube et music supervisor expert.

RÈGLES SCÈNES (CRUCIAL) :
1. Chaque scène DOIT référencer un ÉPISODE ou MOMENT PRÉCIS (ex: "Épisode 10 S2, combat contre Beru"). JAMAIS de descriptions vagues comme "montage de scènes d'action".
2. Inclus les timestamps (ex: 0-5s, 5-15s).

RÈGLES MUSIQUE (CRUCIAL — INTERDICTION DE CHANGER DE GENRE) :
3. Si l'utilisateur mentionne un son, IDENTIFIE le genre/sous-genre EXACT (ex: "Batidao = brazilian phonk/funk carioca").
4. Tes suggestions DOIVENT être du MÊME genre/sous-genre. INTERDIT de proposer du rock, orchestral ou EDM si l'utilisateur veut du phonk/funk.
   Ex: "Batidao" → propose "Loucura Letal", "MC GW - Montagem Coral", "DJ FKM - Automotivo" etc.
5. Pour chaque son, explique à quel moment PRÉCIS du montage il colle.

RÈGLES RESSOURCES :
6. Génère 3 requêtes YouTube pour MATÉRIEL SOURCE et 2 pour TUTORIELS techniques.
7. NE GÉNÈRE AUCUNE URL toi-même. Uniquement des REQUÊTES DE RECHERCHE.

${userNotes ? `RÈGLES ÉVALUATION DES NOTES :
8. L'utilisateur a fourni des suggestions. ÉVALUE-les avec une note /10 et un feedback.
9. Dis ce qui est pertinent et ce qui peut être amélioré.
10. INTÈGRE ses suggestions dans le plan raffiné.` : ""}

RENVOIE UNIQUEMENT DU JSON VALIDE.`,
    prompt: `Développe cette idée de vidéo en détail.

CONCEPT : "${concept}"

DÉCISION STRATÉGIQUE :
- Hypothèse : "${decision.hypothesis}"
- Type : ${decision.experiment_type}

${userNotes ? `NOTES/SUGGESTIONS DE L'UTILISATEUR (À ÉVALUER ET INTÉGRER) :\n"${userNotes}"` : "Aucune note."}

Plan de production avec scènes précises et suggestions musicales du MÊME GENRE.`,
    output: { format: "json", schema: BrainstormSchema },
    config: { temperature: 0.7 },
  });

  if (!output) throw new Error("Échec du brainstorm");

  // Rechercher les vidéos sources et tutoriels sur YouTube
  const apiKey = process.env.YOUTUBE_API_KEY;
  let resourceVideos: { title: string; url: string; thumbnailUrl: string; why: string }[] = [];
  let tutorialVideos: { title: string; url: string; thumbnailUrl: string }[] = [];

  if (apiKey) {
    // Vidéos sources (rushes)
    if (output.searchQueries?.length > 0) {
      try {
        const allResults: any[] = [];
        for (const query of output.searchQueries.slice(0, 3)) {
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=3&key=${apiKey}`;
          const res = await fetch(searchUrl);
          const data = await res.json();
          if (data.items) {
            allResults.push(...data.items.map((item: any) => ({
              title: item.snippet?.title || "",
              url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
              thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
              why: query,
            })));
          }
        }
        const seen = new Set<string>();
        resourceVideos = allResults.filter((v) => {
          if (seen.has(v.url)) return false;
          seen.add(v.url);
          return true;
        }).slice(0, 6);
      } catch (err) {
        console.error("[NERRA] Resource video search error:", err);
      }
    }

    // Tutoriels
    if ((output as any).tutorialQueries?.length > 0) {
      try {
        const tutResults: any[] = [];
        for (const query of (output as any).tutorialQueries.slice(0, 2)) {
          const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=2&key=${apiKey}`;
          const res = await fetch(searchUrl);
          const data = await res.json();
          if (data.items) {
            tutResults.push(...data.items.map((item: any) => ({
              title: item.snippet?.title || "",
              url: `https://www.youtube.com/watch?v=${item.id?.videoId}`,
              thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || "",
            })));
          }
        }
        const seen = new Set<string>();
        tutorialVideos = tutResults.filter((v) => {
          if (seen.has(v.url)) return false;
          seen.add(v.url);
          return true;
        }).slice(0, 4);
      } catch (err) {
        console.error("[NERRA] Tutorial search error:", err);
      }
    }
  }

  return {
    scenes: output.scenes,
    style: output.style,
    duration: output.duration,
    musicDirection: output.musicDirection,
    musicSuggestions: output.musicSuggestions || [],
    hookSuggestion: output.hookSuggestion,
    refinedConcept: output.refinedConcept,
    resourceVideos,
    tutorialVideos,
    notesEvaluation: (output as any).notesEvaluation || null,
  };
}

// ─── Post-Acceptance: Title Workshop ────────────────────────────────

/**
 * Génère 3 suggestions de titres pour une décision acceptée.
 * Se base sur l'hypothèse, les vidéos performantes, et le contexte utilisateur.
 */
export async function generateTitleSuggestions(
  ai: ReturnType<typeof genkit>,
  decisionId: string,
  userContext?: { topic?: string; notes?: string },
): Promise<{ titles: string[]; reasoning: string }> {
  const supabase = getSupabase();

  // Récupérer la décision
  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  // Récupérer le BENCHMARK GLOBAL YouTube sur ce sujet plutôt que l'historique de la chaîne
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY non configurée");
  const searchQuery = userContext?.topic || decision.video_title || decision.hypothesis;
  const benchmarkVideos = await fetchNicheTrends(searchQuery, apiKey);

  const TitleOutputSchema = z.object({
    titles: z.array(z.string()).length(3).describe("3 titres pour la vidéo"),
    reasoning: z.string().describe("Pourquoi ces titres fonctionneraient"),
  });

  const { output } = await ai.generate({
    model: "openai/llama-3.3-70b-versatile",
    system: `Tu es NERRA, un expert en titres YouTube optimisés pour le CTR.
Tu génères EXACTEMENT 3 propositions de titres pour une vidéo YouTube.

RÈGLES :
1. Chaque titre doit être accrocheur, court (< 60 caractères) et optimisé pour le CTR.
2. Varie les styles : un émotionnel, un descriptif, un clickbait maîtrisé.
3. Analyse attentivement la structure et les "Click Triggers" du BENCHMARK YOUTUBE fourni, ce sont les vidéos les plus performantes globalement sur ce sujet précis.
4. TU DOIS IMPÉRATIVEMENT CITER LES TITRES EXACTS du benchmark dans ton champ 'reasoning' pour justifier pourquoi tes propositions fonctionneront (ex: "J'ai utilisé la structure de la vidéo X qui a fait 1M vues...").
5. Intègre impérativement le contexte spécifique fourni par l'utilisateur.
6. RENVOIE UNIQUEMENT DU JSON VALIDE`,
    prompt: `Génère 3 titres pour cette vidéo.

DÉCISION ACCEPTÉE :
- Hypothèse : "${decision.hypothesis}"
- Type : ${decision.experiment_type}
- Variable testée : ${decision.variable}
${decision.video_title ? `- Titre actuel de la vidéo : "${decision.video_title}"` : ""}

CONTEXTE UTILISATEUR (TRÈS IMPORTANT) :
${userContext?.topic ? `- Sujet de la vidéo : "${userContext.topic}"` : "- Sujet non précisé"}
${userContext?.notes ? `- Notes supplémentaires : "${userContext.notes}"` : ""}

BENCHMARK YOUTUBE (Vidéos globales les plus performantes sur ce sujet) :
${benchmarkVideos.map((v: any) => {
  const eng = v.views > 0 ? (((v.likes || 0) + (v.comments || 0)) / v.views * 100).toFixed(1) : "0";
  return `- "${v.title}" (${v.views} vues, ${eng}% engagement)`;
}).join("\n")}

Génère 3 titres qui appliquent l'expérience décidée tout en s'inspirant fortement de la structure des titres du BENCHMARK et en respectant le contexte utilisateur.`,
    output: { format: "json", schema: TitleOutputSchema },
    config: { temperature: 0.7 },
  });

  if (!output) throw new Error("Échec de la génération de titres");

  return { titles: output.titles, reasoning: output.reasoning };
}

/**
 * Évalue un titre personnalisé proposé par l'utilisateur par rapport à la décision.
 */
export async function evaluateCustomTitle(
  ai: ReturnType<typeof genkit>,
  decisionId: string,
  title: string,
  userContext?: { topic?: string; notes?: string },
): Promise<{ score: number; feedback: string }> {
  const supabase = getSupabase();

  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  // Trouver les meilleures vidéos mondiales pour évaluer la concurrence
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY non configurée");
  const searchQuery = userContext?.topic || decision.video_title || decision.hypothesis;
  const benchmarkVideos = await fetchNicheTrends(searchQuery, apiKey);

  const EvalOutputSchema = z.object({
    score: z.number().describe("Score sur 10 de la pertinence du titre"),
    feedback: z.string().describe("Avis stratégique court et constructif sur le titre, et pourquoi il marche ou comment l'améliorer."),
  });

  const { output } = await ai.generate({
    model: "openai/llama-3.3-70b-versatile",
    system: `Tu es NERRA, une stratège de croissance YouTube d'élite et une experte en psychologie de l'audience. Ta mission est d'auditer le titre proposé avec une exigence maximale.
Ne sois pas simplement "gentille", sois stratégique. On n'est pas là pour faire une jolie vidéo, on est là pour dominer la niche.

RÈGLES D'AUDIT :
1. ANALYSE DU POINT FOCAL : Le titre doit immédiatement capturer l'intérêt. S'il est trop générique (ex: "My AMV"), c'est une erreur mortelle. Dis-le.
2. ALIGNEMENT STRATÉGIQUE : Le titre doit refléter parfaitement le SUJET et l'HYPOTHÈSE de l'expérience. Si l'utilisateur s'éloigne de son objectif, recadre-le.
3. BENCHMARK GLOBAL : Compare le titre à ce qui fonctionne ACTUELLEMENT sur YouTube dans cette niche. TU DOIS IMPÉRATIVEMENT CITER des titres exacts du benchmark pour appuyer ton argumentaire (ex: "La vidéo 'X' a fait 800k vues en utilisant cette structure...").
4. PSYCHOLOGIE : Cherche le "Click Trigger" (curiosité, émotion, urgence). S'il manque, le score doit être sévère mais le conseil doit être précis.
5. TON : Direct, pro, exigeant mais orienté résultats. 
RENVOIE UNIQUEMENT DU JSON VALIDE.`,
    prompt: `Voici le titre proposé par le créateur : "${title}"

DÉCISION À APPLIQUER :
- Type d'expérience : ${decision.experiment_type}
- Hypothèse : "${decision.hypothesis}"

CONTEXTE DE LA VIDÉO (TRÈS IMPORTANT) :
${userContext?.topic ? `- Sujet de la vidéo : "${userContext.topic}"` : "- Sujet non précisé"}
${userContext?.notes ? `- Notes : "${userContext.notes}"` : ""}

BENCHMARK YOUTUBE (Vidéos globales les plus performantes sur ce sujet) :
${benchmarkVideos.map((v: any) => `- "${v.title}" (${v.views} vues)`).join("\n") || "- Pas de données"}

Évalue ce titre en lui donnant une note sur 10. Assure-toi qu'il correspond bien au contexte de la vidéo. Donne un conseil pour l'optimiser si nécessaire en s'inspirant de CE QUI MARCHE GLOBALEMENT SUR YOUTUBE (cf: Benchmark).`,
    output: { format: "json", schema: EvalOutputSchema },
    config: { temperature: 0.5 },
  });

  if (!output) throw new Error("Échec de l'évaluation du titre");

  return output;
}

// ─── Post-Acceptance: Thumbnail Brief ───────────────────────────────

/**
 * Génère un brief créatif structuré pour la miniature de la vidéo.
 */
export async function generateThumbnailBrief(
  ai: ReturnType<typeof genkit>,
  decisionId: string,
  passedVideoTitle?: string
): Promise<{
  visualElements: string[];
  colorPalette: string[];
  textOverlay: string;
  composition: string;
  inspiration: string;
  generationPrompt: string;
  referencedVideos: { title: string; thumbnailUrl: string; views: number; engagement: string }[];
}> {
  const supabase = getSupabase();

  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  // Récupérer les vidéos de la chaîne pour identifier sa niche globale
  const { data: videos } = await supabase
    .from("video_analytics")
    .select("video_title")
    .eq("user_id", decision.user_id)
    .eq("channel_id", decision.channel_id)
    .limit(10);

  const allVideoTitles = (videos || []).map((v: any) => v.video_title).join(", ");

  // Récupérer le TOP 5 GLOBAL YouTube sur ce sujet pour l'inspiration
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY non configurée");
  
  const searchQuery = passedVideoTitle || decision.video_title || decision.hypothesis;
  const videoTitleContext = passedVideoTitle || decision.video_title;
  const benchmarkVideos = await fetchNicheTrends(searchQuery, apiKey);

  const BriefOutputSchema = z.object({
    visualElements: z.array(z.string()).describe("3-4 éléments visuels clés à inclure"),
    colorPalette: z.array(z.string()).describe("3 couleurs dominantes recommandées (noms en français)"),
    textOverlay: z.string().describe("Texte court à mettre sur la miniature, ou 'Aucun' si non recommandé. Analyse le BENCHMARK YOUTUBE pour décider (ex: nom de la musique, nom de l'anime, ou courte phrase d'accroche)."),
    composition: z.string().describe("Description de la composition visuelle recommandée"),
    inspiration: z.string().describe("Pourquoi ce brief fonctionne, basé sur le BENCHMARK YOUTUBE. IMPORTANT : cite les vidéos par leur titre EXACT. Ne modifie PAS les titres."),
    generationPrompt: z.string().describe("Un prompt en anglais détaillé pour générer cette image avec Midjourney ou DALL-E. Le prompt DOIT inclure les dimensions YouTube standard : 1280x720 pixels, ratio 16:9, orientation paysage (landscape). Si un texte est recommandé dans 'textOverlay', demande EXPLICITEMENT de l'intégrer à l'image (ex: with the text 'YOUR TEXT' written in bold typography). Le prompt doit correspondre au STYLE et à l'AMBIANCE réelle du contenu, PAS à une interprétation littérale du titre."),
  });

  const { output } = await ai.generate({
    model: "openai/llama-3.3-70b-versatile",
    system: `Tu es NERRA, une directrice artistique spécialisée en miniatures YouTube à fort CTR.

ÉTAPE PRÉALABLE OBLIGATOIRE — COMPRENDRE LE CONTENU :
Avant de créer le moindre brief, tu DOIS effectuer une analyse en 3 temps :

1. IDENTIFIER LA NICHE de la chaîne en analysant l'ensemble des titres de ses vidéos (AMV, gaming, vlogs, tutos, cuisine, etc.)
2. COMPRENDRE LE CONTENU RÉEL de la vidéo à illustrer :
   - Si le titre fait référence à une CHANSON (ex: "Animals" de Maroon 5, "Enemy" d'Imagine Dragons, "Thunder" de Gabry Ponte) → Rappelle-toi DE QUOI PARLE cette chanson. Ses paroles, son ambiance, son message émotionnel. Base ton brief sur ÇA.
   - Si le titre fait référence à un ANIME, un FILM ou une SÉRIE → Rappelle-toi l'univers, les personnages, le ton de cette œuvre.
   - Si le titre est descriptif → Comprends le sujet concret.
3. DÉFINIR L'AMBIANCE VISUELLE qui traduit fidèlement le contenu identifié à l'étape 2.

EXEMPLE DE RAISONNEMENT CORRECT :
- "Animals" de Maroon 5 → Les paroles parlent d'obsession, de désir, de chasse ("Baby I'm preying on you tonight, hunt you down eat you alive"). L'ambiance est SOMBRE, INTENSE, PRÉDATRICE → Brief : personnage au regard obsédant, éclairage rouge/noir, tension visuelle.
- "Enemy" d'Imagine Dragons → Les paroles parlent de conflit intérieur, de trahison, de combat ("Oh the misery, everybody wants to be my enemy"). L'ambiance est COMBATIVE, SOMBRE, PUISSANTE → Brief : personnage en posture de défi, contrastes violents, énergie explosive.
- "Thunder" de Gabry Ponte → Son électronique puissant, énergie de club, rythme intense → Brief : effets lumineux électriques, couleurs néon, dynamisme.

RÈGLES DE BRIEF :
1. Le brief doit refléter le VRAI contenu de la vidéo, pas une interprétation superficielle du titre
2. Sois CONCRET et ACTIONNABLE (pas de vague "utilisez des couleurs vives")
3. Le brief doit être réalisable avec Canva ou Photoshop
4. Privilégie la LISIBILITÉ MOBILE : peu d'éléments, un point focal clair, un contraste fort
5. Un VISAGE avec une émotion forte vaut 100x plus qu'une scène chargée de détails
6. Le prompt de génération IA doit produire un résultat cohérent avec la niche ET le contenu réel. N'oublie pas d'y inclure l'instruction d'écrire le texte (si tu as recommandé un textOverlay).
7. Le texte sur la miniature (textOverlay) DOIT s'inspirer de ce que font les MEILLEURES VIDÉOS CONCURRENTES (Benchmark YOUTUBE) listées ci-dessous. Ne mets pas un mot au hasard, observe les codes de ces vidéos.
8. Dans le champ 'inspiration', cite les vidéos concurrentes par leur TITRE EXACT.
9. RENVOIE UNIQUEMENT DU JSON VALIDE`,
    prompt: `Crée un brief miniature pour cette vidéo.

DÉCISION :
- Hypothèse : "${decision.hypothesis}"
- Type d'expérience : ${decision.experiment_type}
${videoTitleContext ? `- Titre choisi : "${videoTitleContext}"` : ""}

TOUS LES TITRES DE LA CHAÎNE (pour identifier la niche générale) :
${allVideoTitles}

BENCHMARK YOUTUBE (Meilleures vidéos globales pour ce sujet) :
${benchmarkVideos.map((v: any) => {
  const eng = v.views > 0 ? (((v.likes || 0) + (v.comments || 0)) / v.views * 100).toFixed(1) : "0";
  return `- "${v.title}" (${v.views} vues, ${eng}% engagement)`;
}).join("\n")}

INSTRUCTIONS (SUIS CET ORDRE) :
1. Identifie la NICHE de la chaîne à partir de tous les titres
2. Si le titre de la vidéo fait référence à une chanson, un anime ou une œuvre connue : rappelle-toi ses PAROLES, son THÈME et son AMBIANCE RÉELLE
3. Identifie le STYLE DE TEXTE (textOverlay) le plus performant en analysant le BENCHMARK YOUTUBE (ex: titre de l'œuvre, titre de la musique, ou aucun texte)
4. Crée le brief en t'appuyant sur cette compréhension réelle du contenu
5. Le prompt IA doit produire une image fidèle au thème RÉEL, pas au sens littéral du titre
6. Dans 'inspiration', cite les vidéos de référence du benchmark par leurs TITRES EXACTS`,
    output: { format: "json", schema: BriefOutputSchema },
    config: { temperature: 0.5 },
  });

  if (!output) throw new Error("Échec de la génération du brief miniature");

  // Construire la liste des vidéos de référence avec leurs miniatures depuis le benchmark
  const referencedVideos = benchmarkVideos.map((v: any) => {
    const eng = v.views > 0 ? (((v.likes || 0) + (v.comments || 0)) / v.views * 100).toFixed(1) : "0";
    return {
      title: v.title,
      thumbnailUrl: v.thumbnailUrl || "",
      views: v.views,
      engagement: `${eng}%`,
    };
  }).filter((v: any) => v.thumbnailUrl); // Ne garder que celles avec une miniature

  return { ...output, referencedVideos };
}

import { analyzeThumbnail, fetchNicheTrends } from "./youtubeAnalytics.js";

/**
 * Analyse une miniature (uploadée en base64) via Vision API puis Llama pour évaluer son alignement
 * avec l'hypothèse de la décision.
 */
export async function evaluateThumbnailBase64(
  ai: ReturnType<typeof genkit>,
  decisionId: string,
  base64Image: string,
): Promise<{ score: number; feedback: string }> {
  const supabase = getSupabase();
  const { data: decision, error } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (error || !decision) throw new Error("Décision introuvable");

  const EvalOutputSchema = z.object({
    score: z.number().describe("Score sur 10 de la qualité/cohérence de la miniature"),
    feedback: z.string().describe("Avis stratégique très pertinent fondé sur les éléments visuels de l'image (composition, texte, couleurs, ambiance) par rapport à l'hypothèse"),
  });

  try {
    const { output } = await ai.generate({
      model: "googleai/gemini-flash-latest",
      system: `Tu es NERRA, une directrice artistique et stratège YouTube obsédée par le CTR. Tu as des yeux bioniques pour détecter ce qui fera cliquer l'audience.
Ta mission est d'auditer la miniature importée avec une exigence de haut niveau. On ne cherche pas juste une "belle image", on cherche une machine à clics.

CRITÈRES D'OBLIGATION :
1. L'IMPACT MOBILE : Est-ce que le texte et le sujet sont lisibles sur un écran de smartphone de 5cm ? Si c'est trop chargé ou fragmenté, sanctionne sévérement.
2. LE POINT FOCAL : Y a-t-il un élément central puissant ? Sans point focal clair, le regard du spectateur glisse et la vidéo meurt.
3. ALIGNEMENT AVEC L'HYPOTHÈSE : La miniature doit être la preuve visuelle que l'hypothèse stratégique est appliquée.
4. ÉVITER LE GÉNÉRIQUE : Un simple screenshot brut est une paresse stratégique. Exige du texte stylisé, du contraste boosté et une identité AMV forte.
5. TON : Très exigeant, technique, sans compromis sur l'efficacité, mais toujours avec une solution pour réparer.
RENVOIE UNIQUEMENT DU JSON VALIDE.`,
      prompt: [
        { text: `DÉCISION À APPLIQUER :\n- Hypothèse : "${decision.hypothesis}"\n\nVoici la miniature (importée) :\nÉvalue cette miniature sur la base de ce que tu y vois. Est-ce qu'elle respecte l'hypothèse ? Est-elle optimisée pour YouTube (ex: bon contraste, texte lisible s'il y en a) ? Donne une note sur 10.` },
        { media: { url: base64Image } }
      ],
      output: { format: "json", schema: EvalOutputSchema },
      config: { temperature: 0.5 },
    });

    if (!output) throw new Error("Échec de l'évaluation de la miniature par Gemini (pas de réponse)");

    return output;
  } catch (genError: any) {
    console.error("[NERRA] Gemini Generation Error Details:", genError);
    throw new Error(`Erreur AI (${genError.status || "UNKNOWN"}): ${genError.message}`);
  }
}

// ─── Post-Acceptance: Link Video & Auto-Evaluate ────────────────────

/**
 * Lie un video_id YouTube à une décision et récupère les métriques 
 * pour une évaluation future automatique.
 */
export async function linkVideoToDecision(
  decisionId: string,
  videoId: string,
  videoTitle?: string,
): Promise<{ linked: boolean; message: string }> {
  const supabase = getSupabase();

  const { data: decision, error: fetchError } = await supabase
    .from("decisions")
    .select("*")
    .eq("id", decisionId)
    .single();

  if (fetchError || !decision) throw new Error("Décision introuvable");

  // Mettre à jour la décision avec le video_id
  const { error: updateError } = await supabase
    .from("decisions")
    .update({
      video_id: videoId,
      video_title: videoTitle || decision.video_title,
    })
    .eq("id", decisionId);

  if (updateError) throw updateError;

  // Vérifier si la vidéo existe déjà dans video_analytics
  const { data: existingVideo } = await supabase
    .from("video_analytics")
    .select("video_id, views, likes, comments")
    .eq("video_id", videoId)
    .maybeSingle();

  if (existingVideo && existingVideo.views > 0) {
    // La vidéo a déjà des stats → on peut évaluer immédiatement
    const engagementRate = existingVideo.views > 0
      ? ((existingVideo.likes || 0) + (existingVideo.comments || 0)) / existingVideo.views * 100
      : 0;

    const metricValue = getMetricValueForDecision(decision, existingVideo, engagementRate);

    if (metricValue !== null) {
      const result = await evaluateDecision(decisionId, metricValue);
      return {
        linked: true,
        message: `Vidéo liée et évaluée automatiquement ! Verdict : ${result.verdict} (${result.improvement > 0 ? "+" : ""}${result.improvement}%)`,
      };
    }
  }

  return {
    linked: true,
    message: "Vidéo liée avec succès. Nerra évaluera automatiquement les résultats lorsque suffisamment de données seront disponibles.",
  };
}

/**
 * Scanne les dernières vidéos publiées sur la chaîne de l'utilisateur
 * et cherche des correspondances avec la décision en cours.
 */
export async function discoverRecentVideos(decisionId: string) {
  const supabase = getSupabase();

  // 1. Récupérer la décision et le titre attendu
  const { data: decision, error: dError } = await supabase
    .from("decisions")
    .select("user_id, channel_id, video_title")
    .eq("id", decisionId)
    .single();

  if (dError || !decision) throw new Error("Décision introuvable");

  // 2. Récupérer les tokens YouTube du profil
  const { data: profile } = await supabase
    .from("profiles")
    .select("youtube_access_token, youtube_refresh_token")
    .eq("id", decision.user_id)
    .single();

  if (!profile?.youtube_refresh_token) {
    throw new Error("Compte YouTube non lié ou jeton manquant");
  }

  // 3. Initialiser le client YouTube
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  oauth2Client.setCredentials({
    access_token: profile.youtube_access_token,
    refresh_token: profile.youtube_refresh_token,
  });

  // Rafraîchir le token si nécessaire
  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  try {
    // 4. Lister les 5 dernières vidéos (activités de type upload)
    const res = await youtube.activities.list({
      mine: true,
      part: ["snippet", "contentDetails"],
      maxResults: 5,
    });

    const activities = res.data.items || [];
    const candidates = activities
      .filter(a => a.snippet?.type === "upload")
      .map(a => {
        const title = a.snippet?.title || "";
        const videoId = a.contentDetails?.upload?.videoId;
        const thumbnail = a.snippet?.thumbnails?.high?.url || a.snippet?.thumbnails?.default?.url;

        // Score de correspondance basique (insensible à la casse, inclusion)
        const expected = (decision.video_title || "").toLowerCase();
        const current = title.toLowerCase();
        let isMatch = false;

        if (expected && current) {
          isMatch = current.includes(expected) || expected.includes(current);
        }

        return {
          id: videoId,
          title,
          thumbnail,
          isMatch,
          publishedAt: a.snippet?.publishedAt
        };
      });

    return candidates;
  } catch (error: any) {
    console.error("[NERRA] YouTube Discovery Error:", error);
    throw new Error(`Erreur YouTube : ${error.message}`);
  }
}

/**
 * Extrait la valeur de métrique pertinente pour une décision donnée.
 */
function getMetricValueForDecision(
  decision: any,
  videoStats: any,
  engagementRate: number,
): number | null {
  switch (decision.target_metric) {
    case "engagement_rate":
      return engagementRate;
    case "views_7days":
    case "avg_views":
      return videoStats.views || null;
    case "ctr":
      // CTR pas accessible directement, on utilise l'engagement comme proxy
      return engagementRate;
    case "watch_time_30s":
      return null; // Pas accessible
    default:
      return videoStats.views || null;
  }
}
