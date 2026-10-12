-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- =============================================================================
-- PEDAGOGIA DRIVE — Restreindre les RPC globales de rappels (run_*)
-- =============================================================================
-- Problème :
--   public.run_automated_reminders, public.run_expiration_reminders et
--   public.run_fleet_maintenance_reminders étaient GRANT EXECUTE à authenticated
--   et n'interdisaient que les non-admin_staff. Un gérant/secrétaire pouvait
--   donc les appeler depuis le navigateur. SECURITY DEFINER + boucle sans
--   filtre d'organisation = traitement des rappels de TOUTES les auto-écoles.
--
--   public.run_student_access_expiry_checks n'était granté qu'à service_role
--   mais n'avait ni REVOKE FROM public (EXECUTE PUBLIC par défaut) ni garde
--   auth.uid(). Elle peut désactiver des élèves sur toutes les organisations.
--
-- Correction :
--   - EXECUTE uniquement pour service_role (Edge Functions cron).
--   - Garde : tout JWT utilisateur (auth.uid() not null) est refusé.
--   - Noms, signatures et logique métier inchangés.
--   - Les jobs pg_cron continuent d'appeler les Edge Functions (x-cron-secret),
--     qui appellent ces RPC avec SUPABASE_SERVICE_ROLE_KEY.
-- =============================================================================

create or replace function public.run_automated_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'Permission denied';
  end if;
  return app.run_automated_reminders();
end;
$$;

create or replace function public.run_expiration_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'Permission denied';
  end if;
  return app.run_expiration_reminders();
end;
$$;

create or replace function public.run_fleet_maintenance_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'Permission denied';
  end if;
  return app.run_fleet_maintenance_reminders();
end;
$$;

create or replace function public.run_student_access_expiry_checks()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    raise exception 'Permission denied';
  end if;
  return app.run_student_access_expiry_checks();
end;
$$;

revoke all on function public.run_automated_reminders() from public, anon, authenticated;

revoke all on function public.run_expiration_reminders() from public, anon, authenticated;

revoke all on function public.run_fleet_maintenance_reminders() from public, anon, authenticated;

revoke all on function public.run_student_access_expiry_checks() from public, anon, authenticated;

grant execute on function public.run_automated_reminders() to service_role;

grant execute on function public.run_expiration_reminders() to service_role;

grant execute on function public.run_fleet_maintenance_reminders() to service_role;

grant execute on function public.run_student_access_expiry_checks() to service_role;

revoke all on function app.run_automated_reminders() from public, anon, authenticated;

revoke all on function app.run_expiration_reminders() from public, anon, authenticated;

revoke all on function app.run_fleet_maintenance_reminders() from public, anon, authenticated;

revoke all on function app.run_student_access_expiry_checks() from public, anon, authenticated;

revoke all on function app.run_aac_reminders() from public, anon, authenticated;

grant execute on function app.run_automated_reminders() to service_role;

grant execute on function app.run_expiration_reminders() to service_role;

grant execute on function app.run_fleet_maintenance_reminders() to service_role;

grant execute on function app.run_student_access_expiry_checks() to service_role;

grant execute on function app.run_aac_reminders() to service_role;

comment on function public.run_automated_reminders() is
  'Job global de rappels automatiques (code + AAC). Exécutable uniquement par service_role (cron / Edge Function).';

comment on function public.run_expiration_reminders() is
  'Job global de rappels d''expiration. Exécutable uniquement par service_role (cron / Edge Function).';

comment on function public.run_fleet_maintenance_reminders() is
  'Job global de rappels flotte. Exécutable uniquement par service_role (cron / Edge Function).';

comment on function public.run_student_access_expiry_checks() is
  'Job global d''expiration des accès élèves. Exécutable uniquement par service_role (cron / Edge Function).';
