-- =====================================================
-- SECURE RPC FUNCTIONS WITH SECURITY DEFINER
-- These functions enforce business logic and prevent privilege escalation
-- =====================================================

-- =====================================================
-- 1. ORGANIZATION CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION create_organization(
  org_name TEXT,
  org_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Create organization
  INSERT INTO organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  -- Create OWNER membership
  INSERT INTO memberships (organization_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'OWNER');

  -- Create FREE subscription
  INSERT INTO subscriptions (organization_id, plan, user_limit, tool_limit)
  VALUES (new_org_id, 'FREE', 5, 3);

  -- Write audit log
  INSERT INTO audit_logs (organization_id, actor_id, action, resource_type, resource_id)
  VALUES (new_org_id, auth.uid(), 'ORGANIZATION_CREATED', 'organization', new_org_id);

  RETURN new_org_id;
END;
$$;

-- =====================================================
-- 2. INVITATION ACCEPTANCE (MEMBERSHIP CREATION)
-- =====================================================

CREATE OR REPLACE FUNCTION accept_invitation(
  invitation_token TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
  user_email TEXT;
  org_member_count INT;
  org_user_limit INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Get user email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Get invitation
  SELECT *
  INTO inv
  FROM invitations
  WHERE token = invitation_token
    AND email = user_email
    AND expires_at > now()
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Check subscription limits
  SELECT COUNT(*), s.user_limit
  INTO org_member_count, org_user_limit
  FROM memberships m
  JOIN subscriptions s ON s.organization_id = m.organization_id
  WHERE m.organization_id = inv.organization_id
    AND m.deleted_at IS NULL
  GROUP BY s.user_limit;

  IF org_member_count >= org_user_limit THEN
    RAISE EXCEPTION 'Organization has reached user limit';
  END IF;

  -- Create membership
  INSERT INTO memberships (organization_id, user_id, role)
  VALUES (inv.organization_id, auth.uid(), inv.role);

  -- Mark invitation as accepted
  UPDATE invitations
  SET accepted_at = now()
  WHERE id = inv.id;

  -- Write audit log
  INSERT INTO audit_logs (organization_id, actor_id, action, resource_type, resource_id, metadata)
  VALUES (inv.organization_id, auth.uid(), 'INVITATION_ACCEPTED', 'invitation', inv.id, 
          jsonb_build_object('role', inv.role));
END;
$$;

-- =====================================================
-- 3. ROLE CHANGE (OWNER ONLY)
-- =====================================================

CREATE OR REPLACE FUNCTION change_member_role(
  target_user_id UUID,
  org_id UUID,
  new_role user_role
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Only OWNER can change roles
  IF NOT is_owner(org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only owner can change roles';
  END IF;

  -- Cannot change own role
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot change own role';
  END IF;

  -- Only ADMIN and MEMBER can be assigned (not OWNER)
  IF new_role NOT IN ('ADMIN', 'MEMBER') THEN
    RAISE EXCEPTION 'Invalid role. Only ADMIN or MEMBER can be assigned';
  END IF;

  -- Update role
  UPDATE memberships
  SET role = new_role,
      updated_at = now()
  WHERE organization_id = org_id
    AND user_id = target_user_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;

  -- Write audit log
  INSERT INTO audit_logs (organization_id, actor_id, action, resource_type, resource_id, metadata)
  VALUES (org_id, auth.uid(), 'ROLE_CHANGED', 'membership', target_user_id,
          jsonb_build_object('new_role', new_role));
END;
$$;

-- =====================================================
-- 4. TOOL CREATION (SUBSCRIPTION-AWARE)
-- =====================================================

CREATE OR REPLACE FUNCTION create_tool(
  org_id UUID,
  tool_name TEXT,
  tool_description TEXT DEFAULT NULL,
  tool_category TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tool_count INT;
  tool_limit INT;
  sub_plan subscription_plan;
  new_tool_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Check if user is admin or owner
  IF NOT is_admin_or_owner(org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Get subscription limits
  SELECT s.plan, s.tool_limit
  INTO sub_plan, tool_limit
  FROM subscriptions s
  WHERE s.organization_id = org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  -- Count existing tools
  SELECT COUNT(*) INTO tool_count
  FROM tools
  WHERE organization_id = org_id
    AND deleted_at IS NULL;

  -- Check limit for FREE plan
  IF sub_plan = 'FREE' AND tool_count >= tool_limit THEN
    RAISE EXCEPTION 'Tool limit reached (%). Upgrade to add more tools.', tool_limit;
  END IF;

  -- Create tool
  INSERT INTO tools (organization_id, name, description, category, status)
  VALUES (org_id, tool_name, tool_description, tool_category, 'ACTIVE')
  RETURNING id INTO new_tool_id;

  -- Create default access levels
  INSERT INTO tool_access_levels (tool_id, level, description)
  VALUES 
    (new_tool_id, 'READ', 'Read-only access'),
    (new_tool_id, 'WRITE', 'Read and write access'),
    (new_tool_id, 'ADMIN', 'Full administrative access');

  -- Write audit log
  INSERT INTO audit_logs (organization_id, actor_id, action, resource_type, resource_id, metadata)
  VALUES (org_id, auth.uid(), 'TOOL_CREATED', 'tool', new_tool_id,
          jsonb_build_object('name', tool_name, 'category', tool_category));

  RETURN new_tool_id;
END;
$$;

-- =====================================================
-- 5. ACCESS REQUEST APPROVAL/REJECTION
-- =====================================================

CREATE OR REPLACE FUNCTION review_access_request(
  request_id UUID,
  new_status request_status
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Get request details
  SELECT *
  INTO req
  FROM access_requests
  WHERE id = request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Access request not found';
  END IF;

  -- Check if user is admin or owner
  IF NOT is_admin_or_owner(req.organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Validate status
  IF new_status NOT IN ('APPROVED', 'REJECTED', 'REVOKED') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  -- Update request
  UPDATE access_requests
  SET status = new_status,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = request_id;

  -- Write audit log
  INSERT INTO audit_logs (organization_id, actor_id, action, resource_type, resource_id, metadata)
  VALUES (req.organization_id, auth.uid(), 'ACCESS_REQUEST_REVIEWED', 'access_request', request_id,
          jsonb_build_object('status', new_status, 'tool_id', req.tool_id, 'requester_id', req.user_id));
END;
$$;

-- =====================================================
-- 6. AUDIT LOG WRITER (SYSTEM-ONLY)
-- =====================================================

CREATE OR REPLACE FUNCTION write_audit_log(
  org_id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    actor_id,
    action,
    resource_type,
    resource_id,
    metadata
  )
  VALUES (
    org_id,
    auth.uid(),
    action,
    resource_type,
    resource_id,
    metadata
  );
END;
$$;

-- =====================================================
-- 7. SUBSCRIPTION UPGRADE
-- =====================================================

CREATE OR REPLACE FUNCTION upgrade_subscription(
  org_id UUID,
  new_plan subscription_plan
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Only OWNER can upgrade
  IF NOT is_owner(org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only owner can upgrade subscription';
  END IF;

  -- Validate plan
  IF new_plan NOT IN ('PRO') THEN
    RAISE EXCEPTION 'Invalid plan';
  END IF;

  -- Update subscription
  UPDATE subscriptions
  SET plan = new_plan,
      user_limit = CASE WHEN new_plan = 'PRO' THEN 999999 ELSE user_limit END,
      tool_limit = CASE WHEN new_plan = 'PRO' THEN 999999 ELSE tool_limit END,
      updated_at = now()
  WHERE organization_id = org_id;

  -- Write audit log
  INSERT INTO audit_logs (organization_id, actor_id, action, resource_type, resource_id, metadata)
  VALUES (org_id, auth.uid(), 'SUBSCRIPTION_UPGRADED', 'subscription', org_id,
          jsonb_build_object('new_plan', new_plan));
END;
$$;

-- =====================================================
-- 8. CREATE INVITATION (WITH LIMITS)
-- =====================================================

CREATE OR REPLACE FUNCTION create_invitation(
  org_id UUID,
  invitee_email TEXT,
  invitee_role user_role,
  invitation_token TEXT,
  expires_days INT DEFAULT 7
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_invitation_id UUID;
  member_count INT;
  user_limit INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated';
  END IF;

  -- Check if user is admin or owner
  IF NOT is_admin_or_owner(org_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Check subscription limits
  SELECT COUNT(*), s.user_limit
  INTO member_count, user_limit
  FROM memberships m
  JOIN subscriptions s ON s.organization_id = m.organization_id
  WHERE m.organization_id = org_id
    AND m.deleted_at IS NULL
  GROUP BY s.user_limit;

  IF member_count >= user_limit THEN
    RAISE EXCEPTION 'User limit reached (%). Upgrade to add more members.', user_limit;
  END IF;

  -- Create invitation
  INSERT INTO invitations (organization_id, email, role, invited_by, token, expires_at)
  VALUES (org_id, LOWER(invitee_email), invitee_role, auth.uid(), invitation_token, 
          now() + (expires_days || ' days')::INTERVAL)
  RETURNING id INTO new_invitation_id;

  -- Write audit log
  INSERT INTO audit_logs (organization_id, actor_id, action, resource_type, resource_id, metadata)
  VALUES (org_id, auth.uid(), 'INVITATION_CREATED', 'invitation', new_invitation_id,
          jsonb_build_object('email', invitee_email, 'role', invitee_role));

  RETURN new_invitation_id;
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION create_organization(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION accept_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION change_member_role(UUID, UUID, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION create_tool(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION review_access_request(UUID, request_status) TO authenticated;
GRANT EXECUTE ON FUNCTION write_audit_log(UUID, TEXT, TEXT, UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION upgrade_subscription(UUID, subscription_plan) TO authenticated;
GRANT EXECUTE ON FUNCTION create_invitation(UUID, TEXT, user_role, TEXT, INT) TO authenticated;
