-- =============================================================
-- NERRA — Base de données Supabase
-- Fichier 02 : RLS (Sécurité) et Triggers automatiques
-- =============================================================

-- =============================================================
-- 1. CREATION AUTOMATIQUE DE PROFILS LORS DU SIGNUP
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- 2. MISE A JOUR AUTOMATIQUE DES COLONNES "updated_at"
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_decisions_updated ON public.decisions;
CREATE TRIGGER on_decisions_updated
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Vous pouvez l'ajouter aux autres tables également si besoin:
-- CREATE TRIGGER on_ai_analyses_updated BEFORE UPDATE ON public.ai_analyses FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 3. POLITIQUES DE SECURITE AU NIVEAU DES LIGNES (RLS)
-- =============================================================

-- Table: profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can read their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Table: decisions
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own decisions." ON public.decisions;
DROP POLICY IF EXISTS "Users can insert their own decisions." ON public.decisions;
DROP POLICY IF EXISTS "Users can update their own decisions." ON public.decisions;
DROP POLICY IF EXISTS "Users can delete their own decisions." ON public.decisions;
CREATE POLICY "Users can read their own decisions." ON public.decisions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own decisions." ON public.decisions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own decisions." ON public.decisions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own decisions." ON public.decisions FOR DELETE USING (auth.uid() = user_id);

-- Table: video_analytics
ALTER TABLE public.video_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres vidéos" ON public.video_analytics;
DROP POLICY IF EXISTS "Les utilisateurs peuvent insérer leurs propres vidéos" ON public.video_analytics;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs propres vidéos" ON public.video_analytics;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs propres vidéos" ON public.video_analytics;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres vidéos" ON public.video_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs peuvent insérer leurs propres vidéos" ON public.video_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs peuvent modifier leurs propres vidéos" ON public.video_analytics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres vidéos" ON public.video_analytics FOR DELETE USING (auth.uid() = user_id);

-- Table: ai_analyses
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own ai_analyses" ON public.ai_analyses;
DROP POLICY IF EXISTS "Users can insert their own ai_analyses" ON public.ai_analyses;
DROP POLICY IF EXISTS "Users can update their own ai_analyses" ON public.ai_analyses;
DROP POLICY IF EXISTS "Users can delete their own ai_analyses" ON public.ai_analyses;
CREATE POLICY "Users can read their own ai_analyses" ON public.ai_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own ai_analyses" ON public.ai_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own ai_analyses" ON public.ai_analyses FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own ai_analyses" ON public.ai_analyses FOR DELETE USING (auth.uid() = user_id);

-- Table: channel_analytics
ALTER TABLE public.channel_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own channel_analytics" ON public.channel_analytics;
DROP POLICY IF EXISTS "Users can insert their own channel_analytics" ON public.channel_analytics;
DROP POLICY IF EXISTS "Users can update their own channel_analytics" ON public.channel_analytics;
DROP POLICY IF EXISTS "Users can delete their own channel_analytics" ON public.channel_analytics;
CREATE POLICY "Users can read their own channel_analytics" ON public.channel_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own channel_analytics" ON public.channel_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own channel_analytics" ON public.channel_analytics FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own channel_analytics" ON public.channel_analytics FOR DELETE USING (auth.uid() = user_id);

-- Table: content_suggestions
ALTER TABLE public.content_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own content_suggestions" ON public.content_suggestions;
DROP POLICY IF EXISTS "Users can insert their own content_suggestions" ON public.content_suggestions;
DROP POLICY IF EXISTS "Users can update their own content_suggestions" ON public.content_suggestions;
DROP POLICY IF EXISTS "Users can delete their own content_suggestions" ON public.content_suggestions;
CREATE POLICY "Users can read their own content_suggestions" ON public.content_suggestions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own content_suggestions" ON public.content_suggestions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own content_suggestions" ON public.content_suggestions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own content_suggestions" ON public.content_suggestions FOR DELETE USING (auth.uid() = user_id);

-- Table: growth_plans
ALTER TABLE public.growth_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own growth_plans" ON public.growth_plans;
DROP POLICY IF EXISTS "Users can insert their own growth_plans" ON public.growth_plans;
DROP POLICY IF EXISTS "Users can update their own growth_plans" ON public.growth_plans;
DROP POLICY IF EXISTS "Users can delete their own growth_plans" ON public.growth_plans;
CREATE POLICY "Users can read their own growth_plans" ON public.growth_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own growth_plans" ON public.growth_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own growth_plans" ON public.growth_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own growth_plans" ON public.growth_plans FOR DELETE USING (auth.uid() = user_id);

-- Table: user_niches
ALTER TABLE public.user_niches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own user_niches" ON public.user_niches;
DROP POLICY IF EXISTS "Users can insert their own user_niches" ON public.user_niches;
DROP POLICY IF EXISTS "Users can update their own user_niches" ON public.user_niches;
DROP POLICY IF EXISTS "Users can delete their own user_niches" ON public.user_niches;
CREATE POLICY "Users can read their own user_niches" ON public.user_niches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own user_niches" ON public.user_niches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own user_niches" ON public.user_niches FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own user_niches" ON public.user_niches FOR DELETE USING (auth.uid() = user_id);

-- Table: auth_users_proxy (Locked down by default since it is a design-only proxy table)
ALTER TABLE public.auth_users_proxy ENABLE ROW LEVEL SECURITY;

-- Note sur la vue channel_tension :
-- La vue channel_tension est configurée avec security_invoker = true dans les fichiers de migration,
-- ce qui signifie qu'elle applique automatiquement les règles RLS de la table decisions.

-- =============================================================
-- 4. AUTRES TRIGGERS UPDATED_AT MANQUANTS
-- =============================================================

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_video_analytics_updated ON public.video_analytics;
CREATE TRIGGER on_video_analytics_updated
  BEFORE UPDATE ON public.video_analytics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_ai_analyses_updated ON public.ai_analyses;
CREATE TRIGGER on_ai_analyses_updated
  BEFORE UPDATE ON public.ai_analyses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_channel_analytics_updated ON public.channel_analytics;
CREATE TRIGGER on_channel_analytics_updated
  BEFORE UPDATE ON public.channel_analytics
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_growth_plans_updated ON public.growth_plans;
CREATE TRIGGER on_growth_plans_updated
  BEFORE UPDATE ON public.growth_plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_user_niches_updated ON public.user_niches;
CREATE TRIGGER on_user_niches_updated
  BEFORE UPDATE ON public.user_niches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
