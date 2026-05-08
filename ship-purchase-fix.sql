-- 운영 편의를 위한 바로가기 파일입니다.
-- 실제 내용은 supabase/ship-purchase-fix.sql 과 동일합니다.
-- Supabase SQL Editor에서 전체를 한 번 실행해 주세요.

create or replace function public.buy_ship(p_student_id text, p_ship_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ship_row record;
  status_row public.student_status%rowtype;
  owned_ids text[];
begin
  select * into ship_row
  from public.ships
  where ship_id = p_ship_id
    and active = true;

  if ship_row.ship_id is null then
    return jsonb_build_object('ok', false, 'message', '없는 배입니다.');
  end if;

  select * into status_row
  from public.student_status
  where student_id::text = p_student_id
  for update;

  if status_row.student_id is null then
    return jsonb_build_object('ok', false, 'message', '학생 상태 정보가 없습니다.');
  end if;

  owned_ids := coalesce(status_row.owned_ship_ids, array[]::text[]);

  if p_ship_id = any(owned_ids) then
    update public.student_status
    set equipped_ship_id = p_ship_id,
        ship_type = ship_row.name,
        updated_at = now()
    where student_id::text = p_student_id;

    return jsonb_build_object('ok', true, 'message', '이미 보유한 배를 선택했습니다.');
  end if;

  if coalesce(status_row.level, 1) < coalesce(ship_row.level, 1) then
    return jsonb_build_object('ok', false, 'message', '레벨이 부족합니다.');
  end if;

  if coalesce(status_row.coin, 0) < coalesce(ship_row.price, 0) then
    return jsonb_build_object('ok', false, 'message', '코인이 부족합니다.');
  end if;

  update public.student_status
  set coin = coalesce(coin, 0) - coalesce(ship_row.price, 0),
      owned_ship_ids = array_append(owned_ids, p_ship_id),
      equipped_ship_id = p_ship_id,
      ship_type = ship_row.name,
      updated_at = now()
  where student_id::text = p_student_id;

  return jsonb_build_object('ok', true, 'message', '배를 구매했습니다.');
end;
$$;

create or replace function public.set_equipped_ship(p_student_id text, p_ship_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ship_row record;
  status_row public.student_status%rowtype;
  owned_ids text[];
begin
  select * into ship_row
  from public.ships
  where ship_id = p_ship_id
    and active = true;

  if ship_row.ship_id is null then
    return jsonb_build_object('ok', false, 'message', '없는 배입니다.');
  end if;

  select * into status_row
  from public.student_status
  where student_id::text = p_student_id
  for update;

  if status_row.student_id is null then
    return jsonb_build_object('ok', false, 'message', '학생 상태 정보가 없습니다.');
  end if;

  owned_ids := coalesce(status_row.owned_ship_ids, array[]::text[]);

  if coalesce(ship_row.price, 0) > 0 and not (p_ship_id = any(owned_ids)) then
    return jsonb_build_object('ok', false, 'message', '보유하지 않은 배입니다.');
  end if;

  update public.student_status
  set equipped_ship_id = p_ship_id,
      ship_type = ship_row.name,
      updated_at = now()
  where student_id::text = p_student_id;

  return jsonb_build_object('ok', true, 'message', '배를 선택했습니다.');
end;
$$;

grant execute on function public.buy_ship(text, text) to anon, authenticated;
grant execute on function public.set_equipped_ship(text, text) to anon, authenticated;
