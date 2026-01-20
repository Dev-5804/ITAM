# ITAM Database Structure Guide

## Quick Reference

### Supabase Files Organization

```
lib/supabase/              # Client utilities
├── client.ts              # Browser client (use in React components)
├── server.ts              # Server client (use in API routes, Server Components)
└── middleware.ts          # Auth middleware (protects routes)

supabase/migrations/       # Database setup (run in order!)
├── 000_complete_schema.sql        # Step 1: Create all tables
├── 001_secure_rpc_functions.sql   # Step 2: Add secure functions
└── 002_lockdown_rls_policies.sql  # Step 3: Lock down security
```

---

## When to Use Which Supabase Client

### 🌐 `lib/supabase/client.ts`
**Use in:** Client Components, Browser-side code

```typescript
// In any 'use client' component
'use client'
import { createClient } from '@/lib/supabase/client'

export default function MyComponent() {
  const supabase = createClient()
  
  const fetchData = async () => {
    const { data } = await supabase.from('organizations').select('*')
  }
}
```

**Features:**
- Runs in the browser
- Has access to user session via cookies
- Automatically handles auth state
- Perfect for interactive UI components

---

### 🔒 `lib/supabase/server.ts`
**Use in:** API Routes, Server Components, Server Actions

```typescript
// In API routes (app/api/*/route.ts)
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase.from('organizations').select('*')
  return Response.json(data)
}

// In Server Components
export default async function ServerPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('organizations').select('*')
  return <div>{data}</div>
}
```

**Features:**
- Runs on the server
- Reads session from cookies securely
- Better for sensitive operations
- Required for Server Components

---

### 🛡️ `lib/supabase/middleware.ts`
**Use in:** `middleware.ts` file (Next.js middleware)

```typescript
// In middleware.ts at root
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}
```

**Features:**
- Runs before every request
- Refreshes auth session automatically
- Protects routes from unauthenticated access
- Sets up proper cookies

---

## Database Migration Flow

### Visual Flow

```
┌─────────────────────────────────────────┐
│  000_complete_schema.sql                │
│  ✓ Creates tables                       │
│  ✓ Creates enums                        │
│  ✓ Creates helper functions             │
│  ✓ Basic RLS policies                   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  001_secure_rpc_functions.sql           │
│  ✓ create_organization()                │
│  ✓ accept_invitation()                  │
│  ✓ create_tool()                        │
│  ✓ All SECURITY DEFINER functions       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  002_lockdown_rls_policies.sql          │
│  ✓ Blocks direct client writes          │
│  ✓ Forces use of RPC functions          │
│  ✓ Final security hardening             │
└─────────────────────────────────────────┘
```

### Why This Order Matters

1. **Step 1 (Schema)** - Creates the foundation. Without tables, nothing else works.
2. **Step 2 (Functions)** - Creates secure ways to modify data. The lockdown policies reference these.
3. **Step 3 (Lockdown)** - Removes direct access, forces everything through secure functions.

If you run them out of order:
- ❌ Step 3 before Step 2 = Functions don't exist, policies fail
- ❌ Step 2 before Step 1 = Tables don't exist, functions fail

---

## Database Tables Cheat Sheet

### Core Tables

| Table | Purpose | Who Can Access |
|-------|---------|----------------|
| `organizations` | Store organization data | Members only (via RLS) |
| `memberships` | User-org relationships + roles | Members of that org |
| `profiles` | Extended user info | Own profile + org members |
| `subscriptions` | Plan limits (users, tools) | Org members (read-only) |

### Feature Tables

| Table | Purpose | Who Can Access |
|-------|---------|----------------|
| `tools` | Tool registry | Org members |
| `tool_access_levels` | Access level definitions | Org members |
| `access_requests` | Request approval workflow | Requester + admins |
| `invitations` | Invite new members | Recipient + org admins |
| `audit_logs` | Immutable event log | Org members (read-only) |

### Security Notes

- **All tables have RLS enabled** - Row Level Security protects data
- **Audit logs are immutable** - Can only INSERT, never UPDATE/DELETE
- **Subscription limits enforced at DB** - Can't be bypassed by application
- **Helper functions check permissions** - `is_owner()`, `is_admin_or_owner()`, etc.

---

## Common Operations

### Create Organization
```typescript
// ❌ DON'T: Direct insert (blocked by RLS)
await supabase.from('organizations').insert({ name: 'Acme' })

// ✅ DO: Use RPC function
await supabase.rpc('create_organization', {
  org_name: 'Acme Corp',
  org_slug: 'acme'
})
```

### Accept Invitation
```typescript
// ❌ DON'T: Direct membership insert
await supabase.from('memberships').insert({ user_id, org_id, role })

// ✅ DO: Use RPC function
await supabase.rpc('accept_invitation', {
  invitation_token: token
})
```

### Create Tool
```typescript
// ❌ DON'T: Direct insert (blocked by RLS)
await supabase.from('tools').insert({ name: 'GitHub', organization_id })

// ✅ DO: Use RPC function
await supabase.rpc('create_tool', {
  org_id: organizationId,
  tool_name: 'GitHub',
  tool_description: 'Source control',
  tool_category: 'Development'
})
```

### Change Member Role
```typescript
// ❌ DON'T: Direct update (restricted by RLS)
await supabase.from('memberships').update({ role: 'ADMIN' })

// ✅ DO: Use RPC function
await supabase.rpc('change_member_role', {
  target_user_id: userId,
  org_id: organizationId,
  new_role: 'ADMIN'
})
```

---

## Role Permissions Quick Reference

### OWNER
- ✅ Everything
- ✅ Change subscription
- ✅ Change member roles
- ✅ Delete members
- ✅ Create/delete tools
- ❌ Cannot change own role
- ❌ Cannot delete self

### ADMIN
- ✅ Invite members
- ✅ Manage tools
- ✅ Approve access requests
- ✅ View audit logs
- ❌ Cannot change subscription
- ❌ Cannot change roles
- ❌ Cannot delete members

### MEMBER
- ✅ View tools
- ✅ Request access
- ✅ View own requests
- ✅ View audit logs
- ❌ Cannot invite users
- ❌ Cannot manage tools
- ❌ Cannot approve requests

---

## Troubleshooting

### "Permission denied" errors
1. Check if user is logged in: `const { data: { user } } = await supabase.auth.getUser()`
2. Check if user has membership: Query `memberships` table
3. Check RLS policies: User might not have required role

### "Row level security policy violation"
- Direct table inserts are blocked by design
- Use RPC functions instead (see "Common Operations" above)

### "Function does not exist"
- Migrations might not be applied in order
- Re-run migrations: 000 → 001 → 002

### "Cannot read property of undefined"
- Supabase client might not be initialized
- Check if you're using correct client (client.ts vs server.ts)
- Ensure environment variables are set

---

## Best Practices

### ✅ DO
- Use RPC functions for sensitive operations
- Use server-side client for API routes
- Use client-side client for UI components
- Check permissions with helper functions
- Log important actions to audit table

### ❌ DON'T
- Bypass RPC functions with direct inserts
- Mix up client.ts and server.ts
- Hardcode organization IDs
- Trust client-side role checks for security
- Delete or update audit logs

---

## Need More Details?

- **Migration specifics:** See [supabase/README.md](supabase/README.md)
- **Security architecture:** See [SECURITY.md](SECURITY.md)
- **Project overview:** See [README.md](README.md)
- **Product requirements:** See [prd.md](prd.md)
