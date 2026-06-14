/**
 * decision-status.util.ts
 *
 * Traduit le statut brut d'une décision (depuis la DB) en statut visuel
 * exploitable dans l'interface utilisateur (label + classe CSS).
 *
 * Statuts couverts :
 *  - PENDING  + video_id nul  → EN ATELIER   (la vidéo est en cours de création)
 *  - PENDING  + video_id set  → EN ÉVALUATION (la vidéo est en ligne, on attend les stats)
 *  - VALIDATED                → SUCCÈS
 *  - FAILED                   → ÉCHEC
 *  - Tout autre cas           → IGNORÉE
 */

export interface DecisionUIStatus {
  label: string;
  colorClass: string;
}

export function getDecisionUIStatus(decision: any): DecisionUIStatus {
  if (decision.verdict === 'PENDING') {
    if (decision.video_id) {
      // La vidéo a été publiée — on attend les métriques
      return { label: 'EN ÉVALUATION', colorClass: 'bg-blue-100 text-blue-700' };
    }
    // Pas encore de vidéo publiée — atelier en cours
    return { label: 'EN ATELIER', colorClass: 'bg-amber-100 text-amber-700' };
  }

  if (decision.verdict === 'VALIDATED') {
    return { label: 'SUCCÈS', colorClass: 'bg-green-100 text-green-700' };
  }

  if (decision.verdict === 'FAILED') {
    return { label: 'ÉCHEC', colorClass: 'bg-red-100 text-red-700' };
  }

  // SKIPPED ou tout autre verdict non reconnu
  return { label: 'IGNORÉE', colorClass: 'bg-slate-100 text-slate-700' };
}
