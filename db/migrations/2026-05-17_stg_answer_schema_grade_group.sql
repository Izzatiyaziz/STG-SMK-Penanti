alter table stg_answer_schema
  add column if not exists grade_group text;

create index if not exists idx_stg_answer_schema_grade_group
  on stg_answer_schema (exam_id, subject_id, grade_group, question_no);
