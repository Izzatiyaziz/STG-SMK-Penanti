create table if not exists stg_mark_components (
  mark_component_id uuid primary key default gen_random_uuid(),
  student_id uuid not null references stg_students(student_id) on delete cascade,
  subject_id uuid not null references stg_subjects(subject_id) on delete cascade,
  exam_id uuid not null references stg_exams(exam_id) on delete cascade,
  class_id uuid references stg_classes(class_id) on delete set null,
  teacher_id uuid references stg_teachers(teacher_id) on delete set null,
  component_key text not null,
  component_label text not null,
  component_type text not null check (component_type in ('manual', 'omr')),
  mark numeric not null default 0,
  max_mark numeric not null default 0,
  included_in_total boolean not null default true,
  question_count integer,
  group_name text,
  input_date timestamptz not null default now(),
  unique (student_id, subject_id, exam_id, component_key)
);

create index if not exists idx_stg_mark_components_lookup
  on stg_mark_components (subject_id, exam_id, class_id, teacher_id, student_id);
