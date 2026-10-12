-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- Foundation Conduite Supervisée (CS) GPS
-- Prépare une architecture parallèle AAC/CS sans casser l'existant.

create table if not exists public.cs_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at date,
  km_total numeric(10,2) not null default 0,
  trip_count integer not null default 0,
  driving_seconds_total integer not null default 0,
  status text not null default 'en_cours'
    check (status in ('en_cours', 'terminee')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id)
);

create index if not exists idx_cs_profiles_org on public.cs_profiles (organization_id);

create index if not exists idx_cs_profiles_student on public.cs_profiles (student_id);

create table if not exists public.cs_trips (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  distance_km numeric(10,3) not null default 0,
  path_summary jsonb not null default '[]'::jsonb,
  companion_name text,
  vehicle_used text,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'cancelled')),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cs_trips_student on public.cs_trips (student_id, started_at desc);

create index if not exists idx_cs_trips_org on public.cs_trips (organization_id, status);

create unique index if not exists idx_cs_trips_single_active
  on public.cs_trips (student_id)
  where status = 'in_progress';

create table if not exists public.cs_trip_points (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.cs_trips(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  lat numeric(10,7) not null,
  lng numeric(10,7) not null,
  accuracy_m numeric(10,2),
  sequence_no integer not null default 0
);

create index if not exists idx_cs_trip_points_trip on public.cs_trip_points (trip_id, sequence_no);

create or replace function app.refresh_cs_profile_stats(p_student_id uuid)
returns public.cs_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.cs_profiles;
  v_km numeric(10,2);
  v_count integer;
  v_seconds integer;
begin
  select * into v_profile
  from public.cs_profiles
  where student_id = p_student_id
  for update;

  if v_profile.id is null then
    return null;
  end if;

  select
    coalesce(sum(distance_km), 0),
    count(*)::integer,
    coalesce(sum(duration_seconds), 0)::integer
  into v_km, v_count, v_seconds
  from public.cs_trips
  where student_id = p_student_id
    and status = 'completed';

  update public.cs_profiles
  set
    km_total = v_km,
    trip_count = v_count,
    driving_seconds_total = v_seconds,
    updated_at = now()
  where id = v_profile.id
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function app.ensure_cs_profile(
  p_student_id uuid,
  p_started_at date default null
)
returns public.cs_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_profile public.cs_profiles;
begin
  if not app.can_access_student(p_student_id) and auth.role() <> 'service_role' then
    raise exception 'Accès refusé';
  end if;

  select organization_id into v_org
  from public.students
  where id = p_student_id;

  if v_org is null then
    raise exception 'Élève introuvable';
  end if;

  select * into v_profile
  from public.cs_profiles
  where student_id = p_student_id;

  if v_profile.id is null then
    insert into public.cs_profiles (
      organization_id,
      student_id,
      started_at
    ) values (
      v_org,
      p_student_id,
      p_started_at
    )
    returning * into v_profile;
  elsif p_started_at is not null and (v_profile.started_at is distinct from p_started_at) then
    update public.cs_profiles
    set
      started_at = p_started_at,
      updated_at = now()
    where id = v_profile.id
    returning * into v_profile;
  end if;

  return app.refresh_cs_profile_stats(p_student_id);
end;
$$;

create or replace function public.ensure_cs_profile(
  p_student_id uuid,
  p_started_at date default null
)
returns public.cs_profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  return app.ensure_cs_profile(p_student_id, p_started_at);
end;
$$;

create or replace function public.refresh_cs_profile_stats(p_student_id uuid)
returns public.cs_profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  if not app.can_access_student(p_student_id) and auth.role() <> 'service_role' then
    raise exception 'Accès refusé';
  end if;
  return app.refresh_cs_profile_stats(p_student_id);
end;
$$;

grant execute on function public.ensure_cs_profile(uuid, date) to authenticated, service_role;

grant execute on function public.refresh_cs_profile_stats(uuid) to authenticated, service_role;

alter table public.cs_profiles enable row level security;

alter table public.cs_trips enable row level security;

alter table public.cs_trip_points enable row level security;

drop policy if exists cs_profiles_select on public.cs_profiles;

create policy cs_profiles_select on public.cs_profiles
  for select using (app.can_access_student(student_id));

drop policy if exists cs_profiles_write_staff on public.cs_profiles;

create policy cs_profiles_write_staff on public.cs_profiles
  for all using (
    app.can_access_student(student_id)
    and app.current_role() in ('manager', 'secretary', 'teacher')
  )
  with check (
    app.can_access_student(student_id)
    and app.current_role() in ('manager', 'secretary', 'teacher')
  );

drop policy if exists cs_trips_select on public.cs_trips;

create policy cs_trips_select on public.cs_trips
  for select using (app.can_access_student(student_id));

drop policy if exists cs_trips_insert on public.cs_trips;

create policy cs_trips_insert on public.cs_trips
  for insert with check (
    app.can_access_student(student_id)
    and app.current_role() in ('student', 'manager', 'secretary', 'teacher')
  );

drop policy if exists cs_trips_update on public.cs_trips;

create policy cs_trips_update on public.cs_trips
  for update using (app.can_access_student(student_id))
  with check (app.can_access_student(student_id));

drop policy if exists cs_trip_points_select on public.cs_trip_points;

create policy cs_trip_points_select on public.cs_trip_points
  for select using (
    exists (
      select 1 from public.cs_trips t
      where t.id = trip_id and app.can_access_student(t.student_id)
    )
  );

drop policy if exists cs_trip_points_insert on public.cs_trip_points;

create policy cs_trip_points_insert on public.cs_trip_points
  for insert with check (
    exists (
      select 1 from public.cs_trips t
      where t.id = trip_id
        and t.status = 'in_progress'
        and app.can_access_student(t.student_id)
    )
  );

comment on table public.cs_profiles is
  'Profil conduite supervisée (CS) pour préparer le suivi GPS et dashboard.';

comment on table public.cs_trips is
  'Trajets GPS conduite supervisée, partageant le même moteur que AAC.';

comment on table public.cs_trip_points is
  'Points GPS bruts des trajets CS (base pour stats/exports/validation future).';
