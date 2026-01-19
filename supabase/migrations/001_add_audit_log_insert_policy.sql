-- Add INSERT policy for audit_logs
-- Allow organization members to insert audit logs for their organization
CREATE POLICY "Members can create audit logs for their organization"
  ON audit_logs FOR INSERT
  WITH CHECK (is_organization_member(organization_id, auth.uid()));
