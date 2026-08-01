create table if not exists public.schooltask_classroom_states (
  workspace_key text primary key,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schooltask_classroom_states enable row level security;

drop policy if exists "schooltask_classroom_states_no_direct_client_access"
  on public.schooltask_classroom_states;

create policy "schooltask_classroom_states_no_direct_client_access"
  on public.schooltask_classroom_states
  for all
  using (false)
  with check (false);

grant usage on schema public to anon, authenticated;
