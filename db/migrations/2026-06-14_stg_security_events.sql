create extension if not exists pgcrypto;

create table if not exists public.stg_security_events (
    event_id uuid primary key default gen_random_uuid(),
    event_type text not null,
    severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
    status text not null default 'blocked',
    ip_address text,
    identifier text,
    role text,
    endpoint text,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists stg_security_events_created_at_idx
    on public.stg_security_events (created_at desc);

create index if not exists stg_security_events_ip_address_idx
    on public.stg_security_events (ip_address);

alter table public.stg_security_events enable row level security;

comment on table public.stg_security_events is
    'Audit trail for blocked or suspicious security activity. Access through server-side admin APIs only.';
