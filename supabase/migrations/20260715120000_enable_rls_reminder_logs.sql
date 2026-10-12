-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- =============================================================================
-- Security Advisor fix: rls_disabled_in_public
-- =============================================================================
-- Tables identified without RLS (public schema):
--   • expiration_reminder_log  — created in 20260630130000, RLS never enabled
--
-- Tables with RLS enabled but missing org-scoped policies (post super_admin loop):
--   • automated_reminder_kinds, student_automated_reminders, automated_reminder_sent_log
--   • fleet_maintenance_reminder_log
--   • organization_domains
--
-- Writes on log tables remain via SECURITY DEFINER RPC/triggers (bypass RLS).
-- Auth provisioning (handle_new_user), anon signup/demo inserts unchanged.
-- =============================================================================

-- ─── expiration_reminder_log ────────────────────────────────────────────────

alter table public.expiration_reminder_log enable row level security;

drop policy if exists expiration_reminder_log_select_staff on public.expiration_reminder_log;

create policy expiration_reminder_log_select_staff on public.expiration_reminder_log
  for select
  using (
    organization_id = app.current_org_id()
    and app.is_admin_staff()
  );

-- ─── automated reminders ──────────────────────────────────────────────────────

drop policy if exists automated_reminder_kinds_select_staff on public.automated_reminder_kinds;

create policy automated_reminder_kinds_select_staff on public.automated_reminder_kinds
  for select
  using (app.is_staff() or app.is_super_admin());

drop policy if exists student_automated_reminders_select_staff on public.student_automated_reminders;

create policy student_automated_reminders_select_staff on public.student_automated_reminders
  for select
  using (
    organization_id = app.current_org_id()
    and app.is_admin_staff()
  );

drop policy if exists automated_reminder_sent_log_select_staff on public.automated_reminder_sent_log;

create policy automated_reminder_sent_log_select_staff on public.automated_reminder_sent_log
  for select
  using (
    organization_id = app.current_org_id()
    and app.is_admin_staff()
  );

-- ─── fleet maintenance reminder log ───────────────────────────────────────────

drop policy if exists fleet_maintenance_reminder_log_select_staff on public.fleet_maintenance_reminder_log;

create policy fleet_maintenance_reminder_log_select_staff on public.fleet_maintenance_reminder_log
  for select
  using (
    organization_id = app.current_org_id()
    and app.is_admin_staff()
  );

-- ─── organization_domains (RLS on since 0009, no tenant policy) ─────────────

drop policy if exists organization_domains_select_staff on public.organization_domains;

create policy organization_domains_select_staff on public.organization_domains
  for select
  using (
    organization_id = app.current_org_id()
    and app.is_admin_staff()
  );

drop policy if exists organization_domains_write_admin on public.organization_domains;

create policy organization_domains_write_admin on public.organization_domains
  for all
  using (
    organization_id = app.current_org_id()
    and app.current_role() = 'manager'
    and app.can_write_org()
  )
  with check (
    organization_id = app.current_org_id()
    and app.current_role() = 'manager'
    and app.can_write_org()
  );

-- ─── Super Admin : rattrapage tables créées après 20260630170000 ─────────────

do $$
declare
  r record;
begin
  for r in
    select c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
  loop
    execute format('drop policy if exists super_admin_all on public.%I', r.table_name);
    execute format(
      'create policy super_admin_all on public.%I for all to authenticated using (app.is_super_admin()) with check (app.is_super_admin())',
      r.table_name
    );
  end loop;
end $$;

-- ─── Vérification (Security Advisor) ─────────────────────────────────────────
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public' AND c.relkind = 'r'
-- ORDER BY c.relname;
