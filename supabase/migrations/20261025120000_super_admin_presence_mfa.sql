-- =============================================================================
-- Super Admin : présence en direct sécurisée et double authentification.
--
-- 1. platform_presence : chaque compte d'auto-école connecté met à jour sa ligne
--    toutes les minutes via touch_presence(). Seul le Super Admin peut lire la
--    table (et donc recevoir ses changements en temps réel). Aucun compte ne peut
--    écrire directement : tout passe par les fonctions ci-dessous.
-- 2. app.is_super_admin() exige le niveau aal2 (code de double authentification)
--    dès qu'un facteur TOTP vérifié existe pour le compte. Sans facteur, rien ne
--    change, ce qui évite de bloquer l'accès avant l'activation.
-- =============================================================================

create table if not exists public.platform_presence (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  role text not null,
  online_since timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists idx_platform_presence_last_seen on public.platform_presence (last_seen_at desc);

alter table public.platform_presence enable row level security;

drop policy if exists platform_presence_super_admin_select on public.platform_presence;
create policy platform_presence_super_admin_select on public.platform_presence
  for select to authenticated
  using (app.is_super_admin());

revoke insert, update, delete on public.platform_presence from anon, authenticated;

create or replace function public.touch_presence()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
begin
  select id, organization_id, role::text as role
    into me
    from public.profiles
   where id = auth.uid()
     and is_active is not false;

  if me.id is null or me.organization_id is null then
    return;
  end if;

  insert into public.platform_presence (profile_id, organization_id, role)
  values (me.id, me.organization_id, me.role)
  on conflict (profile_id) do update
    set organization_id = excluded.organization_id,
        role = excluded.role,
        online_since = case
          when public.platform_presence.last_seen_at < now() - interval '3 minutes' then now()
          else public.platform_presence.online_since
        end,
        last_seen_at = now();
end;
$$;

create or replace function public.leave_presence()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.platform_presence where profile_id = auth.uid();
$$;

revoke all on function public.touch_presence() from public, anon;
revoke all on function public.leave_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;
grant execute on function public.leave_presence() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'platform_presence'
  ) then
    alter publication supabase_realtime add table public.platform_presence;
  end if;
end;
$$;

-- Double authentification obligatoire pour le Super Admin dès qu'elle est activée.
create or replace function app.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select sa.is_active
    from public.super_admins sa
    where sa.profile_id = auth.uid()
  ), false)
  and (
    coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    or not exists (
      select 1 from auth.mfa_factors f
       where f.user_id = auth.uid() and f.status = 'verified'
    )
  )
$$;
