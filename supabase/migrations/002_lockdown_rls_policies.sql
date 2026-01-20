-- =====================================================
-- LOCKDOWN RLS POLICIES
-- Block direct client INSERT/UPDATE on critical tables
-- All writes must go through SECURITY DEFINER functions
-- =====================================================

-- =====================================================
-- MEMBERSHIPS - Block all direct client writes
-- =====================================================

DROP POLICY IF EXISTS "System can create memberships" ON memberships;
DROP POLICY IF EXISTS "Admins and owners can update memberships" ON memberships;
DROP POLICY IF EXISTS "Owners can delete memberships" ON memberships;

-- No direct inserts - must use RPCs
CREATE POLICY "No direct membership inserts"
  ON memberships FOR INSERT
  WITH CHECK (false);

-- Only OWNER can update roles via RPC
CREATE POLICY "Owners can update member roles"
  ON memberships FOR UPDATE
  USING (is_owner(organization_id, auth.uid()))
  WITH CHECK (
    is_owner(organization_id, auth.uid())
    AND user_id <> auth.uid()  -- no self-role change
    AND role IN ('ADMIN', 'MEMBER')  -- OWNER cannot be assigned
  );

-- Owner can remove members
CREATE POLICY "Owners can remove members"
  ON memberships FOR DELETE
  USING (
    is_owner(organization_id, auth.uid())
    AND user_id <> auth.uid()  -- cannot remove self
  );

-- =====================================================
-- TOOLS - Prevent organization_id changes
-- =====================================================

DROP POLICY IF EXISTS "Admins and owners can update tools" ON tools;

CREATE POLICY "Admins and owners can update tools"
  ON tools FOR UPDATE
  USING (is_admin_or_owner(organization_id, auth.uid()))
  WITH CHECK (is_admin_or_owner(organization_id, auth.uid()));

-- =====================================================
-- ACCESS REQUESTS - Enforce user_id authenticity
-- =====================================================

DROP POLICY IF EXISTS "Members can create access requests" ON access_requests;
DROP POLICY IF EXISTS "Admins and owners can update access requests" ON access_requests;

CREATE POLICY "Members can request access"
  ON access_requests FOR INSERT
  WITH CHECK (
    is_organization_member(organization_id, auth.uid())
    AND user_id = auth.uid()  -- must be requesting for self
  );

CREATE POLICY "Admins and owners manage access requests"
  ON access_requests FOR UPDATE
  USING (is_admin_or_owner(organization_id, auth.uid()))
  WITH CHECK (is_admin_or_owner(organization_id, auth.uid()));

-- =====================================================
-- AUDIT LOGS - Block all client writes
-- =====================================================

DROP POLICY IF EXISTS "Members can create audit logs for their organization" ON audit_logs;

-- No direct inserts - must use write_audit_log() function
CREATE POLICY "No client audit inserts"
  ON audit_logs FOR INSERT
  WITH CHECK (false);

-- Audit logs are immutable - no updates or deletes
-- (Already enforced by lack of UPDATE/DELETE policies)

-- =====================================================
-- SUBSCRIPTIONS - Block all client writes
-- =====================================================

DROP POLICY IF EXISTS "System can create subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owners can update subscriptions" ON subscriptions;

-- No direct inserts - created by org creation trigger or RPC
CREATE POLICY "No direct subscription inserts"
  ON subscriptions FOR INSERT
  WITH CHECK (false);

-- No direct updates - must use upgrade_subscription() RPC
CREATE POLICY "No direct subscription updates"
  ON subscriptions FOR UPDATE
  WITH CHECK (false);

-- =====================================================
-- INVITATIONS - Proper restrictions
-- =====================================================

DROP POLICY IF EXISTS "Admins and owners can invite" ON invitations;
DROP POLICY IF EXISTS "Owners manage invitations" ON invitations;
DROP POLICY IF EXISTS "Admins and owners can view invitations" ON invitations;
DROP POLICY IF EXISTS "Owners can delete invitations" ON invitations;

-- Invitations must be created via create_invitation() RPC for limit checks
CREATE POLICY "No direct invitation inserts"
  ON invitations FOR INSERT
  WITH CHECK (false);

-- Admins and owners can view invitations
CREATE POLICY "Admins and owners can view invitations"
  ON invitations FOR SELECT
  USING (is_admin_or_owner(organization_id, auth.uid()));

-- Owners can delete invitations
CREATE POLICY "Owners can delete invitations"
  ON invitations FOR DELETE
  USING (is_owner(organization_id, auth.uid()));

-- =====================================================
-- ORGANIZATIONS - Add WITH CHECK to UPDATE
-- =====================================================

DROP POLICY IF EXISTS "Owners can update organizations" ON organizations;

CREATE POLICY "Owners can update organizations"
  ON organizations FOR UPDATE
  USING (is_owner(id, auth.uid()))
  WITH CHECK (is_owner(id, auth.uid()));
