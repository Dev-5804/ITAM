-- Database functions to wrap mutations and audit logs in transactions

-- Tools
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
  SET name = COALESCE(p_name, name),
      description = COALESCE(p_description, description),
      category = COALESCE(p_category, category),
      is_active = COALESCE(p_is_active, is_active)
  WHERE id = p_tool_id AND tenant_id = p_tenant_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, p_action, 'tool', p_tool_id, jsonb_build_object('name', p_name, 'is_active', p_is_active));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Requests
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
  SET status = p_status,
      reviewer_id = p_reviewer_id,
      reviewer_note = p_reviewer_note,
      reviewed_at = now()
  WHERE id = p_req_id AND tenant_id = p_tenant_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_reviewer_id, p_action, 'access_request', p_req_id, 
    jsonb_build_object('tool_name', p_tool_name, 'requester_name', p_requester_name, 'reviewer_note', p_reviewer_note));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION revoke_request_with_audit(
  p_req_id UUID,
  p_tenant_id UUID,
  p_revoker_id UUID,
  p_tool_name TEXT,
  p_requester_name TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.access_requests
  SET status = 'revoked'
  WHERE id = p_req_id AND tenant_id = p_tenant_id AND status = 'approved';

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_revoker_id, 'request.revoked', 'access_request', p_req_id, 
    jsonb_build_object('tool_name', p_tool_name, 'requester_name', p_requester_name));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cancel_request_with_audit(
  p_req_id UUID,
  p_tenant_id UUID,
  p_requester_id UUID,
  p_tool_name TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE public.access_requests
  SET status = 'cancelled'
  WHERE id = p_req_id AND tenant_id = p_tenant_id AND requester_id = p_requester_id AND status IN ('pending', 'approved');

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_requester_id, 'request.cancelled', 'access_request', p_req_id, 
    jsonb_build_object('tool_name', p_tool_name, 'requester_name', 'Self'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Invitations / Users
CREATE OR REPLACE FUNCTION create_invitation_with_audit(
  p_tenant_id UUID,
  p_email TEXT,
  p_role TEXT,
  p_token TEXT,
  p_inviter_id UUID
) RETURNS UUID AS $$
DECLARE
  v_invite_id UUID;
BEGIN
  INSERT INTO public.invitations (tenant_id, email, role, token, invited_by)
  VALUES (p_tenant_id, p_email, p_role, p_token, p_inviter_id)
  RETURNING id INTO v_invite_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_inviter_id, 'user.invited', 'invitation', v_invite_id, jsonb_build_object('email', p_email, 'role', p_role));

  RETURN v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION accept_invitation_with_audit(
  p_invite_id UUID,
  p_tenant_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_full_name TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.users (id, tenant_id, role, full_name)
  VALUES (p_user_id, p_tenant_id, p_role, p_full_name);

  UPDATE public.invitations
  SET accepted_at = now()
  WHERE id = p_invite_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_user_id, 'user.joined', 'user', p_user_id, jsonb_build_object('role', p_role, 'from_invitation', p_invite_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Team changes
CREATE OR REPLACE FUNCTION change_role_with_audit(
  p_target_user_id UUID,
  p_tenant_id UUID,
  p_new_role TEXT,
  p_actor_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.users
  SET role = p_new_role
  WHERE id = p_target_user_id AND tenant_id = p_tenant_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, 'user.role_changed', 'user', p_target_user_id, jsonb_build_object('new_role', p_new_role));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION remove_user_with_audit(
  p_target_user_id UUID,
  p_tenant_id UUID,
  p_actor_id UUID
) RETURNS VOID AS $$
BEGIN
  DELETE FROM public.users
  WHERE id = p_target_user_id AND tenant_id = p_tenant_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, 'user.removed', 'user', p_target_user_id, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Plan changes
CREATE OR REPLACE FUNCTION change_plan_with_audit(
  p_tenant_id UUID,
  p_new_plan TEXT,
  p_max_members INT,
  p_max_tools INT,
  p_actor_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.tenants
  SET plan = p_new_plan,
      max_members = p_max_members,
      max_tools = p_max_tools
  WHERE id = p_tenant_id;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, 'plan.changed', 'tenant', p_tenant_id, jsonb_build_object('new_plan', p_new_plan));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
