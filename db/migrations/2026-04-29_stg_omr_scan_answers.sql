-- Store per-question OMR detection results (recommended).
-- Run this in Supabase SQL editor.
--
-- This matches your current schema where `stg_omr_scans` only stores:
-- `student_id, subject_id, exam_id, objective_total_mark, scan_date`.

CREATE TABLE IF NOT EXISTS public.stg_omr_scan_answers (
  answer_id uuid NOT NULL DEFAULT gen_random_uuid(),
  omr_scan_id uuid NOT NULL,
  question_no integer NOT NULL,
  detected_option text,
  expected_option text,
  status text NOT NULL,
  confidence numeric,
  ratios jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stg_omr_scan_answers_pkey PRIMARY KEY (answer_id),
  CONSTRAINT stg_omr_scan_answers_scan_fkey FOREIGN KEY (omr_scan_id)
    REFERENCES public.stg_omr_scans (omr_scan_id)
    ON DELETE CASCADE,
  CONSTRAINT stg_omr_scan_answers_unique UNIQUE (omr_scan_id, question_no)
);
