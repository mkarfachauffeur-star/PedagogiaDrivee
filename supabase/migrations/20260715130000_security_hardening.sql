-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- =============================================================================
-- PEDAGOGIA DRIVE — Durcissement sécurité (audit juillet 2026)
-- =============================================================================
-- Corrige : escalade de privilèges profils, audit forgery, RPC cron non protégés,
-- super_admin via metadata, storage cross-tenant, policies manquantes.
-- N'altère pas les flux auth/invite (service_role bypass RLS + trigger guard).
-- =============================================================================

-- ─── 1. Super Admin : source de vérité = table super_admins uniquement ───────

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
$$;

comment on function app.is_super_admin() is
  'Super Admin actif via super_admins uniquement (plus de fallback profiles.role).';

-- ─── 2. Garde-fou colonnes sensibles sur profiles ───────────────────────────

create or replace function app.guard_profile_sensitive_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Migrations, Edge Functions (service_role), triggers système
  if auth.uid() is null then
    return new;
  end if;

  if app.is_super_admin() then
    return new;
  end if;

  -- Staff admin met à jour un autre profil de l'organisation
  if old.id is distinct from auth.uid()
     and app.is_admin_staff()
     and old.organization_id is not distinct from app.current_org_id() then
    if new.role is distinct from old.role
       or new.organization_id is distinct from old.organization_id then
      raise exception 'Modification du rôle ou de l''organisation interdite.';
    end if;
    return new;
  end if;

  -- Auto-modification
  if old.id = auth.uid() then
    if new.role is distinct from old.role
       or new.organization_id is distinct from old.organization_id
       or new.is_active is distinct from old.is_active
       or new.access_expires_at is distinct from old.access_expires_at
       or new.access_expiry_warned_at is distinct from old.access_expiry_warned_at then
      raise exception 'Modification de champs sensibles interdite sur votre profil.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_sensitive_columns on public.profiles;

create trigger profiles_guard_sensitive_columns
  before update on public.profiles
  for each row
  execute function app.guard_profile_sensitive_columns();

-- ─── 3. Provisioning Auth : pas de super_admin via metadata client ───────────

create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := nullif(new.raw_user_meta_data->>'organization_id', '')::uuid;
  v_role public.app_role := coalesce(
    nullif(new.raw_user_meta_data->>'role', '')::public.app_role,
    'student'::public.app_role
  );
  v_name text := coalesce(new.raw_user_meta_data->>'full_name', '');
