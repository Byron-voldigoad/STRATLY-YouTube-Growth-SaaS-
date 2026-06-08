-- Migration 09 : Ajout de la colonne score dans ai_logs
-- Permet de tracer le score final calculé par le backend pour chaque évaluation IA.
ALTER TABLE public.ai_logs ADD COLUMN score NUMERIC;

NOTIFY pgrst, 'reload schema';
