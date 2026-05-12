-- Normalize student full names to uppercase (one-time cleanup).
-- This updates existing rows so the student list is uppercase in DB.

BEGIN;

UPDATE public.stg_students
SET fullname = UPPER(BTRIM(fullname))
WHERE fullname IS NOT NULL
  AND fullname <> UPPER(BTRIM(fullname));

COMMIT;