begin
  -- Promotion Super Admin réservée à promote_to_super_admin (service_role)
  if v_role = 'super_admin'::public.app_role then
    return new;
  end if;

  if v_org is not null and exists (select 1 from public.organizations o where o.id = v_org) then
    insert into public.profiles (id, organization_id, role, full_name, email)
    values (new.id, v_org, v_role, v_name, new.email)
    on conflict (id) do nothing;

    if v_role = 'teacher'::public.app_role then
      insert into public.teachers (profile_id, organization_id)
      values (new.id, v_org)
      on conflict (profile_id) do nothing;
    elsif v_role = 'secretary'::public.app_role then
      insert into public.secretaries (profile_id, organization_id)
      values (new.id, v_org)
      on conflict (profile_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- ─── 4. Audit : validation organisation + policy INSERT ─────────────────────

create or replace function app.log_audit_event(
  p_action public.audit_action,
  p_entity_type text default '',
  p_entity_id uuid default null,
  p_entity_label text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_organization_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := coalesce(p_organization_id, app.current_org_id());
  v_role public.app_role;
  v_email text;
begin
  if auth.uid() is not null
     and not app.is_super_admin()
     and (v_org is null or v_org is distinct from app.current_org_id()) then
    raise exception 'Organisation non autorisée pour l''audit.';
  end if;

  select role, email into v_role, v_email
  from public.profiles
  where id = auth.uid();

  insert into public.audit_logs (
    organization_id, actor_id, actor_role, actor_email,
    action, entity_type, entity_id, entity_label, metadata
  ) values (
    v_org, auth.uid(), v_role, v_email,
    p_action, p_entity_type, p_entity_id, p_entity_label, p_metadata
  );
end;
$$;

drop policy if exists audit_logs_insert on public.audit_logs;

create policy audit_logs_insert on public.audit_logs
  for insert
  with check (
    app.is_super_admin()
    or (
      auth.uid() is not null
      and organization_id = app.current_org_id()
      and app.is_admin_staff()
    )
  );

-- ─── 5. revoke_super_admin : service_role + super admin actif ────────────────

create or replace function public.revoke_super_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not app.is_super_admin() then
    raise exception 'Accès réservé au Super Admin.';
  end if;

  update public.super_admins
  set is_active = false
  where profile_id = p_user_id;
end;
$$;

revoke all on function public.revoke_super_admin(uuid) from public;

grant execute on function public.revoke_super_admin(uuid) to service_role;

-- ─── 6. ensure_teacher_record : réservé au staff admin ───────────────────────

create or replace function app.ensure_teacher_record(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_role public.app_role;
begin
  if not app.is_admin_staff() then
    raise exception 'Permission denied';
  end if;

  select organization_id, role into v_org, v_role
  from public.profiles
  where id = p_profile_id;

  if v_org is null or v_org <> app.current_org_id() then
    raise exception 'Profil introuvable';
  end if;
  if v_role <> 'teacher'::public.app_role then
    raise exception 'Le compte n''est pas un enseignant';
  end if;

  insert into public.teachers (profile_id, organization_id)
  values (p_profile_id, v_org)
  on conflict (profile_id) do nothing;

  return p_profile_id;
end;
$$;

-- ─── 7. RPC cron : garde admin + retrait app.* pour authenticated ────────────

create or replace function public.run_automated_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not app.is_admin_staff() then
    raise exception 'Permission denied';
  end if;
  return app.run_automated_reminders();
end;
$$;

revoke all on function app.run_automated_reminders() from public;

revoke all on function app.run_expiration_reminders() from public;

revoke all on function app.run_fleet_maintenance_reminders() from public;

grant execute on function app.run_automated_reminders() to service_role;

grant execute on function app.run_expiration_reminders() to service_role;

grant execute on function app.run_fleet_maintenance_reminders() to service_role;

revoke all on function public.run_automated_reminders() from public;

grant execute on function public.run_automated_reminders() to authenticated, service_role;

-- ─── 8. Avis élèves : lier organization_id au dossier ────────────────────────

drop policy if exists reviews_student_insert on public.reviews;

create policy reviews_student_insert on public.reviews
  for insert
  with check (
    profile_id = auth.uid()
    and app.current_role() = 'student'::public.app_role
    and not app.student_has_review(auth.uid())
    and app.student_review_eligible(auth.uid())
    and organization_id = (
      select s.organization_id
      from public.students s
      where s.profile_id = auth.uid()
      limit 1
    )
  );

-- ─── 9. Pré-inscriptions : UPDATE admin (defense in depth) ───────────────────

drop policy if exists pre_registrations_update_admin on public.pre_registrations;

create policy pre_registrations_update_admin on public.pre_registrations
  for update
  using (
    organization_id = app.current_org_id()
    and app.is_admin_staff()
    and app.can_write_org()
  )
  with check (
    organization_id = app.current_org_id()
    and app.is_admin_staff()
    and app.can_write_org()
  );

-- ─── 10. Storage : org-assets scoped + delete manager + super admin buckets ──

drop policy if exists org_assets_select on storage.objects;

create policy org_assets_select on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'org-assets'
    and (
      app.is_super_admin()
      or (storage.foldername(name))[1] = app.current_org_id()::text
    )
  );

drop policy if exists org_assets_delete on storage.objects;

create policy org_assets_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = app.current_org_id()::text
    and app.current_role() = 'manager'::public.app_role
    and app.can_write_org()
  );

drop policy if exists student_docs_super on storage.objects;

create policy student_docs_super on storage.objects
  for all
  to authenticated
  using (bucket_id = 'student-documents' and app.is_super_admin())
  with check (bucket_id = 'student-documents' and app.is_super_admin());

drop policy if exists teacher_docs_super on storage.objects;

create policy teacher_docs_super on storage.objects
  for all
  to authenticated
  using (bucket_id = 'teacher-documents' and app.is_super_admin())
  with check (bucket_id = 'teacher-documents' and app.is_super_admin());

drop policy if exists staff_contracts_super on storage.objects;

create policy staff_contracts_super on storage.objects
  for all
  to authenticated
  using (bucket_id = 'staff-contracts' and app.is_super_admin())
  with check (bucket_id = 'staff-contracts' and app.is_super_admin());
