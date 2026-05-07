-- SAIL sample student for reward/shop testing
-- Run in Supabase SQL Editor.
-- Login code: SAMPLE001

insert into public.students (student_id, name, login_code, grade, class, number)
values ('sample-student-001', '샘플학생', 'SAMPLE001', 3, 1, 99)
on conflict (student_id) do update set
  name = excluded.name,
  login_code = excluded.login_code,
  grade = excluded.grade,
  class = excluded.class,
  number = excluded.number;

insert into public.student_status (
  student_id,
  level,
  total_score,
  coin,
  streak,
  s_count,
  a_count,
  i_count,
  l_count,
  owned_ship_ids,
  equipped_ship_id,
  ship_type
)
values (
  'sample-student-001',
  4,
  80,
  50,
  5,
  10,
  7,
  3,
  12,
  array[]::text[],
  null,
  '종이배'
)
on conflict (student_id) do update set
  level = excluded.level,
  total_score = excluded.total_score,
  coin = excluded.coin,
  streak = excluded.streak,
  s_count = excluded.s_count,
  a_count = excluded.a_count,
  i_count = excluded.i_count,
  l_count = excluded.l_count,
  owned_ship_ids = excluded.owned_ship_ids,
  equipped_ship_id = excluded.equipped_ship_id,
  ship_type = excluded.ship_type;

insert into public.student_decorations (student_id, decoration_id)
values ('sample-student-001', 'clear')
on conflict do nothing;

insert into public.student_equipped_decorations (student_id, decoration_id, updated_at)
values ('sample-student-001', 'clear', now())
on conflict (student_id) do update set
  decoration_id = excluded.decoration_id,
  updated_at = now();

select 'SAMPLE001' as login_code, '샘플학생 생성 완료' as message;
