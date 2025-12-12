-- *** Partie 1: Création Automatique de Profils (Fonction et Trigger) ***

-- Trigger qui appelle la fonction après chaque nouvelle insertion dans auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- *** Partie 2: Politiques de Sécurité au Niveau des Lignes (RLS) ***

-- 1. Assurez-vous que la sécurité au niveau des lignes (RLS) est activée pour votre table `profiles`.
--    Ceci est crucial pour la sécurité, mais nécessite des politiques explicites.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. POLITIQUE DE LECTURE (SELECT) :
--    Permet à chaque utilisateur authentifié (auth.uid()) de lire son propre profil.
--    Sans cela, le tableau de bord ne pourrait pas récupérer les données du profil.
CREATE POLICY "Users can read their own profile."
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- 3. POLITIQUE DE MISE À JOUR (UPDATE) :
--    Permet à chaque utilisateur authentifié de mettre à jour son propre profil.
--    C'est cette politique qui est essentielle pour sauvegarder les tokens YouTube.
CREATE POLICY "Users can update their own profile."
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- OPTIONNEL : Si vous souhaitez également permettre l'insertion manuelle ou spécifique
-- CREATE POLICY "Users can insert their own profile."
-- ON public.profiles FOR INSERT
-- WITH CHECK (auth.uid() = id);
