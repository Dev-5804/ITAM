# Supabase Database Migrations

This directory contains the database migrations for ITAM. **Apply them in the exact order specified below.**

## Migration Files

### 1. `000_complete_schema.sql`
**Purpose:** Creates the complete database schema with all tables, enums, indexes, and helper functions.

**What it creates:**
- **Enums:** `user_role`, `subscription_plan`, `access_level`, `request_status`
- **Tables:** 
  - `organizations` - Multi-tenant organizations
  - `subscriptions` - Organization subscription plans with limits
  - `profiles` - Extended user information
  - `memberships` - User-organization relationships with roles
  - `invitations` - Invitation management
  - `tools` - Tool registry
  - `tool_access_levels` - Access level definitions per tool
  - `access_requests` - Access approval workflow
  - `audit_logs` - Immutable audit trail
- **Helper Functions:**
  - `is_organization_member()` - Check if user belongs to organization
  - `is_admin_or_owner()` - Check if user has admin or owner role
  - `is_owner()` - Check if user is organization owner
- **Triggers:** Auto-create profiles, auto-update timestamps
- **Basic RLS Policies:** Initial row-level security policies

**Run this first** - Everything depends on this schema.

---

### 2. `001_secure_rpc_functions.sql`
**Purpose:** Creates SECURITY DEFINER RPC functions that enforce business logic and prevent privilege escalation.

**What it creates:**
- `create_organization()` - Safely create organization with owner membership
- `accept_invitation()` - Accept invitations with subscription limit checks
- `change_member_role()` - Change member roles (owner only)
- `create_tool()` - Create tools with subscription limit enforcement
- `review_access_request()` - Approve/reject access requests
- `write_audit_log()` - System audit logging
- `upgrade_subscription()` - Upgrade organization subscription plan
- `create_invitation()` - Create invitations with limit checks

**Why SECURITY DEFINER?**
These functions run with elevated privileges to perform operations that regular users shouldn't do directly (like creating memberships). They contain business logic validation that can't be bypassed through direct table access.

**Run this second** - The lockdown policies depend on these functions existing.

---

### 3. `002_lockdown_rls_policies.sql`
**Purpose:** Locks down all direct client writes to critical tables. All sensitive operations must go through the SECURITY DEFINER functions.

**What it does:**
- **Blocks direct inserts** to `memberships`, `subscriptions`, `audit_logs`, `invitations`
- **Prevents organization_id changes** on tools and access requests
- **Enforces authenticity** (e.g., users can only request access for themselves)
- **Removes old permissive policies** and replaces with strict ones
- **Adds WITH CHECK clauses** to UPDATE policies

**Security principle:** Defense in depth
- Even if someone bypasses the API layer, they can't manipulate critical data directly
- Subscription limits are enforced at database level, not just application level
- Audit logs are immutable

**Run this last** - This is the final security hardening layer.

---

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for first time)
1. Open your Supabase project
2. Go to **SQL Editor**
3. Open each migration file in order
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **Run**
7. Verify success (should see "Success. No rows returned")

### Option 2: Supabase CLI
```bash
# Link to your project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push

# Or apply individually
supabase db execute -f supabase/migrations/000_complete_schema.sql
supabase db execute -f supabase/migrations/001_secure_rpc_functions.sql
supabase db execute -f supabase/migrations/002_lockdown_rls_policies.sql
```

---

## Verification

After applying all migrations, verify the setup:

### Check Tables
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Should return:
- access_requests
- audit_logs
- invitations
- memberships
- organizations
- profiles
- subscriptions
- tool_access_levels
- tools

### Check Functions
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

Should include:
- accept_invitation
- change_member_role
- create_invitation
- create_organization
- create_tool
- is_admin_or_owner
- is_organization_member
- is_owner
- review_access_request
- upgrade_subscription
- write_audit_log

### Check RLS is Enabled
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

All tables should have `rowsecurity = true`.

---

## Troubleshooting

### "function already exists"
If you see this error when running migrations:
1. You may have already run that migration
2. To re-run, drop the function first:
```sql
DROP FUNCTION IF EXISTS function_name CASCADE;
```

### "policy already exists"
To replace a policy:
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
```

### "type already exists"
To recreate an enum:
```sql
DROP TYPE IF EXISTS type_name CASCADE;
```

### Complete Reset (⚠️ DESTRUCTIVE)
To start fresh (THIS DELETES ALL DATA):
```sql
-- Drop all policies
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname 
           FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || 
            ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
  END LOOP;
END $$;

-- Drop all tables
DROP TABLE IF EXISTS 
  audit_logs, access_requests, tool_access_levels, tools, 
  invitations, memberships, subscriptions, organizations, profiles 
CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS 
  accept_invitation, change_member_role, create_invitation, 
  create_organization, create_tool, is_admin_or_owner, 
  is_organization_member, is_owner, review_access_request, 
  upgrade_subscription, write_audit_log 
CASCADE;

-- Drop all types
DROP TYPE IF EXISTS user_role, subscription_plan, access_level, request_status CASCADE;
```

Then re-run all migrations from the beginning.

---

## Security Notes

1. **Never bypass RPC functions** - Always use them for sensitive operations
2. **Audit logs are immutable** - No updates or deletes allowed
3. **Subscription limits are enforced at DB level** - Can't be bypassed
4. **RLS is always enabled** - Protects against tenant data leakage
5. **Helper functions use auth.uid()** - Automatic user context

See [../SECURITY.md](../SECURITY.md) for detailed security architecture.
