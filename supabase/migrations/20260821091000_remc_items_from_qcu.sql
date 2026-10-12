-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- Synchronisation travail personnel de l'élève → sous-compétences REMC
--
-- L'enseignant ne saisit plus les statuts des sous-compétences : ils découlent
-- des leçons lues et des QCU réussis par l'élève.
--   leçon lue (sans QCU réussi) → « En cours »
--   QCU réussi                  → « Validé » (jamais rétrogradé ensuite)

create table if not exists public.remc_lesson_module_items (
  module_id text not null,
  competency_code text not null check (competency_code in ('C1', 'C2', 'C3', 'C4')),
  item_id text not null,
  primary key (module_id, item_id)
);

comment on table public.remc_lesson_module_items is
  'Correspondance module pédagogique (leçon + QCU) → sous-compétence REMC.';

insert into public.remc_lesson_module_items (module_id, competency_code, item_id) values
  ('SC1.1', 'C1', 'c1a'),
  ('SC1.2', 'C1', 'c1b'),
  ('SC1.3', 'C1', 'c1c'),
  ('SC1.4', 'C1', 'c1d'),
  ('SC1.5', 'C1', 'c1e'),
  ('SC1.6', 'C1', 'c1f'),
  ('SC1.7', 'C1', 'c1g'),
  ('SC1.7', 'C1', 'c1i'),
  ('SC1.8', 'C1', 'c1h')
on conflict (module_id, item_id) do update
  set competency_code = excluded.competency_code;

alter table public.remc_lesson_module_items enable row level security;

-- Catalogue statique : lecture ouverte aux utilisateurs authentifiés
drop policy if exists remc_lesson_module_items_select on public.remc_lesson_module_items;

create policy remc_lesson_module_items_select on public.remc_lesson_module_items
  for select to authenticated using (true);

-- ─── Trigger de synchronisation ─────────────────────────────────────────────

create or replace function app.sync_remc_items_from_lesson_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_status text;
begin
  target_status := case
    when NEW.qcu_passed then 'Validé'
    when NEW.course_read_complete then 'En cours'
    else null
  end;

  if target_status is null then
    return NEW;
  end if;

  insert into public.student_remc_item_progress (
    organization_id, student_id, competency_code, item_id, status, updated_at, updated_by
  )
  select NEW.organization_id, NEW.student_id, m.competency_code, m.item_id,
         target_status, now(), null
  from public.remc_lesson_module_items m
  where m.module_id = NEW.module_id
  on conflict (student_id, item_id) do update
    set status = excluded.status,
        updated_at = excluded.updated_at,
        organization_id = excluded.organization_id,
        competency_code = excluded.competency_code
    where student_remc_item_progress.status <> 'Validé'
      and student_remc_item_progress.status is distinct from excluded.status;

  return NEW;
end;
$$;

drop trigger if exists trg_sync_remc_items_from_lesson_progress
  on public.student_lesson_module_progress;

create trigger trg_sync_remc_items_from_lesson_progress
  after insert or update of qcu_passed, course_read_complete
  on public.student_lesson_module_progress
  for each row execute function app.sync_remc_items_from_lesson_progress();

-- ─── Rattrapage de l'existant ───────────────────────────────────────────────

insert into public.student_remc_item_progress (
  organization_id, student_id, competency_code, item_id, status, updated_at
)
select distinct on (p.student_id, m.item_id)
  p.organization_id, p.student_id, m.competency_code, m.item_id,
  case when p.qcu_passed then 'Validé' else 'En cours' end, now()
from public.student_lesson_module_progress p
join public.remc_lesson_module_items m on m.module_id = p.module_id
where p.qcu_passed or p.course_read_complete
order by p.student_id, m.item_id, p.qcu_passed desc
on conflict (student_id, item_id) do update
  set status = excluded.status,
      updated_at = now()
  where student_remc_item_progress.status <> 'Validé'
    and student_remc_item_progress.status is distinct from excluded.status;
