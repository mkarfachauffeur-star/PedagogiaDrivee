-- Répartition des tâches : le planning, les inscriptions, les pré-inscriptions, les paiements,
-- les séances simulateur et les rendez-vous AAC relèvent du secrétariat.
-- Le gérant ne les fait que si son auto-école n'a aucun compte secrétaire actif.
-- Côté application : src/hooks/useSecretaryDuties.js applique la même règle.
-- Chaque règle d'accès reprend la définition en production ; seule la condition
-- « gérant ou secrétaire » devient app.can_act_as_secretary().

create or replace function app.can_act_as_secretary()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when app.is_super_admin() then false
    else coalesce((
      select case
        when p.role = 'secretary' then true
        when p.role = 'manager' then not exists (
          select 1
          from public.profiles s
          where s.organization_id = p.organization_id
            and s.role = 'secretary'
            and s.is_active = true
        )
        else false
      end
      from public.profiles p
      where p.id = auth.uid()
    ), false)
  end;
$$;

comment on function app.can_act_as_secretary() is
  'Vrai pour le secrétariat, et pour le gérant d''une auto-école sans secrétaire actif.';

grant execute on function app.can_act_as_secretary() to authenticated;

-- students (ALL)
alter policy students_write_admin on public.students
  using (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()))
  with check (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()));

-- student_assignments (ALL)
alter policy assignments_write_admin on public.student_assignments
  using ((app.can_act_as_secretary() AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_assignments.student_id) AND (s.organization_id = app.current_org_id()))))))
  with check ((app.can_act_as_secretary() AND (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = student_assignments.student_id) AND (s.organization_id = app.current_org_id()))))));

-- payments (DELETE)
alter policy payments_delete_admin on public.payments
  using (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()));

-- payments (INSERT)
alter policy payments_insert_staff on public.payments
  with check (((organization_id = app.current_org_id()) AND app.can_write_org() AND app.can_act_as_secretary()));

-- payments (UPDATE)
alter policy payments_update_admin on public.payments
  using (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()))
  with check (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()));

-- appointments (ALL)
alter policy appointments_write on public.appointments
  using (((organization_id = app.current_org_id()) AND (app.can_act_as_secretary() OR (teacher_id = auth.uid())) AND ((student_id IS NULL) OR (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = appointments.student_id) AND (s.organization_id = app.current_org_id())))))))
  with check (((organization_id = app.current_org_id()) AND (app.can_act_as_secretary() OR (teacher_id = auth.uid())) AND ((student_id IS NULL) OR (EXISTS ( SELECT 1
   FROM students s
  WHERE ((s.id = appointments.student_id) AND (s.organization_id = app.current_org_id())))))));

-- aac_rvp (ALL)
alter policy aac_rvp_write_staff on public.aac_rvp
  using ((app.can_access_student(student_id) AND ((app."current_role"() = 'teacher'::app_role) OR app.can_act_as_secretary())))
  with check ((app.can_access_student(student_id) AND ((app."current_role"() = 'teacher'::app_role) OR app.can_act_as_secretary())));

-- aac_profiles (ALL)
alter policy aac_profiles_write_staff on public.aac_profiles
  using ((app.can_access_student(student_id) AND ((app."current_role"() = 'teacher'::app_role) OR app.can_act_as_secretary())))
  with check ((app.can_access_student(student_id) AND ((app."current_role"() = 'teacher'::app_role) OR app.can_act_as_secretary())));

-- pre_registrations (UPDATE)
alter policy pre_registrations_update_admin on public.pre_registrations
  using (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()))
  with check (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()));

-- simulator_sessions (DELETE)
alter policy simulator_sessions_delete on public.simulator_sessions
  using (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()));

-- simulator_sessions (INSERT)
alter policy simulator_sessions_insert on public.simulator_sessions
  with check (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()));

-- simulator_sessions (UPDATE)
alter policy simulator_sessions_update on public.simulator_sessions
  using (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()))
  with check (((organization_id = app.current_org_id()) AND app.can_act_as_secretary() AND app.can_write_org()));
