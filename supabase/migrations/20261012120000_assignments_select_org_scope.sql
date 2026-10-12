-- Affectations élève / enseignant : lecture limitée à l'organisation.
-- La politique du 15/08 laissait tout gérant ou secrétariat lire les affectations
-- de toutes les auto-écoles, et l'élève ne voyait pas les siennes.

drop policy if exists assignments_select on public.student_assignments;

create policy assignments_select on public.student_assignments
  for select using (
    app.is_super_admin()
    or teacher_id = auth.uid()
    or exists (
      select 1
      from public.students s
      where s.id = student_assignments.student_id
        and (
          (app.is_admin_staff() and s.organization_id = app.current_org_id())
          or s.profile_id = auth.uid()
        )
    )
  );
