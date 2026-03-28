-- Fix: count active patients by active procedures instead of patient.status
-- Patient.status can be stale (e.g. 'completed' while still having active procedures)
CREATE OR REPLACE FUNCTION public.get_institutions_live_status()
 RETURNS TABLE(institution_id uuid, institution_name text, institution_code text, active_patients bigint, active_procedures bigint, total_machines bigint, connected_machines bigint, available_machines bigint, maintenance_machines bigint, inactive_machines bigint, last_activity_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  with visible_institutions as (
    select i.id, i.name, i.code
    from public.institutions i
    where public.has_institution_access(i.id)
  ),
  -- Count patients who have at least one active procedure (not by patient.status)
  patient_stats as (
    select pr.institution_id, count(distinct pr.patient_id) as active_patients
    from public.procedures pr
    where pr.status = 'active'
      and pr.patient_id is not null
    group by pr.institution_id
  ),
  procedure_stats as (
    select
      pr.institution_id,
      count(*) filter (where pr.status = 'active') as active_procedures,
      max(coalesce(pr.updated_at, pr.created_at)) as last_activity_at
    from public.procedures pr
    group by pr.institution_id
  ),
  -- Connected machines: union of procedure_machines junction table + legacy FK
  connected_machine_stats as (
    select institution_id, count(distinct machine_id) as connected_machines
    from (
      select pm.institution_id, pm.machine_id
      from public.procedure_machines pm
      inner join public.procedures p on p.id = pm.procedure_id
      where p.status = 'active'
      UNION
      select p.institution_id, p.machine_id
      from public.procedures p
      where p.status = 'active' and p.machine_id is not null
    ) all_connections
    group by institution_id
  ),
  machine_stats as (
    select
      m.institution_id,
      count(*) filter (where m.status in ('active', 'maintenance')) as total_machines,
      count(*) filter (where m.status = 'maintenance') as maintenance_machines,
      count(*) filter (where m.status = 'inactive') as inactive_machines,
      count(*) filter (
        where m.status = 'active'
          and not exists (
            select 1
            from public.procedure_machines pm
            inner join public.procedures p on p.id = pm.procedure_id
            where pm.machine_id = m.id
              and p.status = 'active'
          )
          and not exists (
            select 1
            from public.procedures p
            where p.machine_id = m.id
              and p.status = 'active'
          )
      ) as available_machines
    from public.machines m
    group by m.institution_id
  )
  select
    vi.id as institution_id,
    vi.name as institution_name,
    vi.code as institution_code,
    coalesce(ps.active_patients, 0) as active_patients,
    coalesce(prs.active_procedures, 0) as active_procedures,
    coalesce(ms.total_machines, 0) as total_machines,
    coalesce(cms.connected_machines, 0) as connected_machines,
    coalesce(ms.available_machines, 0) as available_machines,
    coalesce(ms.maintenance_machines, 0) as maintenance_machines,
    coalesce(ms.inactive_machines, 0) as inactive_machines,
    prs.last_activity_at
  from visible_institutions vi
  left join patient_stats ps on ps.institution_id = vi.id
  left join procedure_stats prs on prs.institution_id = vi.id
  left join connected_machine_stats cms on cms.institution_id = vi.id
  left join machine_stats ms on ms.institution_id = vi.id
  order by vi.name asc;
$function$;
