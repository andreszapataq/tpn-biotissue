-- Add completed_at timestamp to procedures
ALTER TABLE public.procedures
ADD COLUMN completed_at timestamp with time zone;

-- Temporarily disable user triggers for backfill
ALTER TABLE public.procedures DISABLE TRIGGER USER;

-- Backfill: for existing completed procedures, use updated_at as best available proxy
UPDATE public.procedures
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;

-- Re-enable user triggers
ALTER TABLE public.procedures ENABLE TRIGGER USER;

-- Update get_idle_machines to use completed_at
CREATE OR REPLACE FUNCTION public.get_idle_machines(hours_threshold integer DEFAULT 72)
 RETURNS TABLE(machine_id uuid, institution_id uuid, institution_name text, machine_model character varying, machine_lote character varying, last_activity_at timestamp with time zone, idle_hours numeric, never_used boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with machine_activity as (
    select
      m.id as machine_id,
      m.institution_id,
      i.name as institution_name,
      m.model as machine_model,
      m.lote as machine_lote,
      greatest(
        -- Last completed_at via procedure_machines junction table
        (select max(p.completed_at)
         from public.procedure_machines pm
         inner join public.procedures p on p.id = pm.procedure_id
         where pm.machine_id = m.id and p.status = 'completed' and p.completed_at is not null),
        -- Last completed_at via legacy machine_id FK
        (select max(p.completed_at)
         from public.procedures p
         where p.machine_id = m.id and p.status = 'completed' and p.completed_at is not null),
        -- Transfer date to current institution (machine just arrived, don't flag yet)
        (select max(mt.transfer_date)
         from public.machine_transfers mt
         where mt.machine_id = m.id
           and mt.to_institution_id = m.institution_id)
      ) as last_activity_at
    from public.machines m
    join public.institutions i on i.id = m.institution_id
    where m.status = 'active'
      and i.is_warehouse = false
      and public.has_institution_access(m.institution_id)
      -- Not currently connected to any active procedure
      and not exists (
        select 1
        from public.procedure_machines pm
        inner join public.procedures ap on ap.id = pm.procedure_id
        where pm.machine_id = m.id
          and ap.status = 'active'
      )
      and not exists (
        select 1
        from public.procedures ap
        where ap.machine_id = m.id
          and ap.status = 'active'
      )
  )
  select
    machine_id,
    institution_id,
    institution_name,
    machine_model,
    machine_lote,
    last_activity_at,
    case
      when last_activity_at is null then null
      else round((extract(epoch from (now() - last_activity_at)) / 3600.0)::numeric, 1)
    end as idle_hours,
    (last_activity_at is null) as never_used
  from machine_activity
  where last_activity_at is null
     or last_activity_at <= now() - make_interval(hours => hours_threshold)
  order by never_used desc, idle_hours desc nulls last, institution_name asc, machine_lote asc;
$function$;
