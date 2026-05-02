-- Migration: Ajouter les colonnes d'état du workshop à la table decisions
-- Date: 2026-05-02

ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS workshop_step integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS selected_concept text,
ADD COLUMN IF NOT EXISTS brainstorm_data jsonb,
ADD COLUMN IF NOT EXISTS selected_title text,
ADD COLUMN IF NOT EXISTS thumbnail_brief jsonb,
ADD COLUMN IF NOT EXISTS workshop_completed_at timestamptz;
