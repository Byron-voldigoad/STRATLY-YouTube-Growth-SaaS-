-- Corrige l'alerte Supabase : vue channel_tension en SECURITY DEFINER
-- Passe en security_invoker pour appliquer le RLS de l'utilisateur qui interroge.

DROP VIEW IF EXISTS public.channel_tension;

CREATE OR REPLACE VIEW public.channel_tension
WITH (security_invoker = true)
AS
SELECT
  user_id,
  channel_id,
  LEAST(100, ROUND(
    (
      (COUNT(CASE WHEN is_resistance_confirmed = true THEN 1 END) * 15) +
      (COUNT(CASE WHEN verdict = 'SKIPPED' THEN 1 END) * 5) +
      (COUNT(CASE WHEN verdict = 'FAILED' THEN 1 END) * 2)
    )::numeric /
    NULLIF(COUNT(*), 0)
  )) AS tension_score,
  COUNT(*) AS total_decisions,
  COUNT(CASE WHEN verdict = 'VALIDATED' THEN 1 END) AS validated_count
FROM public.decisions
GROUP BY user_id, channel_id;

NOTIFY pgrst, 'reload schema';
