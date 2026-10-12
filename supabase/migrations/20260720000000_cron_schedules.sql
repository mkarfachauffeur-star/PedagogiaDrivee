-- Migration appliquée directement en production, recopiée depuis supabase_migrations.schema_migrations le 12/10/2026.

-- =============================================================================
-- PEDAGOGIA DRIVE — Planification cron (pg_cron + pg_net)
-- =============================================================================
-- Planifie les 4 Edge Functions de rappels via HTTP POST sécurisé.
--
-- PRÉREQUIS (une seule fois, AVANT d'appliquer cette migration) :
--   Le secret Edge Function CRON_SECRET (supabase secrets set) est DISTINCT
--   de Supabase Vault. Copiez la même valeur dans Vault :
--
--   SELECT vault.create_secret(
--     '<votre-CRON_SECRET>',
--     'CRON_SECRET',
--     'Header x-cron-secret pour les Edge Functions cron Pedagogia Drive'
--   );
--
--   Si le secret existe déjà dans Vault, cette migration ne le modifie pas.
--
-- IDEMPOTENCE : chaque job n'est créé que s'il n'existe pas déjà (cron.job.jobname).
-- SÉCURITÉ    : CRON_SECRET lu depuis vault.decrypted_secrets à chaque exécution
--               (jamais stocké en clair dans le corps du job).
-- =============================================================================

-- Extensions requises (disponibles sur Free / Pro / Team)
create extension if not exists pg_cron with schema pg_catalog;

create extension if not exists pg_net with schema extensions;

-- Garde-fou : Vault doit contenir CRON_SECRET avant de créer les jobs
do $$
begin
  if not exists (
    select 1
    from vault.secrets
    where name = 'CRON_SECRET'
  ) then
    raise exception
      'Vault secret "CRON_SECRET" introuvable. '
      'Exécutez d''abord : SELECT vault.create_secret(''<valeur>'', ''CRON_SECRET'', ''Cron Edge Functions''); '
      'Utilisez la même valeur que le secret Edge Function CRON_SECRET.';
  end if;
end;
$$;

-- URL publique du projet (non secrète). Adapter si le project ref change.
-- Les fonctions lisent CRON_SECRET depuis Vault à l'exécution.
do $schedule$
declare
  v_fn_base constant text := 'https://watdeahravfccjdoseaf.supabase.co/functions/v1/';
  v_headers_sql constant text := $hdr$
    jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'CRON_SECRET'
        limit 1
      )
    )
  $hdr$;
begin
  -- -------------------------------------------------------------------------
  -- 1. Rappels code de la route (hebdomadaire)
  --    Edge Function : check-automated-reminders
  --    Métier        : élèves sans code obtenu → notification secrétaires
  --    Cron UTC      : 0 6 * * 1  (~ lundi 08h Europe/Paris en été ; ajuster 0 7 en hiver)
  -- -------------------------------------------------------------------------
  if not exists (
    select 1 from cron.job where jobname = 'pedagogia-automated-reminders'
  ) then
    perform cron.schedule(
      'pedagogia-automated-reminders',
      '0 6 * * 1',
      format(
        $job$
        select net.http_post(
          url := %L,
          headers := %s,
          body := '{}'::jsonb
        );
        $job$,
        v_fn_base || 'check-automated-reminders',
        v_headers_sql
      )
    );
  end if;

  -- -------------------------------------------------------------------------
  -- 2. Alertes J-15 (quotidien)
  --    Edge Function : check-expiration-reminders
  --    Métier        : CT véhicules, autorisations enseignant / simulateur
  --    Cron UTC      : 0 5 * * *  (~ 07h Paris en été)
  -- -------------------------------------------------------------------------
  if not exists (
    select 1 from cron.job where jobname = 'pedagogia-expiration-reminders'
  ) then
    perform cron.schedule(
      'pedagogia-expiration-reminders',
      '0 5 * * *',
      format(
        $job$
        select net.http_post(
          url := %L,
          headers := %s,
          body := '{}'::jsonb
        );
        $job$,
        v_fn_base || 'check-expiration-reminders',
        v_headers_sql
      )
    );
  end if;

  -- -------------------------------------------------------------------------
  -- 3. Contrôle flotte thermique (mensuel)
  --    Edge Function : check-fleet-maintenance-reminders
  --    Métier        : pneus, liquides, huile — notification gérants
  --    Cron UTC      : 0 6 1 * *  (1er du mois ~ 08h Paris en été)
  -- -------------------------------------------------------------------------
  if not exists (
    select 1 from cron.job where jobname = 'pedagogia-fleet-maintenance'
  ) then
    perform cron.schedule(
      'pedagogia-fleet-maintenance',
      '0 6 1 * *',
      format(
        $job$
        select net.http_post(
          url := %L,
          headers := %s,
          body := '{}'::jsonb
        );
        $job$,
        v_fn_base || 'check-fleet-maintenance-reminders',
        v_headers_sql
      )
    );
  end if;

  -- -------------------------------------------------------------------------
  -- 4. Expiration accès élève J-15 (quotidien)
  --    Edge Function : check-student-access-expiry
  --    Métier        : avertissement + emails Resend si configurés
  --    Cron UTC      : 0 4 * * *  (~ 06h Paris en été)
  -- -------------------------------------------------------------------------
  if not exists (
    select 1 from cron.job where jobname = 'pedagogia-student-access-expiry'
  ) then
    perform cron.schedule(
      'pedagogia-student-access-expiry',
      '0 4 * * *',
      format(
        $job$
        select net.http_post(
          url := %L,
          headers := %s,
          body := '{}'::jsonb
        );
        $job$,
        v_fn_base || 'check-student-access-expiry',
        v_headers_sql
      )
    );
  end if;
end;
$schedule$;
