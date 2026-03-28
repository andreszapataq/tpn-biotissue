-- Add is_warehouse flag to institutions
ALTER TABLE public.institutions
ADD COLUMN is_warehouse boolean NOT NULL DEFAULT false;

-- Mark Bodega BioTissue as warehouse
UPDATE public.institutions
SET is_warehouse = true
WHERE code = 'bodega-biotissue';

-- Update get_idle_machines to exclude warehouse institutions
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
        -- Last activity via procedure_machines junction table
        (select max(coalesce(p.updated_at, p.created_at))
         from public.procedure_machines pm
         inner join public.procedures p on p.id = pm.procedure_id
         where pm.machine_id = m.id and p.status <> 'active'),
        -- Last activity via legacy machine_id FK
        (select max(coalesce(p.updated_at, p.created_at))
         from public.procedures p
         where p.machine_id = m.id and p.status <> 'active')
      ) as last_activity_at
    from public.machines m
    join public.institutions i on i.id = m.institution_id
    where m.status = 'active'
      and i.is_warehouse = false
      and public.has_institution_access(m.institution_id)
      -- Not currently connected to any active procedure (via junction or legacy)
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
