-- Drop all existing tables and functions (clean slate)
DROP FUNCTION IF EXISTS create_organization_for_user(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_tenant_and_owner(UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_tenant_and_owner(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS review_request_with_audit(UUID, UUID, TEXT, UUID, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS submit_request_with_audit(UUID, UUID, UUID, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS update_tool_with_audit(UUID, UUID, TEXT, TEXT, TEXT, BOOLEAN, UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS create_tool_with_audit(UUID, TEXT, TEXT, TEXT, BOOLEAN, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS my_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;

DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS access_requests CASCADE;
DROP TABLE IF EXISTS tools CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to get current user's tenant_id from JWT
CREATE OR REPLACE FUNCTION my_tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- TABLES
-- ============================================

-- Table: tenants
CREATE TABLE tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  plan       TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  max_members INT NOT NULL DEFAULT 5,
  max_tools   INT NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Table: users (tenant_id is nullable to allow users without organizations)
CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  full_name  TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX users_tenant_id_idx ON users(tenant_id);

CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Table: tools
CREATE TABLE tools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tools_tenant_name_unique UNIQUE(tenant_id, name)
);

CREATE INDEX tools_tenant_id_idx ON tools(tenant_id);
CREATE INDEX tools_created_by_idx ON tools(created_by);

CREATE TRIGGER set_tools_updated_at
BEFORE UPDATE ON tools
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- Table: access_requests
CREATE TABLE access_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tool_id      UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked', 'cancelled')),
  reason       TEXT,
  reviewer_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewer_note TEXT,
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX access_requests_tenant_id_idx ON access_requests(tenant_id);
CREATE INDEX access_requests_requester_id_idx ON access_requests(requester_id);
CREATE INDEX access_requests_tool_id_idx ON access_requests(tool_id);
CREATE INDEX access_requests_status_idx ON access_requests(status);

CREATE TRIGGER set_access_requests_updated_at
BEFORE UPDATE ON access_requests
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Table: audit_logs (immutable)
CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_id   UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action     TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id  UUID,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_tenant_id_idx ON audit_logs(tenant_id);
CREATE INDEX audit_logs_actor_id_idx ON audit_logs(actor_id);
CREATE INDEX audit_logs_entity_type_idx ON audit_logs(entity_type);
CREATE INDEX audit_logs_created_at_idx ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Table: invitations
CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token       TEXT NOT NULL UNIQUE,
  invited_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX invitations_tenant_id_idx ON invitations(tenant_id);
CREATE INDEX invitations_token_idx ON invitations(token);
CREATE INDEX invitations_email_idx ON invitations(email);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- RLS: users
CREATE POLICY users_select ON users FOR SELECT
  USING (id = auth.uid() OR tenant_id IS NULL OR tenant_id = my_tenant_id());

CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY users_self_update ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY users_admin_update ON users FOR UPDATE
  USING (
    tenant_id IS NOT NULL 
    AND tenant_id = my_tenant_id() 
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner')
  );

-- RLS: tenants
CREATE POLICY tenant_select ON tenants FOR SELECT
  USING (id = my_tenant_id());

CREATE POLICY tenant_update ON tenants FOR UPDATE
  USING (
    id = my_tenant_id() 
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) = 'owner'
  );

-- RLS: tools
CREATE POLICY tools_select ON tools FOR SELECT
  USING (tenant_id = my_tenant_id());

CREATE POLICY tools_insert ON tools FOR INSERT
  WITH CHECK (
    tenant_id = my_tenant_id() 
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner')
  );

CREATE POLICY tools_update ON tools FOR UPDATE
  USING (
    tenant_id = my_tenant_id() 
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner')
  );

-- RLS: access_requests
CREATE POLICY requests_select ON access_requests FOR SELECT
  USING (tenant_id = my_tenant_id());

CREATE POLICY requests_insert ON access_requests FOR INSERT
  WITH CHECK (
    tenant_id = my_tenant_id() 
    AND requester_id = auth.uid()
  );

CREATE POLICY requests_admin_update ON access_requests FOR UPDATE
  USING (
    tenant_id = my_tenant_id() 
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner')
  );

CREATE POLICY requests_member_cancel ON access_requests FOR UPDATE
  USING (
    tenant_id = my_tenant_id() 
    AND requester_id = auth.uid() 
    AND status IN ('pending', 'approved')
  );

-- RLS: audit_logs
CREATE POLICY audit_select ON audit_logs FOR SELECT
  USING (
    tenant_id = my_tenant_id() 
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner')
  );

CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (tenant_id = my_tenant_id() AND actor_id = auth.uid());

-- RLS: invitations
CREATE POLICY invitations_select ON invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
    OR (tenant_id = my_tenant_id() AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner'))
  );

CREATE POLICY invitations_insert ON invitations FOR INSERT
  WITH CHECK (
    tenant_id = my_tenant_id() 
    AND (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) IN ('admin', 'owner')
  );

-- ============================================
-- DATABASE FUNCTIONS
-- ============================================

-- Function: Create organization for existing user
CREATE OR REPLACE FUNCTION create_organization_for_user(
  p_user_id UUID,
  p_org_name TEXT,
  p_org_slug TEXT
) RETURNS UUID AS $$
DECLARE
  v_new_tenant_id UUID;
  v_user_has_tenant BOOLEAN;
BEGIN
  -- Check if user already has a tenant
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id AND tenant_id IS NOT NULL) INTO v_user_has_tenant;
  
  IF v_user_has_tenant THEN
    RAISE EXCEPTION 'User already belongs to an organization';
  END IF;

  -- Check if slug already exists
  IF EXISTS(SELECT 1 FROM tenants WHERE slug = p_org_slug) THEN
    RAISE EXCEPTION 'Organization slug already exists';
  END IF;

  -- Create the tenant
  INSERT INTO public.tenants (name, slug, plan)
  VALUES (p_org_name, p_org_slug, 'free')
  RETURNING id INTO v_new_tenant_id;

  -- Update user to link to new tenant as owner
  UPDATE public.users
  SET tenant_id = v_new_tenant_id, role = 'owner'
  WHERE id = p_user_id;

  RETURN v_new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create tenant and owner (for signup flow)
CREATE OR REPLACE FUNCTION create_tenant_and_owner(
  auth_user_id UUID,
  org_name TEXT,
  org_slug TEXT,
  user_full_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Check if slug already exists
  IF EXISTS(SELECT 1 FROM tenants WHERE slug = org_slug) THEN
    RAISE EXCEPTION 'Organization slug already exists';
  END IF;

  INSERT INTO public.tenants (name, slug, plan)
  VALUES (org_name, org_slug, 'free')
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.users (id, tenant_id, role, full_name)
  VALUES (auth_user_id, new_tenant_id, 'owner', user_full_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create tool with audit log
CREATE OR REPLACE FUNCTION create_tool_with_audit(
  p_tenant_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_category TEXT,
  p_is_active BOOLEAN,
  p_created_by UUID,
  p_actor_id UUID
) RETURNS UUID AS $$
DECLARE
  v_tool_id UUID;
BEGIN
  INSERT INTO public.tools (tenant_id, name, description, category, is_active, created_by)
  VALUES (p_tenant_id, p_name, p_description, p_category, p_is_active, p_created_by)
  RETURNING id INTO v_tool_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, 'tool.created', 'tool', v_tool_id, jsonb_build_object('name', p_name));

  RETURN v_tool_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update tool with audit log
CREATE OR REPLACE FUNCTION update_tool_with_audit(
  p_tool_id UUID,
  p_tenant_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_category TEXT,
  p_is_active BOOLEAN,
  p_actor_id UUID,
  p_action TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.tools
  SET 
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    category = COALESCE(p_category, category),
    is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_tool_id AND tenant_id = p_tenant_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, p_action, 'tool', p_tool_id, jsonb_build_object('name', p_name, 'is_active', p_is_active));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Submit access request with audit log
CREATE OR REPLACE FUNCTION submit_request_with_audit(
  p_tenant_id UUID,
  p_requester_id UUID,
  p_tool_id UUID,
  p_reason TEXT,
  p_tool_name TEXT,
  p_requester_name TEXT
) RETURNS UUID AS $$
DECLARE
  v_req_id UUID;
BEGIN
  INSERT INTO public.access_requests (tenant_id, requester_id, tool_id, reason)
  VALUES (p_tenant_id, p_requester_id, p_tool_id, p_reason)
  RETURNING id INTO v_req_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_requester_id, 'request.submitted', 'access_request', v_req_id, 
    jsonb_build_object('tool_name', p_tool_name, 'requester_name', p_requester_name));

  RETURN v_req_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Review access request with audit log
CREATE OR REPLACE FUNCTION review_request_with_audit(
  p_req_id UUID,
  p_tenant_id UUID,
  p_status TEXT,
  p_reviewer_id UUID,
  p_reviewer_note TEXT,
  p_action TEXT,
  p_tool_name TEXT,
  p_requester_name TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.access_requests
  SET 
    status = p_status,
    reviewer_id = p_reviewer_id,
    reviewer_note = p_reviewer_note,
    reviewed_at = now()
  WHERE id = p_req_id AND tenant_id = p_tenant_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_reviewer_id, p_action, 'access_request', p_req_id,
    jsonb_build_object('tool_name', p_tool_name, 'requester_name', p_requester_name, 'status', p_status));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
