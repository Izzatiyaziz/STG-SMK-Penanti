-- Add per-exam per-subject settings (deadline + limits) into stg_exams.
-- Run this in Supabase SQL editor.

ALTER TABLE public.stg_exams
ADD COLUMN IF NOT EXISTS subject_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Example structure:
-- {
--   "<subject_id>": {
--     "deadline": "2026-05-15",
--     "objective_questions": 40,
--     "objective_max": 40,
--     "subjective_max": 60
--   }
-- }

