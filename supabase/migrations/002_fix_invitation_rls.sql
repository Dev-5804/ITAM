-- Allow users to view invitations sent to their email address
CREATE POLICY "Users can view their own invitations"
  ON invitations FOR SELECT
  USING (email ILIKE auth.email());

-- Allow users to update invitations sent to them (for accepting)
CREATE POLICY "Users can accept their own invitations"
  ON invitations FOR UPDATE
  USING (email ILIKE auth.email())
  WITH CHECK (email ILIKE auth.email());

-- Allow users to delete invitations sent to them (for declining)
CREATE POLICY "Users can decline their own invitations"
  ON invitations FOR DELETE
  USING (email ILIKE auth.email());
