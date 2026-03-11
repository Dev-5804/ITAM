-- ============================================================
-- RLS Enforcement: fix my_tenant_id() and add DELETE policies
-- ============================================================

-- Fix my_tenant_id() to read from the users table, not JWT claims.
-- The previous implementation read auth.jwt() ->> 'tenant_id' which is a
-- top-level claim that Supabase never populates without a custom JWT hook.
-- Reading directly from public.users is reliable and always up-to-date.
CREATE OR REPLACE FUNCTION my_tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Users: owner can remove other members from their own tenant
CREATE POLICY users_owner_delete ON users FOR DELETE
  USING (
    id != auth.uid()
    AND tenant_id IS NOT NULL
    AND tenant_id = my_tenant_id()
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) = 'owner'
  );

-- Users: user can delete their own row (leave org)
CREATE POLICY users_self_delete ON users FOR DELETE
  USING (id = auth.uid());

-- Access requests: admin/owner can delete requests in their tenant
CREATE POLICY requests_admin_delete ON access_requests FOR DELETE
  USING (
    tenant_id = my_tenant_id()
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner')
  );

-- Invitations: admin/owner can delete pending invitations in their tenant
CREATE POLICY invitations_admin_delete ON invitations FOR DELETE
  USING (
    tenant_id = my_tenant_id()
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner')
  );
