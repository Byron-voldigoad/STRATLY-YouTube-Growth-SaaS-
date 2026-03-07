-- MODIFICATION DE LA TABLE ai_analyses
-- Permet de distinguer les caches "channel" et "ideas"

-- 1. Ajouter la colonne analysis_type si elle n'existe pas
ALTER TABLE ai_analyses 
ADD COLUMN IF NOT EXISTS analysis_type TEXT DEFAULT 'channel';

-- 2. Créer un index performant pour les recherches
CREATE INDEX IF NOT EXISTS idx_analysis_type_user 
ON ai_analyses(user_id, analysis_type);

-- 3. Mettre à jour la contrainte d'unicité pour inclure analysis_type
-- ATTENTION : Cela peut nécessiter de supprimer l'ancienne contrainte d'abord.
-- Vérifiez le nom de votre contrainte actuelle (souvent ai_analyses_user_id_channel_id_key ou similaire)
ALTER TABLE ai_analyses 
DROP CONSTRAINT IF EXISTS ai_analyses_user_id_channel_id_key;

ALTER TABLE ai_analyses 
ADD CONSTRAINT ai_analyses_user_id_channel_id_type_key 
UNIQUE (user_id, channel_id, analysis_type);

-- 4. Commentaire explicatif
COMMENT ON COLUMN ai_analyses.analysis_type IS 'Type d''analyse : "channel" ou "ideas"';
