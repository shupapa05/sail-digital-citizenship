-- SAIL decoration purchase support
-- Run this in Supabase SQL Editor after checking that your student status table has student_id, coin, and level columns.
-- The functions search for a likely status table automatically: student_status, student_statuses, student_profiles, then students.

create table if not exists public.decorations (
  decoration_id text primary key,
  name text not null,
  price integer not null default 0,
  required_level integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.decorations (decoration_id, name, price, required_level, active) values
  ('clear', '기본 바다', 0, 1, true),
  ('lighthouse', '안전 등대', 8, 1, true),
  ('compass', '나침반', 12, 2, true),
  ('stars', '별빛 항로', 18, 3, true),
  ('harbor', '항구 깃발', 25, 4, true)
on conflict (decoration_id) do update set
  name = excluded.name,
  price = excluded.price,
  required_level = excluded.required_level,
  active = excluded.active;

create table if not exists public.student_decorations (
  student_id text not null,
  decoration_id text not null references public.decorations(decoration_id),
  created_at timestamptz not null default now(),
  primary key (student_id, decoration_id)
);

create table if not exists public.student_equipped_decorations (
  student_id text primary key,
  decoration_id text not null references public.decorations(decoration_id),
  updated_at timestamptz not null default now()
);

insert into public.student_decorations (student_id, decoration_id)
select s.student_id::text, 'clear'
from public.students s
on conflict do nothing;

create or replace function public.sail_status_table_name()
returns text
language plpgsql
stable
as $$
declare
  table_name text;
begin
  select c.table_name into table_name
  from information_schema.columns c
  join information_schema.columns coin_col
    on coin_col.table_schema = c.table_schema
   and coin_col.table_name = c.table_name
   and coin_col.column_name = 'coin'
  join information_schema.columns level_col
    on level_col.table_schema = c.table_schema
   and level_col.table_name = c.table_name
   and level_col.column_name = 'level'
  where c.table_schema = 'public'
    and c.column_name = 'student_id'
    and c.table_name in ('student_status', 'student_statuses', 'student_profiles', 'students')
  order by case c.table_name
    when 'student_status' then 1
    when 'student_statuses' then 2
    when 'student_profiles' then 3
    when 'students' then 4
    else 9
  end
  limit 1;

  if table_name is null then
    raise exception '학생 상태 테이블을 찾지 못했습니다. student_id, coin, level 컬럼이 있는 테이블이 필요합니다.';
  end if;

  return table_name;
end;
$$;

create or replace function public.sail_decoration_status(p_student_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  status_table text := public.sail_status_table_name();
  status_row jsonb;
  owned_ids text[];
  equipped_id text;
begin
  execute format('select to_jsonb(t) from public.%I t where t.student_id::text = $1 limit 1', status_table)
    into status_row
    using p_student_id;

  if status_row is null then
    raise exception '학생 정보를 찾지 못했습니다.';
  end if;

  insert into public.student_decorations (student_id, decoration_id)
  values (p_student_id, 'clear')
  on conflict do nothing;

  select array_agg(decoration_id order by decoration_id) into owned_ids
  from public.student_decorations
  where student_id = p_student_id;

  select decoration_id into equipped_id
  from public.student_equipped_decorations
  where student_id = p_student_id;

  if equipped_id is null then
    equipped_id := 'clear';
  end if;

  return status_row
    || jsonb_build_object(
      'owned_decoration_ids', coalesce(owned_ids, array['clear']::text[]),
      'equipped_decoration_id', equipped_id
    );
end;
$$;

create or replace function public.buy_decoration(p_student_id text, p_decoration_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  status_table text := public.sail_status_table_name();
  item record;
  current_coin integer;
  current_level integer;
begin
  select * into item
  from public.decorations
  where decoration_id = p_decoration_id
    and active = true;

  if item.decoration_id is null then
    raise exception '없는 장식입니다.';
  end if;

  insert into public.student_decorations (student_id, decoration_id)
  values (p_student_id, 'clear')
  on conflict do nothing;

  if exists (
    select 1 from public.student_decorations
    where student_id = p_student_id and decoration_id = p_decoration_id
  ) then
    insert into public.student_equipped_decorations (student_id, decoration_id, updated_at)
    values (p_student_id, p_decoration_id, now())
    on conflict (student_id) do update set decoration_id = excluded.decoration_id, updated_at = now();
    return jsonb_build_object('status', public.sail_decoration_status(p_student_id));
  end if;

  execute format('select coin, level from public.%I where student_id::text = $1 limit 1', status_table)
    into current_coin, current_level
    using p_student_id;

  if current_coin is null then
    raise exception '학생 정보를 찾지 못했습니다.';
  end if;

  if current_level < item.required_level then
    raise exception '레벨이 부족합니다.';
  end if;

  if current_coin < item.price then
    raise exception '코인이 부족합니다.';
  end if;

  execute format('update public.%I set coin = coin - $2 where student_id::text = $1', status_table)
    using p_student_id, item.price;

  insert into public.student_decorations (student_id, decoration_id)
  values (p_student_id, p_decoration_id)
  on conflict do nothing;

  insert into public.student_equipped_decorations (student_id, decoration_id, updated_at)
  values (p_student_id, p_decoration_id, now())
  on conflict (student_id) do update set decoration_id = excluded.decoration_id, updated_at = now();

  return jsonb_build_object('status', public.sail_decoration_status(p_student_id));
end;
$$;

create or replace function public.set_equipped_decoration(p_student_id text, p_decoration_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_decorations (student_id, decoration_id)
  values (p_student_id, 'clear')
  on conflict do nothing;

  if not exists (
    select 1 from public.student_decorations
    where student_id = p_student_id and decoration_id = p_decoration_id
  ) then
    raise exception '보유하지 않은 장식입니다.';
  end if;

  insert into public.student_equipped_decorations (student_id, decoration_id, updated_at)
  values (p_student_id, p_decoration_id, now())
  on conflict (student_id) do update set decoration_id = excluded.decoration_id, updated_at = now();

  return jsonb_build_object('status', public.sail_decoration_status(p_student_id));
end;
$$;

grant execute on function public.buy_decoration(text, text) to anon, authenticated;
grant execute on function public.set_equipped_decoration(text, text) to anon, authenticated;
grant execute on function public.sail_decoration_status(text) to anon, authenticated;
