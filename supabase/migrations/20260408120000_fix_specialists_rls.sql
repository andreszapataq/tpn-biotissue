-- Fix specialists RLS policies: old policies compared user_institutions.user_id
-- (which references users.id) against auth.uid() (auth UUID) — they never matched.
-- Replace with has_institution_access / has_institution_role which correctly join
-- through users.auth_id = auth.uid().

DROP POLICY IF EXISTS "Users can insert specialists in their institution" ON specialists;
DROP POLICY IF EXISTS "Users can update specialists in their institution" ON specialists;
DROP POLICY IF EXISTS "Users can view specialists in their institution" ON specialists;

CREATE POLICY "Users can view specialists in their institution"
  ON specialists FOR SELECT
  TO authenticated
  USING (has_institution_access(institution_id));

CREATE POLICY "Users can insert specialists in their institution"
  ON specialists FOR INSERT
  TO authenticated
  WITH CHECK (has_institution_role(institution_id, ARRAY['administrador', 'soporte', 'asistente']));

CREATE POLICY "Users can update specialists in their institution"
  ON specialists FOR UPDATE
  TO authenticated
  USING (has_institution_role(institution_id, ARRAY['administrador', 'soporte', 'asistente']))
  WITH CHECK (has_institution_role(institution_id, ARRAY['administrador', 'soporte', 'asistente']));
