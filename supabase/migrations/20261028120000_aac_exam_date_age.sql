-- AAC : la date d'examen possible tient compte de l'âge de l'élève.
-- Elle devient la plus tardive entre la fin de l'année de conduite accompagnée
-- (début + 1 an, jour pour jour) et le 17e anniversaire de l'élève.
-- Les rappels automatiques (app.run_aac_reminders) lisent exam_eligible_at :
-- ils partent donc à la bonne date sans autre modification.

create or replace function app.aac_exam_eligible_at(p_started_at date, p_birth_date date)
returns date
language sql
immutable
as $$
  select case
    when p_started_at is null then null
    when p_birth_date is null then app.aac_add_one_year(p_started_at)
    else greatest(app.aac_add_one_year(p_started_at), (p_birth_date + interval '17 years')::date)
  end;
$$;

comment on function app.aac_exam_eligible_at(date, date) is
  'Date d''examen AAC possible : max(début + 1 an, 17e anniversaire).';

-- Même fonction que dans 20261006120000_aac_two_required_rvp.sql,
-- seule la ligne exam_eligible_at change.
create or replace function app.refresh_aac_profile_stats(p_student_id uuid)
returns public.aac_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.aac_profiles;
  v_km numeric(10,2);
  v_trips integer;
  v_rvp integer;
  v_birth date;
  v_new_status text;
begin
  select * into v_profile
  from public.aac_profiles
  where student_id = p_student_id
  for update;

  if v_profile.id is null then
    return null;
  end if;

  select coalesce(sum(distance_km), 0), count(*)::integer
  into v_km, v_trips
  from public.aac_trips
  where student_id = p_student_id
    and status = 'completed';

  select count(*)::integer
  into v_rvp
  from public.aac_rvp
  where student_id = p_student_id
    and completed = true
    and sequence <= 2;

  select birth_date into v_birth
  from public.students
  where id = p_student_id;

  if v_profile.status = 'terminee' then
    v_new_status := 'terminee';
  elsif app.aac_conditions_met(v_profile.started_at, v_km, v_birth, v_rvp) then
    v_new_status := 'conditions_remplies';
  else
    v_new_status := 'en_cours';
  end if;

  update public.aac_profiles
  set
    km_total = v_km,
    trip_count = v_trips,
    planned_end_at = app.aac_add_one_year(started_at),
    exam_eligible_at = app.aac_exam_eligible_at(started_at, v_birth),
    status = v_new_status,
    updated_at = now()
  where id = v_profile.id
  returning * into v_profile;

  return v_profile;
end;
$$;

-- Une date de naissance corrigée sur la fiche élève met à jour sa date d'examen.
create or replace function app.trg_students_refresh_aac_exam_date()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.birth_date is distinct from old.birth_date then
    update public.aac_profiles
    set
      exam_eligible_at = app.aac_exam_eligible_at(started_at, new.birth_date),
      updated_at = now()
    where student_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_students_refresh_aac_exam_date on public.students;
create trigger trg_students_refresh_aac_exam_date
  after update of birth_date on public.students
  for each row
  execute function app.trg_students_refresh_aac_exam_date();

-- Recalcul des profils existants.
update public.aac_profiles p
set
  exam_eligible_at = app.aac_exam_eligible_at(p.started_at, s.birth_date),
  updated_at = now()
from public.students s
where s.id = p.student_id
  and p.exam_eligible_at is distinct from app.aac_exam_eligible_at(p.started_at, s.birth_date);
