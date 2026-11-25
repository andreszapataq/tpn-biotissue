-- Bloqueo de usuarios inactivos y protección de columnas privilegiadas en public.users

-- 1. Un usuario inactivo no tiene rol efectivo: pierde has_global_visibility()
--    y has_platform_admin_access() (has_institution_access/role ya validaban is_active).
create or replace function public.current_app_user_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $function$
  select u.role::text
  from public.users u
  where u.auth_id = auth.uid()
    and u.is_active = true
  limit 1;
$function$;

-- 2. La política de UPDATE permite que cada usuario edite su propia fila.
--    Este trigger impide que un usuario que no es admin cambie su rol, estado,
--    institución o identidad (escalada de privilegios / auto-reactivación).
--    El service role y el SQL editor (auth.uid() nulo) no se ven afectados.
create or replace function public.protect_users_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.uid() is null or public.has_platform_admin_access() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.auth_id is distinct from old.auth_id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or (old.institution_id is not null and new.institution_id is distinct from old.institution_id)
  then
    raise exception 'No autorizado para modificar rol, estado o institución del usuario'
      using errcode = '42501';
  end if;

  return new;
end;
$function$;

create trigger protect_users_privileged_columns
  before update on public.users
  for each row execute function public.protect_users_privileged_columns();
