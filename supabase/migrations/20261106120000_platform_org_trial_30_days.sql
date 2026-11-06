-- Les auto-écoles créées par le Super Admin démarrent avec 30 jours d'essai.
-- Le plan Starter a trial_days = 0 : coalesce(0, 30) donnait 0 jour, donc un essai
-- terminé dès la création. Un 0 est maintenant traité comme « pas de durée définie ».

CREATE OR REPLACE FUNCTION public.platform_create_organization(p_name text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid;
  v_plan_id uuid;
  v_trial_days int := 30;
  v_trial_ends timestamptz;
begin
  if not app.is_super_admin() then
    raise exception 'Accès réservé au Super Admin';
  end if;

  if coalesce(trim(p_name), '') = '' then
    raise exception 'Le nom de l''auto-école est obligatoire';
  end if;

  insert into public.organizations (name, email, phone, status)
  values (trim(p_name), nullif(trim(p_email), ''), nullif(trim(p_phone), ''), 'trial')
  returning id into v_org_id;

  select id, coalesce(nullif(trial_days, 0), 30) into v_plan_id, v_trial_days
  from public.plans
  where code = 'starter' and is_active = true
  limit 1;

  if v_plan_id is null then
    select id, coalesce(nullif(trial_days, 0), 30) into v_plan_id, v_trial_days
    from public.plans where code = 'trial' limit 1;
  end if;

  if v_plan_id is not null then
    v_trial_ends := now() + make_interval(days => v_trial_days);
    insert into public.subscriptions (
      organization_id, plan_id, status,
      trial_ends_at, current_period_start, current_period_end,
      metadata
    ) values (
      v_org_id, v_plan_id, 'active',
      v_trial_ends, now(), v_trial_ends,
      jsonb_build_object('trial_phase', true, 'plan_target', 'starter')
    );
  end if;

  perform app.seed_default_packages(v_org_id);

  insert into public.billing_history (organization_id, event_type, new_value, notes)
  values (
    v_org_id,
    'trial_started',
    jsonb_build_object('source', 'platform_super_admin', 'plan', 'starter', 'trial_days', v_trial_days),
    'Essai gratuit 30 jours — plan Starter'
  );

  insert into public.audit_logs (
    organization_id, actor_id, actor_role, action, entity_type, entity_id, entity_label, metadata
  ) values (
    v_org_id,
    auth.uid(),
    'super_admin',
    'create',
    'organizations',
    v_org_id,
    trim(p_name),
    jsonb_build_object('name', trim(p_name), 'status', 'trial', 'plan', 'starter')
  );

  return v_org_id;
end;
$function$;
