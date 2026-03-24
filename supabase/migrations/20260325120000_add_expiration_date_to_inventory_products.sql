-- Add expiration_date column to inventory_products
ALTER TABLE public.inventory_products
  ADD COLUMN expiration_date DATE NULL;
