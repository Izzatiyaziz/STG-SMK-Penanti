alter table public.stg_teachers
    add column if not exists status text not null default 'active';

update public.stg_teachers
set status = coalesce(nullif(status, ''), 'active');

alter table public.stg_teachers
    drop constraint if exists stg_teachers_status_check;

alter table public.stg_teachers
    add constraint stg_teachers_status_check
    check (status in ('active', 'inactive'));

alter table public.stg_students
    drop constraint if exists stg_students_status_check;

alter table public.stg_students
    add constraint stg_students_status_check
    check (status in ('active', 'inactive'));
