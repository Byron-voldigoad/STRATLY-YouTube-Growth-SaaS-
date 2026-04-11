-- =============================================================
-- NERRA — Base de données Supabase
-- Fichier 01 : Schéma de base et contraintes d'intégrité
-- =============================================================

CREATE TABLE public.auth_users_proxy (
  -- Utilisé uniquement à titre de conception. 
  -- Dans Supabase, utilisez auth.users.
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text UNIQUE,
  full_name text,
  avatar_url text,
  youtube_channel_id text,
  youtube_access_token text,
  youtube_refresh_token text,
  youtube_token_expires_at timestamp with time zone,
  subscription_tier text DEFAULT 'free'::text,
  youtube_channel_title text,
  youtube_channel_thumbnail text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.ai_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  analysis_type text DEFAULT 'channel'::text,
  analysis_text text NOT NULL,
  provider text DEFAULT 'openai'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  CONSTRAINT ai_analyses_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_channel_analysis UNIQUE (user_id, channel_id, analysis_type)
);
CREATE INDEX idx_analysis_type_user ON public.ai_analyses(user_id, analysis_type);

CREATE TABLE public.channel_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  date date NOT NULL,
  subscribers integer DEFAULT 0,
  total_views bigint DEFAULT 0,
  total_videos integer DEFAULT 0,
  views integer DEFAULT 0,
  watch_time_minutes bigint DEFAULT 0,
  estimated_revenue numeric DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  shares integer DEFAULT 0,
  avg_view_duration double precision DEFAULT 0,
  impressions integer DEFAULT 0,
  impressions_ctr double precision DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT channel_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT channel_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_channel_date UNIQUE (channel_id, date)
);

CREATE TABLE public.content_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  title_suggestions text[],
  description_templates text[],
  tag_recommendations text[],
  thumbnail_ideas text[],
  based_on_video_id text,
  confidence_score double precision DEFAULT 0.5,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT content_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT content_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.growth_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  month date NOT NULL,
  objectives jsonb,
  content_calendar jsonb,
  analysis text,
  recommendations text[],
  achieved_views integer DEFAULT 0,
  achieved_subscribers integer DEFAULT 0,
  status text DEFAULT 'pending'::text,
  generated_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT growth_plans_pkey PRIMARY KEY (id),
  CONSTRAINT growth_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE TABLE public.user_niches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  detected_niches jsonb DEFAULT '[]'::jsonb,
  selected_niches jsonb DEFAULT '[]'::jsonb,
  video_count_at_detection integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_niches_pkey PRIMARY KEY (id),
  CONSTRAINT user_niches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_channel_niche UNIQUE (user_id, channel_id)
);

CREATE TABLE public.video_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  video_id text NOT NULL,
  video_title text,
  video_description text,
  published_at timestamp with time zone,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  watch_time_minutes bigint DEFAULT 0,
  avg_view_duration double precision DEFAULT 0,
  impressions integer DEFAULT 0,
  impressions_ctr double precision DEFAULT 0,
  click_through_rate double precision DEFAULT 0,
  retention_28 double precision DEFAULT 0,
  thumbnail_url text,
  tags text[],
  category_id text,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT video_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT unique_video_id UNIQUE (video_id)
);

CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  experiment_type TEXT NOT NULL CHECK (experiment_type IN ('TYPE_HOOK', 'TYPE_NICHE', 'TYPE_FORMAT', 'TYPE_TITRE', 'TYPE_MINIATURE', 'TYPE_FREQUENCE', 'TYPE_PIVOT')),
  hypothesis TEXT NOT NULL,
  variable TEXT NOT NULL,
  target_metric TEXT NOT NULL,
  video_id TEXT,
  video_title TEXT,
  baseline_value DOUBLE PRECISION,
  result_value DOUBLE PRECISION,
  verdict TEXT DEFAULT 'PENDING' CHECK (verdict IN ('VALIDATED', 'FAILED', 'PENDING', 'SKIPPED')),
  confidence_score DOUBLE PRECISION DEFAULT 0.5,
  mode TEXT DEFAULT 'ASSISTED' CHECK (mode IN ('ASSISTED', 'PILOT')),
  resistance_count INTEGER DEFAULT 0,
  is_resistance_confirmed BOOLEAN DEFAULT FALSE,
  ai_reasoning TEXT,
  accepted_at TIMESTAMPTZ,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decisions_user_channel ON public.decisions(user_id, channel_id);
CREATE INDEX idx_decisions_verdict ON public.decisions(user_id, verdict);
CREATE INDEX idx_decisions_created ON public.decisions(user_id, created_at DESC);
CREATE INDEX idx_decisions_experiment_type ON public.decisions(user_id, experiment_type);

NOTIFY pgrst, 'reload schema';
