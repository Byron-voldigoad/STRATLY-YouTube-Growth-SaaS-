import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

export const onboardingGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const supabase = inject(SupabaseService);

  try {
    const profile = await supabase.getProfile();
    
    // 1. Vérifier dans Supabase si l'utilisateur a une chaîne connectée
    if (!profile || !profile.youtube_channel_id) {
      return router.createUrlTree(['/onboarding']);
    }

    // 2. Vérifier dans la table ai_analyses si un audit existe
    const { data: analysisData } = await supabase.client
      .from('ai_analyses')
      .select('id')
      .eq('user_id', profile.id)
      .eq('channel_id', profile.youtube_channel_id)
      .eq('analysis_type', 'channel')
      .maybeSingle();

    if (!analysisData) {
      return router.createUrlTree(['/dashboard/ai-insights']);
    }

    // 3. Vérifier dans la table decisions si une décision est en statut PENDING ou ACCEPTED
    // (Une décision "en cours" a forcément le verdict PENDING, qu'elle soit acceptée ou non)
    const { data: decisionData } = await supabase.client
      .from('decisions')
      .select('id, verdict, accepted_at')
      .eq('user_id', profile.id)
      .eq('channel_id', profile.youtube_channel_id)
      .eq('verdict', 'PENDING')
      .limit(1);

    if (!decisionData || decisionData.length === 0) {
      return router.createUrlTree(['/dashboard/ai-insights'], {
        queryParams: { action: 'generate_decision' }
      });
    }

    // S'il a une chaîne, un audit, et une décision en cours -> On laisse passer vers /decision
    return true;
  } catch (error) {
    console.error('Onboarding guard error:', error);
    return true;
  }
};
