-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- Niveau pédagogique enseignant par compétence REMC (C1–C4)
--
-- L'enseignant ne saisit plus les statuts des sous-compétences : la progression
-- « Non commencé / En cours / Validé » relève du travail personnel de l'élève
-- (leçons + QCU maison, cf. student_lesson_module_progress).
-- L'enseignant positionne chaque compétence sur :
--   non_aborde < aborde < traite < assimile
-- « assimile » vaut validation de la compétence et débloque la suivante.

create table if not exists public.student_remc_competency_levels (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  competency_code text not null check (competency_code in ('C1', 'C2', 'C3', 'C4')),
  level text not null default 'non_aborde'
    check (level in ('non_aborde', 'aborde', 'traite', 'assimile')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (student_id, competency_code)
);

create index if not exists idx_student_remc_competency_levels_student
  on public.student_remc_competency_levels (student_id);

create index if not exists idx_student_remc_competency_levels_org
  on public.student_remc_competency_levels (organization_id);

comment on table public.student_remc_competency_levels is
  'Niveau d''acquisition REMC saisi par l''enseignant pour chaque compétence C1–C4.';

-- ─── Historique ─────────────────────────────────────────────────────────────

alter table public.student_remc_history
  drop constraint if exists student_remc_history_record_type_check;

alter table public.student_remc_history
  add constraint student_remc_history_record_type_check
  check (record_type in ('item', 'competency', 'competency_level'));

create or replace function app.log_remc_competency_level_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and OLD.level is not distinct from NEW.level then
    return NEW;
  end if;

  insert into public.student_remc_history (
    organization_id, student_id, record_type, competency_code, item_id,
    previous_status, new_status, changed_by, change_source
  ) values (
    NEW.organization_id, NEW.student_id, 'competency_level', NEW.competency_code, null,
    case when TG_OP = 'UPDATE' then OLD.level else null end,
    NEW.level, NEW.updated_by, 'manual'
  );

  return NEW;
end;
$$;

drop trigger if exists trg_log_remc_competency_level_history
  on public.student_remc_competency_levels;

create trigger trg_log_remc_competency_level_history
  after insert or update on public.student_remc_competency_levels
  for each row execute function app.log_remc_competency_level_history();

-- ─── RLS ────────────────────────────────────────────────────────────────────

alter table public.student_remc_competency_levels enable row level security;

drop policy if exists student_remc_competency_levels_select
  on public.student_remc_competency_levels;

create policy student_remc_competency_levels_select on public.student_remc_competency_levels
  for select using (
    organization_id = app.current_org_id()
    and (
      app.is_admin_staff()
      or app.is_teacher_of_student(student_id)
      or exists (
        select 1 from public.students s
        where s.id = student_id and s.profile_id = auth.uid()
      )
    )
  );

-- Écriture réservée aux enseignants affectés et au staff admin
drop policy if exists student_remc_competency_levels_write
  on public.student_remc_competency_levels;

create policy student_remc_competency_levels_write on public.student_remc_competency_levels
  for all
  using (
    organization_id = app.current_org_id()
    and app.can_write_org()
    and (app.is_admin_staff() or app.is_teacher_of_student(student_id))
  )
  with check (
    organization_id = app.current_org_id()
    and app.can_write_org()
    and (app.is_admin_staff() or app.is_teacher_of_student(student_id))
  );

-- ─── Realtime ───────────────────────────────────────────────────────────────

do $$ begin
  alter publication supabase_realtime add table public.student_remc_competency_levels;
exception when duplicate_object then null;
end $$;
