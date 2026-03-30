-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.ai_analyses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  analysis_text text NOT NULL,
  provider text DEFAULT 'openai'::text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval),
  analysis_type text DEFAULT 'channel'::text,
  CONSTRAINT ai_analyses_pkey PRIMARY KEY (id),
  CONSTRAINT ai_analyses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
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
  CONSTRAINT channel_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.content_suggestions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  title_suggestions ARRAY,
  description_templates ARRAY,
  tag_recommendations ARRAY,
  thumbnail_ideas ARRAY,
  based_on_video_id text,
  confidence_score double precision DEFAULT 0.5,
  generated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT content_suggestions_pkey PRIMARY KEY (id),
  CONSTRAINT content_suggestions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.growth_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  month date NOT NULL,
  objectives jsonb,
  content_calendar jsonb,
  analysis text,
  recommendations ARRAY,
  achieved_views integer DEFAULT 0,
  achieved_subscribers integer DEFAULT 0,
  status text DEFAULT 'pending'::text,
  generated_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT growth_plans_pkey PRIMARY KEY (id),
  CONSTRAINT growth_plans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
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
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  youtube_channel_title text,
  youtube_channel_thumbnail text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
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
  CONSTRAINT user_niches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.video_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  channel_id text NOT NULL,
  video_id text NOT NULL UNIQUE,
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
  tags ARRAY,
  category_id text,
  duration_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT video_analytics_pkey PRIMARY KEY (id),
  CONSTRAINT video_analytics_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);