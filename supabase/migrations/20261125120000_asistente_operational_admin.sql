-- Asistente pasa a ser "Administrador sin administración de usuarios":
--   * Visibilidad global (Vista Global / dashboard-global), igual que administrador y gerente.
--   * Mismas capacidades operativas que administrador en las instituciones donde tiene membresía:
--     máquinas (crear/editar/eliminar), traslados, inventario (crear productos, ajustar stock).
--   * NO puede gestionar usuarios, membresías ni instituciones (sigue siendo has_platform_admin_access()).
-- Además, asistente deja de ser un rol auto-registrable: solo soporte puede crear su propio perfil.
-- Se usa ALTER POLICY (no DROP/CREATE) para no dejar ningún instante sin política.

-- 1. Visibilidad global
create or replace function public.has_global_visibility()
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(public.current_app_user_role() = any (array['administrador','gerente','asistente']), false);
$function$;

-- 2. Máquinas
alter policy "Authorized roles can insert machines" on public.machines
  with check (has_institution_role(coalesce(institution_id, current_institution_id()), array['administrador','soporte','asistente']));

alter policy "Authorized roles can update machines" on public.machines
  using (has_institution_role(institution_id, array['administrador','soporte','asistente']))
  with check (has_institution_role(institution_id, array['administrador','soporte','asistente']));

alter policy "Only admins can delete machines" on public.machines
  using (has_institution_role(institution_id, array['administrador','asistente']));

-- 3. Traslados de máquinas
alter policy "Authorized roles can insert machine transfers" on public.machine_transfers
  to authenticated
  with check (has_institution_role(coalesce(from_institution_id, to_institution_id), array['administrador','soporte','asistente']));

alter policy "Authorized roles can update machine transfers" on public.machine_transfers
  to authenticated
  using (has_institution_role(coalesce(from_institution_id, to_institution_id), array['administrador','soporte','asistente']))
  with check (has_institution_role(coalesce(from_institution_id, to_institution_id), array['administrador','soporte','asistente']));

alter policy "Authorized roles can delete machine transfers" on public.machine_transfers
  to authenticated
  using (has_institution_role(coalesce(from_institution_id, to_institution_id), array['administrador','soporte','asistente']));

-- 4. Inventario
alter policy "Admins can create inventory products" on public.inventory_products
  with check (has_institution_role(coalesce(institution_id, current_institution_id()), array['administrador','asistente']));

alter policy "Admins can update inventory movements" on public.inventory_movements
  using (has_institution_role(institution_id, array['administrador','asistente']))
  with check (has_institution_role(institution_id, array['administrador','asistente']));

-- 5. Auto-registro: asistente ya no es un rol de bajo privilegio
alter policy "Users can insert their own low privilege profile" on public.users
  with check ((auth_id = (select auth.uid())) and ((role)::text = 'soporte'));
