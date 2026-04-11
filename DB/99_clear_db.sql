-- =============================================================
-- NERRA — Base de données Supabase
-- Fichier 99 : DANGER - HARD RESET
-- =============================================================

-- Script pour faire un HARD RESET de la base de données Nerra/Stratly
-- /!\ ATTENTION DANGER /!\
-- Ceci va SUPPRIMER ABSOLUMENT TOUT : 
-- Comptes utilisateurs, connexions YouTube, profils, analyses, historiques, décisions.
-- La base de données sera complètement vierge après l'exécution.

-- 1. Supprimer l'historique complet généré
TRUNCATE TABLE public.decisions CASCADE;
TRUNCATE TABLE public.ai_analyses CASCADE;
TRUNCATE TABLE public.video_analytics CASCADE;
TRUNCATE TABLE public.channel_analytics CASCADE;
TRUNCATE TABLE public.user_niches CASCADE;

-- 2. Supprimer les profils utilisateurs
TRUNCATE TABLE public.profiles CASCADE;

-- 3. Supprimer les comptes d'authentification globaux
-- (Ceci déconnectera tous les utilisateurs actuels de Supabase)
TRUNCATE TABLE auth.users CASCADE;
