# 🔐 Security & Access Control Design

This project implements **defense-in-depth security** using **Supabase Row Level Security (RLS)** combined with **server-controlled RPC functions** to prevent privilege escalation, tenant leakage, and audit manipulation.

---

## 1. Threat Model

The system assumes:

* All client code is untrusted
* Users can inspect network traffic
* Users can call Supabase directly from the browser console

Therefore:

* **Client-side checks are never trusted**
* **Backend APIs alone are insufficient**
* **Database-level enforcement is mandatory**

---

## 2. Why RLS Alone Is Not Enough

Row Level Security (RLS) controls **which rows a user can access**, but:

* RLS cannot enforce:
  * complex business rules (subscription limits)
  * immutable audit integrity
  * safe role transitions
* Incorrect RLS policies can allow:
  * privilege escalation
  * cross-tenant data movement
  * audit log forgery

Early versions of this project had examples of these issues (e.g., unrestricted INSERT policies and missing `WITH CHECK` clauses).

---

## 3. Final Security Architecture

### Three layers of protection

1. **Supabase Auth**
   * Identity verification (email/password + OAuth)
   * No role assignment during authentication

2. **Row Level Security (RLS)**
   * Enforces tenant isolation
   * Prevents unauthorized SELECT / UPDATE / DELETE
   * Disables direct client writes for sensitive tables

3. **SECURITY DEFINER RPC Functions**
   * All sensitive writes go through controlled server functions
   * Business logic enforced in one place
   * Actor identity derived from `auth.uid()`

---

## 4. Sensitive Operations & How They Are Secured

### Membership Creation

* ❌ Direct INSERT blocked by RLS policy
* ✅ Created only via `accept_invitation()` RPC
* ✅ Role assignment validated server-side
* ✅ Self-role escalation prevented

**Implementation:**
```sql
-- RLS Policy
CREATE POLICY "No direct membership inserts"
  ON memberships FOR INSERT
  WITH CHECK (false);

-- Secure RPC
CREATE FUNCTION accept_invitation(invitation_token TEXT) ...
```

---

### Role Changes

* ❌ ADMIN cannot promote to OWNER
* ❌ Users cannot change their own role
* ✅ Only OWNER may change roles via `change_member_role()` RPC
* ✅ Allowed roles strictly validated (only ADMIN or MEMBER)

**Implementation:**
```sql
-- RLS Policy
CREATE POLICY "Owners can update member roles"
  ON memberships FOR UPDATE
  USING (is_owner(organization_id, auth.uid()))
  WITH CHECK (
    is_owner(organization_id, auth.uid())
    AND user_id <> auth.uid()  -- no self-role change
    AND role IN ('ADMIN', 'MEMBER')  -- OWNER cannot be assigned
  );

-- Secure RPC
CREATE FUNCTION change_member_role(
  target_user_id UUID,
  org_id UUID,
  new_role user_role
) ...
```

---

### Tool Creation & Limits

* ❌ Direct INSERT bypassing limits blocked
* ❌ FREE plan cannot bypass 3-tool limit
* ✅ Subscription limits enforced inside `create_tool()` RPC
* ✅ RLS still restricts tenant access

**Implementation:**
```sql
CREATE FUNCTION create_tool(
  org_id UUID,
  tool_name TEXT,
  tool_description TEXT DEFAULT NULL,
  tool_category TEXT DEFAULT NULL
) ...
-- Checks subscription limit before insert
IF sub_plan = 'FREE' AND tool_count >= tool_limit THEN
  RAISE EXCEPTION 'Tool limit reached';
END IF;
```

---

### Audit Logs (Immutable)

* ❌ No client INSERT allowed
* ❌ No UPDATE or DELETE policies exist
* ✅ Audit logs written only via `write_audit_log()` system RPC
* ✅ `actor_id` always equals authenticated user (`auth.uid()`)

Audit logs are append-only and non-spoofable.

**Implementation:**
```sql
-- RLS Policy - Blocks all client writes
CREATE POLICY "No client audit inserts"
  ON audit_logs FOR INSERT
  WITH CHECK (false);

-- System-only writer
CREATE FUNCTION write_audit_log(
  org_id UUID,
  action TEXT,
  resource_type TEXT,
  resource_id UUID,
  metadata JSONB DEFAULT NULL
) ...
-- Always uses auth.uid() for actor_id
```

---

### Subscriptions

* ❌ Direct UPDATE blocked
* ❌ OWNER cannot self-upgrade via client
* ✅ Plan changes only via `upgrade_subscription()` RPC
* ✅ All changes audited

**Implementation:**
```sql
-- RLS Policies - Block all client writes
CREATE POLICY "No direct subscription inserts"
  ON subscriptions FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct subscription updates"
  ON subscriptions FOR UPDATE
  WITH CHECK (false);

-- Controlled upgrade via RPC
CREATE FUNCTION upgrade_subscription(
  org_id UUID,
  new_plan subscription_plan
) ...
```

