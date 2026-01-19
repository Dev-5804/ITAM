-- =====================================================
-- COMPLETE DATABASE SCHEMA FOR ITAM
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS - Drop existing types first
-- =====================================================

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS subscription_plan CASCADE;
DROP TYPE IF EXISTS access_level CASCADE;
DROP TYPE IF EXISTS request_status CASCADE;

CREATE TYPE user_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE subscription_plan AS ENUM ('FREE', 'PRO');
CREATE TYPE access_level AS ENUM ('READ', 'WRITE', 'ADMIN');
CREATE TYPE request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- =====================================================
-- TABLES
-- =====================================================

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'FREE',
  user_limit INTEGER NOT NULL DEFAULT 5,
  tool_limit INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id)
);

CREATE INDEX idx_subscriptions_organization_id ON subscriptions(organization_id);

-- Memberships
CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_memberships_organization_id ON memberships(organization_id);
CREATE INDEX idx_memberships_user_id ON memberships(user_id);
CREATE INDEX idx_memberships_deleted_at ON memberships(deleted_at);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);

-- Tools
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tools_organization_id ON tools(organization_id);
CREATE INDEX idx_tools_deleted_at ON tools(deleted_at);
CREATE INDEX idx_tools_status ON tools(status);

-- Tool Access Levels
CREATE TABLE tool_access_levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  level access_level NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tool_access_levels_tool_id ON tool_access_levels(tool_id);

-- Access Requests
CREATE TABLE access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_level access_level NOT NULL,
  reason TEXT,
  status request_status NOT NULL DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_access_requests_organization_id ON access_requests(organization_id);
CREATE INDEX idx_access_requests_tool_id ON access_requests(tool_id);
CREATE INDEX idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX idx_access_requests_status ON access_requests(status);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Invitations
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'MEMBER',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, email)
);

CREATE INDEX idx_invitations_organization_id ON invitations(organization_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON tools
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_access_requests_updated_at BEFORE UPDATE ON access_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to create default subscription on organization creation
CREATE OR REPLACE FUNCTION create_default_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (organization_id, plan, user_limit, tool_limit)
  VALUES (NEW.id, 'FREE', 5, 3);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for organization creation
CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_subscription();

-- =====================================================
-- ROW LEVEL SECURITY - ENABLE RLS
-- =====================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_access_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_role(org_id UUID, uid UUID)
RETURNS user_role AS $$
  SELECT role FROM memberships
  WHERE organization_id = org_id
    AND user_id = uid
    AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_organization_member(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE organization_id = org_id
      AND user_id = uid
      AND deleted_at IS NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin_or_owner(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE organization_id = org_id
      AND user_id = uid
      AND role IN ('ADMIN', 'OWNER')
      AND deleted_at IS NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_owner(org_id UUID, uid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS(
    SELECT 1 FROM memberships
    WHERE organization_id = org_id
      AND user_id = uid
      AND role = 'OWNER'
      AND deleted_at IS NULL
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =====================================================
-- RLS POLICIES - ORGANIZATIONS
-- =====================================================

CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (
    is_organization_member(id, auth.uid()) OR
    auth.uid() IS NOT NULL  -- Allow viewing during creation before membership exists
  );

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (is_owner(id, auth.uid()));

CREATE POLICY "Owners can delete their organization"
  ON organizations FOR DELETE
  USING (is_owner(id, auth.uid()));

-- =====================================================
-- RLS POLICIES - MEMBERSHIPS
-- =====================================================

CREATE POLICY "Users can view memberships in their organizations"
  ON memberships FOR SELECT
  USING (is_organization_member(organization_id, auth.uid()));

CREATE POLICY "System can create memberships"
  ON memberships FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and owners can update memberships"
  ON memberships FOR UPDATE
  USING (is_admin_or_owner(organization_id, auth.uid()));

CREATE POLICY "Owners can delete memberships"
  ON memberships FOR DELETE
  USING (is_owner(organization_id, auth.uid()));

-- =====================================================
-- RLS POLICIES - PROFILES
-- =====================================================

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- RLS POLICIES - TOOLS
-- =====================================================

CREATE POLICY "Members can view tools in their organization"
  ON tools FOR SELECT
  USING (
    is_organization_member(organization_id, auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins and owners can create tools"
  ON tools FOR INSERT
  WITH CHECK (is_admin_or_owner(organization_id, auth.uid()));

CREATE POLICY "Admins and owners can update tools"
  ON tools FOR UPDATE
  USING (is_admin_or_owner(organization_id, auth.uid()));

CREATE POLICY "Admins and owners can delete tools"
  ON tools FOR DELETE
  USING (is_admin_or_owner(organization_id, auth.uid()));

-- =====================================================
-- RLS POLICIES - TOOL ACCESS LEVELS
-- =====================================================

CREATE POLICY "Members can view access levels"
  ON tool_access_levels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tools
      WHERE tools.id = tool_access_levels.tool_id
        AND is_organization_member(tools.organization_id, auth.uid())
    )
  );

CREATE POLICY "Admins and owners can manage access levels"
  ON tool_access_levels FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tools
      WHERE tools.id = tool_access_levels.tool_id
        AND is_admin_or_owner(tools.organization_id, auth.uid())
    )
  );

-- =====================================================
-- RLS POLICIES - ACCESS REQUESTS
-- =====================================================

CREATE POLICY "Users can view their own access requests"
  ON access_requests FOR SELECT
  USING (
    user_id = auth.uid() OR
    is_admin_or_owner(organization_id, auth.uid())
  );

CREATE POLICY "Members can create access requests"
  ON access_requests FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    is_organization_member(organization_id, auth.uid())
  );

CREATE POLICY "Admins and owners can update access requests"
  ON access_requests FOR UPDATE
  USING (is_admin_or_owner(organization_id, auth.uid()));

-- =====================================================
-- RLS POLICIES - AUDIT LOGS
-- =====================================================

CREATE POLICY "Members can view audit logs in their organization"
  ON audit_logs FOR SELECT
  USING (is_organization_member(organization_id, auth.uid()));

CREATE POLICY "Members can create audit logs for their organization"
  ON audit_logs FOR INSERT
  WITH CHECK (is_organization_member(organization_id, auth.uid()));

-- =====================================================
-- RLS POLICIES - SUBSCRIPTIONS
-- =====================================================

CREATE POLICY "Members can view their organization subscription"
  ON subscriptions FOR SELECT
  USING (is_organization_member(organization_id, auth.uid()));

CREATE POLICY "System can create subscriptions"
  ON subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Owners can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (is_owner(organization_id, auth.uid()));

-- =====================================================
-- RLS POLICIES - INVITATIONS
-- =====================================================

CREATE POLICY "Admins and owners can view invitations"
  ON invitations FOR SELECT
  USING (is_admin_or_owner(organization_id, auth.uid()));

CREATE POLICY "Admins and owners can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (is_admin_or_owner(organization_id, auth.uid()));

CREATE POLICY "Admins and owners can delete invitations"
  ON invitations FOR DELETE
  USING (is_admin_or_owner(organization_id, auth.uid()));

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Grant table permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence permissions
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMPLETE
-- =====================================================
