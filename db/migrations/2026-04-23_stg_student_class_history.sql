-- Student class history table (optional but recommended).
-- Run this in Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.stg_student_class_history (
  history_id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  class_id uuid,
  level text,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT stg_student_class_history_pkey PRIMARY KEY (history_id),
  CONSTRAINT stg_student_class_history_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.stg_students(student_id),
  CONSTRAINT stg_student_class_history_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.stg_classes(class_id)
);

