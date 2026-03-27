-- ============================================================
-- Fix: procedure_machines RLS policies
-- Problem: All 4 policies used "true" as condition, allowing
-- any authenticated user to read/write ANY institution's data
-- Fix: Apply same pattern as procedure_products table
-- ============================================================

-- Drop existing wide-open policies
DROP POLICY IF EXISTS "Allow authenticated read" ON procedure_machines;
DROP POLICY IF EXISTS "Allow authenticated insert" ON procedure_machines;
DROP POLICY IF EXISTS "Allow authenticated update" ON procedure_machines;
DROP POLICY IF EXISTS "Allow authenticated delete" ON procedure_machines;

-- SELECT: only institutions the user has access to
CREATE POLICY "Users can view procedure machines from their institutions"
  ON procedure_machines FOR SELECT
  USING (has_institution_access(institution_id));

-- INSERT: operational roles within the institution
CREATE POLICY "Operational roles can insert procedure machines"
  ON procedure_machines FOR INSERT
  WITH CHECK (has_institution_role(
    COALESCE(institution_id, current_institution_id()),
    ARRAY['administrador','soporte','asistente']
  ));

-- UPDATE: operational roles within the institution
CREATE POLICY "Operational roles can update procedure machines"
  ON procedure_machines FOR UPDATE
  USING (has_institution_role(institution_id, ARRAY['administrador','soporte','asistente']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['administrador','soporte','asistente']));

-- DELETE: operational roles within the institution
CREATE POLICY "Operational roles can delete procedure machines"
  ON procedure_machines FOR DELETE
  USING (has_institution_role(institution_id, ARRAY['administrador','soporte','asistente']));
