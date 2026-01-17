# Phase 2: Multi-Tenancy Setup

This document outlines what was implemented in Phase 2 and how to set it up.

## Database Migrations

Two SQL migration files were created in `supabase/migrations/`:

### 1. Initial Schema (`001_initial_schema.sql`)
- Organizations table with soft delete support
- Memberships table with role-based access
- Profiles table (auto-created on user signup)
- Subscriptions table with FREE/PRO plans
- Tools, tool_access_levels, access_requests tables
- Audit logs table (append-only)
- Invitations table
- Automatic triggers for updated_at timestamps
- Auto-create profile on user signup
- Auto-create FREE subscription on org creation

### 2. RLS Policies (`002_rls_policies.sql`)
- Enabled Row Level Security on all tables
- Helper functions for role checking
- Organization-scoped policies on all business tables
- Ensures complete tenant isolation

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended for now)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `001_initial_schema.sql`
4. Click "Run"
5. Copy and paste the contents of `002_rls_policies.sql`
6. Click "Run"

### Option 2: Using Supabase CLI (For production)
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

## What Was Built

### Backend Infrastructure
1. **Type Definitions** (`lib/types/database.ts`)
   - Complete TypeScript types for all database entities

2. **RBAC Utilities** (`lib/rbac.ts`)
   - `getUserRole()` - Get user's role in an organization
   - `isAdminOrOwner()` - Check admin/owner permissions
   - `isOwner()` - Check owner permissions
   - `checkSubscriptionLimits()` - Validate FREE plan limits

3. **Audit Logging** (`lib/audit.ts`)
   - Centralized audit log creation
   - Automatic actor and timestamp tracking

### API Routes
1. **Organization Creation** (`/api/organizations`)
   - POST: Create organization with owner role
   - Auto-creates FREE subscription
   - Creates audit log

2. **Invitations** (`/api/organizations/[id]/invitations`)
   - POST: Create invitation (admin/owner only)
   - GET: List pending invitations
   - Checks subscription limits
   - Generates secure tokens

3. **Accept Invitation** (`/api/invitations/[token]/accept`)
   - Validates token and expiry
   - Creates membership
   - Creates audit log

4. **Members** (`/api/organizations/[id]/members`)
   - GET: List organization members

### Frontend Features
1. **Organization Context** (`lib/context/organization-context.tsx`)
   - Global organization state management
   - Organization switcher support
   - Automatic localStorage persistence

2. **Role Hooks** (`lib/hooks/use-role.ts`)
   - `useRole()` - Get current role
   - `useIsOwner()` - Check if owner
   - `useIsAdminOrOwner()` - Check if admin or owner
   - `useIsMember()` - Check if member

3. **Role Guard Component** (`components/role-guard.tsx`)
   - Conditional rendering based on roles
   - Easy to use wrapper component

4. **Create Organization Page** (`/organizations/create`)
   - Form for creating new organization
   - Auto-generates slug from name
   - Validates slug format

5. **Updated Dashboard** (`/dashboard`)
   - Shows current organization and role
   - Organization switcher (if user has multiple)
   - Role-based action buttons
   - Quick navigation

## Role-Based Access Control

### Roles
- **OWNER**: Full control, manages subscription, assigns roles
- **ADMIN**: Manages tools, approves requests, views audit logs
- **MEMBER**: Requests tool access, views own history

### Using RBAC in Code

#### Server-side (API routes)
```typescript
import { isAdminOrOwner } from '@/lib/rbac'

const hasPermission = await isAdminOrOwner(organizationId, userId)
if (!hasPermission) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

#### Client-side (React components)
```tsx
import { useIsAdminOrOwner } from '@/lib/hooks/use-role'
import { RoleGuard } from '@/components/role-guard'

// Hook-based
const isAdmin = useIsAdminOrOwner()
{isAdmin && <AdminButton />}

// Component-based
<RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
  <AdminPanel />
</RoleGuard>
```

## Testing Phase 2

1. **Apply migrations** using one of the methods above
2. **Start dev server**: `npm run dev`
3. **Sign in** at http://localhost:3000/login
4. **Create an organization** at http://localhost:3000/organizations/create
5. **Verify**:
   - Organization appears in dashboard
   - Your role shows as OWNER
   - Quick actions are visible based on role

## Subscription Limits (FREE Plan)
- Max 5 users
- Max 3 tools
- Enforced at API level during invitation/tool creation

## Next Steps (Phase 3)
- Tool registry (CRUD operations)
- Access level modeling
- Admin-only enforcement for tool management
