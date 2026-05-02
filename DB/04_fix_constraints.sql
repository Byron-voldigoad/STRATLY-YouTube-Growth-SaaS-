-- =============================================================
-- NERRA — Base de données Supabase
-- Correctifs : Ajout des contraintes et sécurité manquantes
-- =============================================================

-- 1. EMPECHER LE VOL DE CHAINE YOUTUBE
-- Ajoute une contrainte UNIQUE sur youtube_channel_id pour s'assurer
-- qu'un seul compte utilisateur puisse lier une chaîne spécifique.
ALTER TABLE public.profiles 
  ADD CONSTRAINT unique_youtube_channel UNIQUE (youtube_channel_id);


-- 2. CORRECTION DE LA VUE CHANNEL_TENSION (VALIDEE vs VALIDATED)
-- La table limitait à 'VALIDATED' mais la vue cherchait 'VALIDEE'
DROP VIEW IF EXISTS channel_tension;
CREATE OR REPLACE VIEW channel_tension AS
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
FROM decisions
GROUP BY user_id, channel_id;


-- 3. APPLICATION DES POLITIQUES RLS SUR LES TABLES NON PROTÉGÉES
-- Active la sécurité pour empêcher les accès non autorisés via le client frontal.

-- ai_analyses
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own ai_analyses" ON public.ai_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ai_analyses" ON public.ai_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ai_analyses" ON public.ai_analyses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- channel_analytics
ALTER TABLE public.channel_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own channel_analytics" ON public.channel_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own channel_analytics" ON public.channel_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own channel_analytics" ON public.channel_analytics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- content_suggestions
ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own content_suggestions" ON public.content_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own content_suggestions" ON public.content_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own content_suggestions" ON public.content_suggestions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- growth_plans
ALTER TABLE public.growth_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own growth_plans" ON public.growth_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own growth_plans" ON public.growth_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own growth_plans" ON public.growth_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_niches
ALTER TABLE public.user_niches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own user_niches" ON public.user_niches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own user_niches" ON public.user_niches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own user_niches" ON public.user_niches FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- video_analytics
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own video_analytics" ON public.video_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own video_analytics" ON public.video_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own video_analytics" ON public.video_analytics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ajout DELETE sur decisions au cas où
CREATE POLICY "Users can delete their own decisions" ON public.decisions FOR DELETE USING (auth.uid() = user_id);


-- 4. AJOUT DES TRIGGERS UPDATED_AT MANQUANTS
-- Assure que les colonnes updated_at sont bien modifiées automatiquement lors des UPDATES

-- Création de la fonction si elle n'existe pas déjà
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_ai_analyses_updated ON public.ai_analyses;
CREATE TRIGGER on_ai_analyses_updated BEFORE UPDATE ON public.ai_analyses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_channel_analytics_updated ON public.channel_analytics;
CREATE TRIGGER on_channel_analytics_updated BEFORE UPDATE ON public.channel_analytics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_growth_plans_updated ON public.growth_plans;
CREATE TRIGGER on_growth_plans_updated BEFORE UPDATE ON public.growth_plans FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_user_niches_updated ON public.user_niches;
CREATE TRIGGER on_user_niches_updated BEFORE UPDATE ON public.user_niches FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_video_analytics_updated ON public.video_analytics;
CREATE TRIGGER on_video_analytics_updated BEFORE UPDATE ON public.video_analytics FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- 5. AJOUT DE CONTRAINTES DE VALIDATION (CHECK / UNIQUE)
-- Assure la cohérence des données dans certaines colonnes clés
ALTER TABLE public.profiles 
  ADD CONSTRAINT check_subscription_tier CHECK (subscription_tier IN ('free', 'pro', 'enterprise'));

ALTER TABLE public.growth_plans 
  ADD CONSTRAINT check_growth_plan_status CHECK (status IN ('pending', 'active', 'completed', 'archived'));

ALTER TABLE public.growth_plans
  ADD CONSTRAINT unique_user_channel_month UNIQUE (user_id, channel_id, month);

NOTIFY pgrst, 'reload schema';
