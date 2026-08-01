create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teacher_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  spreadsheet_url text,
  calendar_email text,
  read_calendar_ids text[] not null default '{}',
  csv_folder_hint text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  grade text,
  class_name text,
  student_no text not null,
  name text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, grade, class_name, student_no, name)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  task_date date,
  memo text,
  is_personal boolean not null default false,
  status text not null default 'ACTIVE',
  event_id text,
  source_calendar_id text,
  color text,
  links text,
  attachments jsonb not null default '[]'::jsonb,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_date date not null,
  subject text not null,
  unit text not null,
  area text not null,
  element text not null,
  student_no text not null,
  student_name text not null,
  level text not null,
  note text,
  code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, code)
);

create index if not exists tasks_user_date_idx on public.tasks(user_id, task_date);
create index if not exists assessment_results_user_key_idx on public.assessment_results(user_id, subject, unit, area, element);

alter table public.profiles enable row level security;
alter table public.teacher_settings enable row level security;
alter table public.students enable row level security;
alter table public.tasks enable row level security;
alter table public.assessment_results enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "teacher_settings_all_own" on public.teacher_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "students_all_own" on public.students
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks_all_own" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "assessment_results_all_own" on public.assessment_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
