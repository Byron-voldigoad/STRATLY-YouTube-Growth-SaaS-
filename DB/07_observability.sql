-- Lier les logs IA aux décisions
ALTER TABLE public.ai_logs ADD COLUMN decision_id UUID REFERENCES public.decisions(id) ON DELETE SET NULL;

-- Sauvegarder l'état du marché et du moteur
ALTER TABLE public.decisions ADD COLUMN market_snapshot TEXT;
ALTER TABLE public.decisions ADD COLUMN engine_version TEXT DEFAULT 'v1.0-llama3.3';

-- Préparer le lien avec la vidéo finale publiée
ALTER TABLE public.decisions ADD COLUMN published_video_id TEXT;

NOTIFY pgrst, 'reload schema';
