-- ============================================================
-- JWT Claims Fix
-- 1. Fix my_tenant_id() to read from app_metadata (where
--    Supabase's hook mechanism places custom claims).
-- 2. Fix add_custom_claims to use 'user_role' instead of
--    'role' — Supabase reserves 'role' for 'authenticated',
--    so our value was silently overwritten on every token.
-- 3. Update all RLS policies that did a DB subquery for role
--    to instead read auth.jwt() ->> 'user_role' from the JWT
--    (faster, no extra DB round-trip per policy check).
-- ============================================================

-- 1. Fix my_tenant_id()
CREATE OR REPLACE FUNCTION my_tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 2. Fix add_custom_claims: use 'user_role' key so Supabase
--    does not overwrite it with its own 'authenticated' string.
CREATE OR REPLACE FUNCTION add_custom_claims(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims    JSONB;
  user_row  RECORD;
BEGIN
  claims := event -> 'claims';
  SELECT tenant_id, role INTO user_row
    FROM public.users WHERE id = (event->>'user_id')::UUID;
  IF user_row IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}',  to_jsonb(user_row.tenant_id));
    claims := jsonb_set(claims, '{user_role}',  to_jsonb(user_row.role));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Rebuild every RLS policy that checked role via a DB
--    subquery. Replace with auth.jwt() ->> 'user_role'.
-- ============================================================

-- ---------- users ----------
DROP POLICY IF EXISTS users_admin_update     ON users;
DROP POLICY IF EXISTS users_owner_delete     ON users;

CREATE POLICY users_admin_update ON users FOR UPDATE
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
  );

CREATE POLICY users_owner_delete ON users FOR DELETE
  USING (
    id != auth.uid()
    AND tenant_id IS NOT NULL
    AND tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') = 'owner'
  );

-- ---------- tenants ----------
DROP POLICY IF EXISTS tenant_update ON tenants;

CREATE POLICY tenant_update ON tenants FOR UPDATE
  USING (
    id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') = 'owner'
  );

-- ---------- tools ----------
DROP POLICY IF EXISTS tools_insert ON tools;
DROP POLICY IF EXISTS tools_update ON tools;

CREATE POLICY tools_insert ON tools FOR INSERT
  WITH CHECK (
    tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
  );

CREATE POLICY tools_update ON tools FOR UPDATE
  USING (
    tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
  );

-- ---------- access_requests ----------
DROP POLICY IF EXISTS requests_admin_update ON access_requests;
DROP POLICY IF EXISTS requests_admin_delete ON access_requests;

CREATE POLICY requests_admin_update ON access_requests FOR UPDATE
  USING (
    tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
  );

CREATE POLICY requests_admin_delete ON access_requests FOR DELETE
  USING (
    tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
  );

-- ---------- audit_logs ----------
DROP POLICY IF EXISTS audit_select ON audit_logs;

CREATE POLICY audit_select ON audit_logs FOR SELECT
  USING (
    tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
  );

-- ---------- invitations ----------
DROP POLICY IF EXISTS invitations_select ON invitations;
DROP POLICY IF EXISTS invitations_insert ON invitations;
DROP POLICY IF EXISTS invitations_admin_delete ON invitations;

CREATE POLICY invitations_select ON invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR (
      tenant_id = my_tenant_id()
      AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
    )
  );

CREATE POLICY invitations_insert ON invitations FOR INSERT
  WITH CHECK (
    tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
  );

CREATE POLICY invitations_admin_delete ON invitations FOR DELETE
  USING (
    tenant_id = my_tenant_id()
    AND (auth.jwt() ->> 'user_role') IN ('admin', 'owner')
  );
