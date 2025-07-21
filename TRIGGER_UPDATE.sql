-- 🔧 Actualización del Trigger para Rol Financiero
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Actualizar la función handle_new_user para incluir "financiero"
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, name, role, phone, department, license_number, is_active, mfa_enabled)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'soporte'), -- Default a soporte si no hay rol
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'department', 
    NEW.raw_user_meta_data->>'license_number',
    true,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Asegurar que el trigger existe y está activo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 3. Verificar que el trigger funciona correctamente
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- 4. (OPCIONAL) Corregir el usuario existente mal creado
-- Descomenta las siguientes líneas si necesitas corregir el usuario "gerencia@biotissue.com.co"

/*
UPDATE public.users 
SET 
  name = 'Victor Cadena',
  role = 'financiero',
  phone = '+573176644408',
  department = 'BioTissue',
  updated_at = NOW()
WHERE email = 'gerencia@biotissue.com.co';

-- Verificar la corrección
SELECT id, email, name, role, phone, department 
FROM public.users 
WHERE email = 'gerencia@biotissue.com.co';
*/ 