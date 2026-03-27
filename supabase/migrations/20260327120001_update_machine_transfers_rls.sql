-- Update machine_transfers RLS to allow soporte role to manage transfers
-- Previously only administrador and admin_institucional could manage transfers

DROP POLICY IF EXISTS "Only admins can manage machine transfers" ON machine_transfers;

CREATE POLICY "Authorized roles can manage machine transfers"
  ON machine_transfers FOR ALL
  USING (has_institution_role(
    COALESCE(from_institution_id, to_institution_id),
    ARRAY['administrador', 'soporte']
  ))
  WITH CHECK (has_institution_role(
    COALESCE(from_institution_id, to_institution_id),
    ARRAY['administrador', 'soporte']
  ));
