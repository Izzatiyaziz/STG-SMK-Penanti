alter table public.stg_report_cards
    add column if not exists prompt_input jsonb,
    add column if not exists comment_mode text default 'manual';

update public.stg_report_cards
set comment_mode = coalesce(nullif(trim(comment_mode), ''), 'manual')
where comment_mode is null or trim(comment_mode) = '';

create unique index if not exists stg_report_cards_student_exam_unique
    on public.stg_report_cards (student_id, exam_id);
