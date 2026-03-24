-- Add is_archived column to inventory_products
ALTER TABLE public.inventory_products
  ADD COLUMN is_archived boolean NOT NULL DEFAULT false;

-- Update get_low_stock_products() (no params) to exclude archived
CREATE OR REPLACE FUNCTION public.get_low_stock_products()
 RETURNS TABLE(id uuid, name character varying, code character varying, category character varying, stock integer, minimum_stock integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.name,
    p.code,
    p.category,
    coalesce(p.stock, 0) as stock,
    coalesce(p.minimum_stock, 0) as minimum_stock
  from public.inventory_products p
  where coalesce(p.stock, 0) <= coalesce(p.minimum_stock, 0)
    and p.is_archived = false
  order by coalesce(p.stock, 0) asc, p.name asc;
$function$;

-- Update get_low_stock_products(target_institution_id) to exclude archived
CREATE OR REPLACE FUNCTION public.get_low_stock_products(target_institution_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, name character varying, code character varying, category character varying, stock integer, minimum_stock integer, institution_id uuid)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select
    p.id,
    p.name,
    p.code,
    p.category,
    coalesce(p.stock, 0) as stock,
    coalesce(p.minimum_stock, 0) as minimum_stock,
    p.institution_id
  from public.inventory_products p
  where coalesce(p.stock, 0) <= coalesce(p.minimum_stock, 0)
    and p.is_archived = false
    and public.has_institution_access(p.institution_id)
    and (target_institution_id is null or p.institution_id = target_institution_id)
  order by coalesce(p.stock, 0) asc, p.name asc;
$function$;
