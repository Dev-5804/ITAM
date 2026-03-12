-- ============================================================
-- Atomic request status transitions and hard-delete with audit
-- Replaces the two-step update+audit_insert pattern in route
-- handlers for revoke, cancel, and delete actions.
-- ============================================================

-- Generic status-transition function used for revoke and cancel.
-- p_from_statuses enforces the allowed current status(es) so the
-- function is safe even as SECURITY DEFINER (RLS is bypassed).
CREATE OR REPLACE FUNCTION update_request_status_with_audit(
  p_request_id    UUID,
  p_tenant_id     UUID,
  p_new_status    TEXT,
  p_from_statuses TEXT[],
  p_reviewer_id   UUID,
  p_reviewer_note TEXT,
  p_actor_id      UUID,
  p_action        TEXT,
  p_metadata      JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE public.access_requests
  SET
    status        = p_new_status,
    reviewer_id   = p_reviewer_id,
    reviewer_note = p_reviewer_note,
    reviewed_at   = now()
  WHERE id         = p_request_id
    AND tenant_id  = p_tenant_id
    AND status     = ANY(p_from_statuses);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or invalid status transition';
  END IF;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, p_action, 'access_request', p_request_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Plan change with guaranteed audit trail.
CREATE OR REPLACE FUNCTION update_plan_with_audit(
  p_tenant_id   UUID,
  p_new_plan    TEXT,
  p_max_members INT,
  p_max_tools   INT,
  p_actor_id    UUID,
  p_metadata    JSONB
) RETURNS VOID AS $$
BEGIN
  UPDATE public.tenants
  SET
    plan        = p_new_plan,
    max_members = p_max_members,
    max_tools   = p_max_tools,
    updated_at  = now()
  WHERE id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, 'plan.changed', 'tenant', p_tenant_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hard-delete function used for the admin delete action.
CREATE OR REPLACE FUNCTION delete_request_with_audit(
  p_request_id UUID,
  p_tenant_id  UUID,
  p_actor_id   UUID,
  p_metadata   JSONB
) RETURNS VOID AS $$
BEGIN
  DELETE FROM public.access_requests
  WHERE id        = p_request_id
    AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;

  INSERT INTO public.audit_logs (tenant_id, actor_id, action, entity_type, entity_id, metadata)
  VALUES (p_tenant_id, p_actor_id, 'request.deleted', 'access_request', p_request_id, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
