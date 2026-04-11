-- =============================================================
-- NERRA — Base de données Supabase
-- Fichier 02 : RLS (Sécurité) et Triggers automatiques
-- =============================================================

-- =============================================================
-- 1. CREATION AUTOMATIQUE DE PROFILS LORS DU SIGNUP
-- =============================================================
-- Assurez-vous d'avoir déclaré la fonction public.handle_new_user() dans votre Supabase.
-- Voici à quoi elle devrait ressembler si ce n'est pas fait :
/*
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

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

CREATE POLICY "Users can read their own profile."
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Table: decisions
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own decisions."
ON public.decisions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own decisions."
ON public.decisions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own decisions."
ON public.decisions FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Note: Le backend accède aux données via le "service_role key" qui bypasse automatiquement RLS.
-- Si votre frontend requiert d'accéder directement à `ai_analyses` ou `video_analytics`, 
-- rajoutez les politiques SELECT adéquates.
