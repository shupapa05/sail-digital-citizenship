do $$
declare
  v_sql text;
begin
  select pg_get_functiondef('public.get_student_home(text,text)'::regprocedure)
  into v_sql;

  v_sql := replace(v_sql, 'r.class_rank <= 5', 'r.class_rank <= 10');
  v_sql := replace(v_sql, 'r.overall_rank <= 5', 'r.overall_rank <= 10');

  execute v_sql;
end $$;
