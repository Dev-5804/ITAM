-- Enable the pg_crypto extension for gen_random_uuid if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3.7 Updated_at Trigger
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4.3 Helper Function for RLS
CREATE OR REPLACE FUNCTION my_tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::UUID;
$$ LANGUAGE SQL STABLE;


-- 3.1 Table: tenants
CREATE TABLE tenants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  plan       TEXT NOT NULL DEFAULT 'free',
  max_members INT NOT NULL DEFAULT 5,
  max_tools   INT NOT NULL DEFAULT 10,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Apply Updated_at Trigger to tenants
CREATE TRIGGER set_tenants_updated_at
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;



-- 3.2 Table: users
CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  full_name  TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON users(tenant_id);

-- Apply Updated_at Trigger to users
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5.2 RLS: users
CREATE POLICY users_select ON users FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = my_tenant_id());

CREATE POLICY users_self_update ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY users_admin_update ON users FOR UPDATE
  USING (tenant_id IS NOT NULL AND tenant_id = my_tenant_id() AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','owner'));

-- 5.1 RLS: tenants
CREATE POLICY tenant_select ON tenants FOR SELECT
  USING (id = my_tenant_id());

CREATE POLICY tenant_update ON tenants FOR UPDATE
  USING (id = my_tenant_id() AND
    (SELECT role FROM users WHERE id = auth.uid() AND tenant_id = my_tenant_id()) = 'owner');

-- 4.2 Custom claims hook function (Moved here because it references the users table)
CREATE OR REPLACE FUNCTION add_custom_claims(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_row RECORD;
BEGIN
  claims := event -> 'claims';
  SELECT tenant_id, role INTO user_row
    FROM public.users WHERE id = (event->>'user_id')::UUID;
  IF user_row IS NOT NULL THEN
    claims := jsonb_set(claims, '{tenant_id}', to_jsonb(user_row.tenant_id));
    claims := jsonb_set(claims, '{role}', to_jsonb(user_row.role));
  END IF;
  RETURN jsonb_set(event, '{claims}', claims);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3.3 Table: tools
CREATE TABLE tools (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ON tools(tenant_id, name);

-- Enable RLS on tools
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

-- 5.3 RLS: tools
CREATE POLICY tools_select ON tools FOR SELECT
  USING (tenant_id = my_tenant_id());

CREATE POLICY tools_insert ON tools FOR INSERT
  WITH CHECK (tenant_id = my_tenant_id() AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','owner'));

CREATE POLICY tools_update ON tools FOR UPDATE
  USING (tenant_id = my_tenant_id() AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','owner'));


-- 3.4 Table: access_requests
CREATE TABLE access_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requester_id  UUID NOT NULL REFERENCES users(id),
  tool_id       UUID NOT NULL REFERENCES tools(id),
  status        TEXT NOT NULL DEFAULT 'pending',
  reason        TEXT,
  reviewer_id   UUID REFERENCES users(id),
  reviewer_note TEXT,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ON access_requests(tenant_id, requester_id, tool_id)
  WHERE status IN ('pending', 'approved');

-- Apply Updated_at Trigger to access_requests
CREATE TRIGGER set_requests_updated_at
BEFORE UPDATE ON access_requests
FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Enable RLS on access_requests
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- 5.4 RLS: access_requests
CREATE POLICY requests_select ON access_requests FOR SELECT
  USING (tenant_id = my_tenant_id() AND (
    requester_id = auth.uid() OR
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','owner')
  ));

CREATE POLICY requests_insert ON access_requests FOR INSERT
  WITH CHECK (tenant_id = my_tenant_id() AND requester_id = auth.uid());

CREATE POLICY requests_admin_update ON access_requests FOR UPDATE
  USING (tenant_id = my_tenant_id() AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','owner'));

CREATE POLICY requests_member_cancel ON access_requests FOR UPDATE
  USING (tenant_id = my_tenant_id() AND
    requester_id = auth.uid() AND status = 'pending');


-- 3.5 Table: audit_logs
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5.5 RLS: audit_logs
-- Hard Rule: Do not create an UPDATE or DELETE policy on audit_logs.
CREATE POLICY audit_select ON audit_logs FOR SELECT
  USING (tenant_id = my_tenant_id() AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','owner'));

CREATE POLICY audit_insert ON audit_logs FOR INSERT
  WITH CHECK (tenant_id = my_tenant_id());


-- 3.6 Table: invitations
CREATE TABLE invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'member',
  token       TEXT NOT NULL UNIQUE
              DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by  UUID REFERENCES users(id),
  accepted_at TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- 5.6 RLS: invitations
CREATE POLICY invitations_select ON invitations FOR SELECT
  USING (tenant_id = my_tenant_id() AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','owner'));

CREATE POLICY invitations_insert ON invitations FOR INSERT
  WITH CHECK (tenant_id = my_tenant_id() AND
    (SELECT role FROM users WHERE id = auth.uid()) IN ('admin','owner'));


-- 4.4 Helper function for sign-up transaction
CREATE OR REPLACE FUNCTION create_tenant_and_owner(
  auth_user_id UUID,
  org_name TEXT,
  org_slug TEXT,
  user_full_name TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  INSERT INTO public.tenants (name, slug, plan)
  VALUES (org_name, org_slug, 'free')
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.users (id, tenant_id, role, full_name)
  VALUES (auth_user_id, new_tenant_id, 'owner', user_full_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create organization for existing user
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
