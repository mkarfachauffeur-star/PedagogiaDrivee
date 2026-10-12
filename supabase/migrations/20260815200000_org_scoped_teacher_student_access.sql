-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- =============================================================================
-- Accès enseignant = même organisation (plus d'attribution permanente).
--
-- Conservé : table student_assignments et ses lignes existantes.
-- Ne plus l'utiliser comme source de vérité pour « quels élèves un enseignant voit ».
-- Source de vérité : students.organization_id = profiles.organization_id.
--
-- Pédagogie / contact : enseignant actif de l'org A → tous les élèves de A.
-- Finances / documents admin : secrétariat, gérant, élève (son dossier), super admin.
-- Planning enseignant : uniquement appointments.teacher_id = auth.uid().
-- =============================================================================

-- Enseignant actif de l'organisation courante, pour l'élève indiqué.
-- Ne lit plus student_assignments.
create or replace function app.is_teacher_of_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    join public.profiles p on p.id = auth.uid()
    where s.id = p_student_id
      and p.role = 'teacher'
      and coalesce(p.is_active, true) = true
      and p.organization_id is not null
      and s.organization_id = p.organization_id
      and s.organization_id = app.current_org_id()
  )
$$;

-- Inchangé fonctionnellement pour admin / élève / super admin.
-- La branche teacher suit is_teacher_of_student (désormais org-wide).
create or replace function app.can_access_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_super_admin()
    or exists (
      select 1 from public.students s
      where s.id = p_student_id
        and s.organization_id = app.current_org_id()
        and (
          app.is_admin_staff()
          or (app.current_role() = 'teacher' and app.is_teacher_of_student(s.id))
          or (app.current_role() = 'student' and s.profile_id = auth.uid())
        )
    )
$$;

-- Finances, contrats, pièces administratives : pas les enseignants.
create or replace function app.can_access_student_admin_records(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_super_admin()
    or exists (
      select 1 from public.students s
      where s.id = p_student_id
        and s.organization_id = app.current_org_id()
        and (
          app.is_admin_staff()
          or (app.current_role() = 'student' and s.profile_id = auth.uid())
        )
    )
$$;

-- Profils élèves visibles par tout enseignant actif de la même org.
create or replace function app.can_view_profile(p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app.is_super_admin()
    or exists (
      select 1 from public.profiles t
      where t.id = p_target
        and t.organization_id = app.current_org_id()
        and (
          app.is_admin_staff()
          or t.id = auth.uid()
          or (app.current_role() = 'teacher' and (
                t.role in ('manager','secretary','teacher')
                or exists (
                  select 1 from public.students s
                  where s.profile_id = t.id and app.is_teacher_of_student(s.id)
                )
          ))
          or (app.current_role() = 'student' and t.role in ('secretary','teacher'))
        )
    )
$$;

-- Messagerie enseignant ↔ élève : même organisation, sans assignment.
create or replace function app.can_converse(p_target uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_my_role public.app_role := app.current_role();
  v_my_org uuid := app.current_org_id();
  v_role public.app_role;
  v_org uuid;
  v_target_active boolean;
  v_allow_tt boolean;
begin
  if p_target = auth.uid() then return false; end if;
  select role, organization_id, coalesce(is_active, true)
    into v_role, v_org, v_target_active
    from public.profiles where id = p_target;
  if v_role is null or v_org is null or v_org <> v_my_org then return false; end if;

  if v_my_role in ('manager','secretary','teacher') and v_role in ('manager','secretary','teacher') then
    if v_my_role = 'teacher' and v_role = 'teacher' then
      select allow_teacher_to_teacher into v_allow_tt from public.organizations where id = v_my_org;
      return coalesce(v_allow_tt, false);
    end if;
    return true;
  end if;

  if (v_my_role = 'secretary' and v_role = 'student')
     or (v_my_role = 'student' and v_role = 'secretary') then
    return true;
  end if;

  if v_my_role = 'teacher' and v_role = 'student' then
    return exists (
      select 1 from public.students s
      where s.profile_id = p_target and app.is_teacher_of_student(s.id)
    );
  end if;

  if v_my_role = 'student' and v_role = 'teacher' then
    return v_target_active;
  end if;

  return false;
end
$$;

grant execute on function app.can_access_student_admin_records(uuid) to authenticated, service_role;

-- Documents administratifs (pièces d'identité, etc.)
drop policy if exists documents_select on public.documents;

create policy documents_select on public.documents
  for select using (app.can_access_student_admin_records(student_id));

drop policy if exists "student_docs_read" on storage.objects;

create policy "student_docs_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'student-documents'
    and app.can_access_student_admin_records(nullif(split_part(name, '/', 1), '')::uuid)
  );

drop policy if exists "student_docs_insert" on storage.objects;

create policy "student_docs_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'student-documents'
    and app.can_access_student_admin_records(nullif(split_part(name, '/', 1), '')::uuid)
  );

drop policy if exists "student_docs_delete" on storage.objects;

create policy "student_docs_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'student-documents'
    and app.can_access_student_admin_records(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- Contrats / paiements : pas d'accès enseignant
drop policy if exists contracts_select on public.contracts;

create policy contracts_select on public.contracts
  for select using (app.can_access_student_admin_records(student_id));

drop policy if exists payments_select on public.payments;

create policy payments_select on public.payments
  for select using (app.can_access_student_admin_records(student_id));

drop policy if exists payments_insert_staff on public.payments;

create policy payments_insert_staff on public.payments
  for insert with check (
    organization_id = app.current_org_id()
    and app.can_write_org()
    and app.is_admin_staff()
  );

-- Planning enseignant : uniquement ses rendez-vous. Élève : les siens. Staff admin : l'org.
drop policy if exists appointments_select on public.appointments;

create policy appointments_select on public.appointments
  for select using (
    organization_id = app.current_org_id()
    and (
      app.is_admin_staff()
      or teacher_id = auth.uid()
      or exists (
        select 1 from public.students s
        where s.id = student_id
          and s.profile_id = auth.uid()
          and s.organization_id = app.current_org_id()
      )
    )
  );

-- INSERT/UPDATE : l'élève du RDV doit appartenir à la même organisation (Test E).
drop policy if exists appointments_write on public.appointments;

create policy appointments_write on public.appointments
  for all
  using (
    organization_id = app.current_org_id()
    and (app.is_admin_staff() or teacher_id = auth.uid())
    and (
      student_id is null
      or exists (
        select 1 from public.students s
        where s.id = student_id and s.organization_id = app.current_org_id()
      )
    )
  )
  with check (
    organization_id = app.current_org_id()
    and (app.is_admin_staff() or teacher_id = auth.uid())
    and (
      student_id is null
      or exists (
        select 1 from public.students s
        where s.id = student_id and s.organization_id = app.current_org_id()
      )
    )
  );

-- Assignments historiques : lecture staff admin ou sa propre ligne. Plus de fuite via can_access_student.
drop policy if exists assignments_select on public.student_assignments;

create policy assignments_select on public.student_assignments
  for select using (
    app.is_super_admin()
    or app.is_admin_staff()
    or teacher_id = auth.uid()
  );
