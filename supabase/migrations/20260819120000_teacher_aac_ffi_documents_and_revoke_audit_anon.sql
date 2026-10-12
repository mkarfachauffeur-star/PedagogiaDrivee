-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- Additive. Ne pas réexécuter les migrations 20260715–20260815.

-- 1) FFI pédagogique : enseignant même org (lecture + dépôt)
create or replace function app.is_aac_ffi_document(p_type text, p_folder text)
returns boolean
language sql
immutable
as $$
  select p_type = 'Attestation FFI' and coalesce(p_folder, '') = 'AAC'
$$;

drop policy if exists documents_select_teacher_aac_ffi on public.documents;

create policy documents_select_teacher_aac_ffi on public.documents
  for select
  using (
    app.current_role() = 'teacher'
    and app.can_access_student(student_id)
    and app.is_aac_ffi_document(type, folder)
  );

drop policy if exists documents_insert_teacher_aac_ffi on public.documents;

create policy documents_insert_teacher_aac_ffi on public.documents
  for insert
  with check (
    organization_id = app.current_org_id()
    and app.current_role() = 'teacher'
    and app.can_write_org()
    and app.can_access_student(student_id)
    and app.is_aac_ffi_document(type, folder)
  );

-- Storage : uniquement {student_id}/ffi-*
drop policy if exists student_docs_teacher_aac_ffi_read on storage.objects;

create policy student_docs_teacher_aac_ffi_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'student-documents'
    and app.current_role() = 'teacher'
    and split_part(name, '/', 2) like 'ffi-%'
    and app.can_access_student(nullif(split_part(name, '/', 1), '')::uuid)
  );

drop policy if exists student_docs_teacher_aac_ffi_insert on storage.objects;

create policy student_docs_teacher_aac_ffi_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'student-documents'
    and app.current_role() = 'teacher'
    and app.can_write_org()
    and split_part(name, '/', 2) like 'ffi-%'
    and app.can_access_student(nullif(split_part(name, '/', 1), '')::uuid)
  );

-- Defense in depth : lier seulement un vrai FFI du même élève
create or replace function app.link_aac_ffi(p_student_id uuid, p_document_id uuid, p_storage_path text)
returns public.aac_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.aac_profiles;
begin
  if not app.can_access_student(p_student_id) then
    raise exception 'Accès refusé';
  end if;

  if not exists (
    select 1 from public.documents d
    where d.id = p_document_id
      and d.student_id = p_student_id
      and d.organization_id = app.current_org_id()
      and app.is_aac_ffi_document(d.type, d.folder)
      and d.storage_path = p_storage_path
      and d.storage_path like p_student_id::text || '/ffi-%'
  ) then
    raise exception 'Document FFI AAC introuvable ou non autorisé.';
  end if;

  perform app.ensure_aac_profile(p_student_id, null);

  update public.aac_profiles
  set
    ffi_document_id = p_document_id,
    ffi_storage_path = p_storage_path,
    updated_at = now()
  where student_id = p_student_id
  returning * into v_profile;

  return v_profile;
end;
$$;

-- 2) Audit : plus d'EXECUTE anon (corps inchangé)
revoke execute on function public.log_audit_event(
  public.audit_action, text, uuid, text, jsonb, uuid
) from anon;
