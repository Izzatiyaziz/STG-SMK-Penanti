alter table stg_admins
    add column if not exists email text,
    add column if not exists status text not null default 'active',
    add column if not exists is_first_login boolean not null default false;

update stg_admins
set status = coalesce(nullif(status, ''), 'active'),
    is_first_login = coalesce(is_first_login, false);

alter table stg_admins
    drop constraint if exists stg_admins_status_check;

alter table stg_admins
    add constraint stg_admins_status_check
    check (status in ('active', 'inactive'));

