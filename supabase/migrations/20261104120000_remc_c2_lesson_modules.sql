-- Compétence 2 : relie chaque module (leçon + QCU) à sa sous-compétence REMC.
-- Le déclencheur app.sync_remc_items_from_lesson_progress() met ensuite à jour le livret :
--   leçon lue → « En cours », QCU réussi → « Validé ».

insert into public.remc_lesson_module_items (module_id, competency_code, item_id) values
  ('SC2.1', 'C2', 'c2a'),
  ('SC2.2', 'C2', 'c2b'),
  ('SC2.3', 'C2', 'c2c'),
  ('SC2.4', 'C2', 'c2d'),
  ('SC2.5', 'C2', 'c2e'),
  ('SC2.6', 'C2', 'c2f'),
  ('SC2.7', 'C2', 'c2g')
on conflict (module_id, item_id) do update
  set competency_code = excluded.competency_code;