---

### Invitations

* ❌ Direct INSERT blocked (bypasses limit checks)
* ✅ Created via `create_invitation()` RPC with limit validation
* ✅ Only admins/owners can create invitations
* ✅ Subscription user limits checked before creation

**Implementation:**
```sql
-- RLS Policy
CREATE POLICY "No direct invitation inserts"
  ON invitations FOR INSERT
  WITH CHECK (false);

-- Secure RPC with limit checks
CREATE FUNCTION create_invitation(
  org_id UUID,
  invitee_email TEXT,
  invitee_role user_role,
  invitation_token TEXT,
  expires_days INT DEFAULT 7
) ...
-- Validates user limit before creating invitation
```

---

## 5. Common Attacks Prevented

| Attack                          | Prevention                           |
|---------------------------------|--------------------------------------|
| Cross-tenant data access        | RLS + org-scoped policies            |
| Admin → Owner escalation        | Strict role checks + RPC validation  |
| Fake audit entries              | System-only audit writer             |
| Subscription bypass             | Backend-only plan enforcement        |
| API manipulation                | Database-level enforcement           |
| Tool/user limit bypass          | RPC-enforced subscription checks     |
| Direct membership creation      | INSERT policy blocks all clients     |
| Organization_id manipulation    | WITH CHECK clauses on UPDATE         |

---

## 6. Security Guarantees

The system guarantees:

* ✅ Tenant isolation is enforced at the database layer
* ✅ Roles cannot be escalated via client manipulation
* ✅ Audit logs are trustworthy and immutable
* ✅ Subscription limits cannot be bypassed
* ✅ All privileged actions are attributable to a real user
* ✅ No fake actor_id in audit logs
* ✅ Organization membership requires valid invitation
* ✅ Free plan limits enforced at database level

---

## 7. Implementation Files

### Database Migrations
- `supabase/migrations/000_complete_schema.sql` - Initial schema with RLS helper functions
- `supabase/migrations/001_secure_rpc_functions.sql` - SECURITY DEFINER functions
- `supabase/migrations/002_lockdown_rls_policies.sql` - Restrictive RLS policies

### Backend API Routes
All routes updated to use RPC functions:
- `/api/organizations` - Uses `create_organization()` RPC
- `/api/organizations/[id]/invitations` - Uses `create_invitation()` RPC
- `/api/organizations/[id]/tools` - Uses `create_tool()` RPC
- `/api/organizations/[id]/access-requests/[id]` - Uses `review_access_request()` RPC

### Utility Libraries
- `lib/rbac.ts` - Role checking utilities (used in API routes for double-checking)
- `lib/audit.ts` - Audit log writer (deprecated in favor of RPC function)

---

## 8. Design Trade-offs

### Complexity vs Security
* **Increased complexity** in database logic with RPC functions
* **Reduced reliance** on frontend logic
* **Clearer security boundaries** and safer long-term maintenance

### Performance Considerations
* RPC functions add minimal overhead (~1-2ms per call)
* Prevents expensive security bugs in production
* Database-level enforcement scales better than application-level

### Developer Experience
* Backend developers write secure code by default
* Impossible to accidentally bypass security
* Clear audit trail of all privileged operations

These trade-offs were chosen intentionally to reflect **real-world SaaS security practices** and enterprise-grade security requirements.

---

## 9. Testing Security

### Manual Testing

Test that direct database manipulation is blocked:

```javascript
// In browser console - should all FAIL:

// 1. Try to create membership directly
await supabase.from('memberships').insert({
  organization_id: 'some-org-id',
  user_id: 'some-user-id',
  role: 'OWNER'
})
// Expected: Policy violation

// 2. Try to create fake audit log
await supabase.from('audit_logs').insert({
  organization_id: 'some-org-id',
  actor_id: 'fake-user-id',
  action: 'FAKE_ACTION'
})
// Expected: Policy violation

// 3. Try to upgrade subscription
await supabase.from('subscriptions').update({ 
  plan: 'PRO' 
}).eq('organization_id', 'your-org-id')
// Expected: Policy violation
```

### Automated Testing

Create integration tests that verify:
1. ✅ Organizations are isolated (User A can't see User B's orgs)
2. ✅ Free plan limits are enforced (max 3 tools, 5 users)
3. ✅ Role escalation is prevented (ADMIN → OWNER blocked)
4. ✅ Audit logs cannot be forged

---

## 10. Future Enhancements

Potential security improvements:
- Rate limiting on invitation creation
- IP-based access restrictions
- Two-factor authentication (2FA)
- Session timeout policies
- Webhook signatures for audit events
- Automated security scanning in CI/CD

---

## 11. Compliance & Audit

This security architecture supports:
- **SOC 2** - Immutable audit logs, access controls
- **GDPR** - Data isolation, user deletion workflows
- **HIPAA** - Access logging, tenant isolation
- **ISO 27001** - Security controls documentation

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Security Definer Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
