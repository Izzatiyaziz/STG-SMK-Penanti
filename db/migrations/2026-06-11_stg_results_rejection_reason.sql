alter table public.stg_results
  add column if not exists rejection_reason text;

comment on column public.stg_results.rejection_reason is
  'Sebab penolakan markah oleh Panitia Subjek. Dikosongkan apabila guru menghantar semula markah.';
