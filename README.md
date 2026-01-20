# ITAM - Internal Tool Access Manager

A multi-tenant SaaS application for managing and auditing access to internal tools with approval workflows.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, RLS)
- **Language**: TypeScript

## Features

### Phase 1 ✅ - Authentication & Setup
- Email/password authentication
- OAuth (GitHub & Google)
- Protected routes with middleware
- Session management

### Phase 2 ✅ - Multi-Tenancy
- Organization management
- Role-based access control (Owner, Admin, Member)
- Invitation system
- Row-level security for complete tenant isolation
- Subscription limits (Free: 5 users, 3 tools)

### Phase 3 ✅ - Security Hardening
- SECURITY DEFINER RPC functions for all sensitive operations
- Defense-in-depth security architecture
- Immutable audit logs
- Subscription limit enforcement at database level
- Prevention of privilege escalation and tenant leakage
- See [SECURITY.md](./SECURITY.md) for details

### Phase 4 - Tool Registry (In Progress)
- Tool CRUD operations
- Access level management
- Admin/Owner enforcement

## Getting Started

### Prerequisites

- Node.js 18+ 
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd itam
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

4. Apply database migrations (in order):
   - Go to your Supabase Dashboard → SQL Editor
   - Run migrations in the following order:
     1. `supabase/migrations/000_complete_schema.sql` - Core database schema
     2. `supabase/migrations/001_secure_rpc_functions.sql` - Security functions
     3. `supabase/migrations/002_lockdown_rls_policies.sql` - Final RLS policies

5. Configure OAuth providers in Supabase:
   - Go to Authentication → Providers
   - Enable GitHub and Google
   - Add callback URL: `http://localhost:3000/auth/callback`

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
itam/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── organizations/        # Organization management
│   │   ├── invitations/          # Invitation handling
│   │   └── auth/                 # Auth routes (callback, signout)
│   ├── login/                    # Login page
│   ├── dashboard/                # Main dashboard
│   └── organizations/create/     # Create organization page
├── lib/
│   ├── supabase/                 # Supabase client utilities
│   ├── context/                  # React contexts
│   ├── hooks/                    # Custom hooks
│   ├── types/                    # TypeScript types
│   ├── rbac.ts                   # Role-based access control
│   └── audit.ts                  # Audit logging
├── components/
│   └── role-guard.tsx            # Role-based rendering
├── supabase/
│   └── migrations/               # Database migrations (apply in order)
│       ├── 000_complete_schema.sql      # Core schema
│       ├── 001_secure_rpc_functions.sql # Security functions
│       └── 002_lockdown_rls_policies.sql # Final RLS policies
└── middleware.ts                 # Next.js auth middleware
```

## Database Schema

### Core Tables
- `organizations` - Multi-tenant organizations
- `memberships` - User-organization relationships with roles
- `profiles` - Extended user information
- `subscriptions` - Organization subscription plans
- `tools` - Tool registry
- `access_requests` - Access approval workflow
- `audit_logs` - Immutable audit trail
- `invitations` - Invitation management

### Security
- Row Level Security (RLS) enabled on all tables
- Helper functions for role checking
- Automatic audit logging
- Subscription limit enforcement

## Usage

### Creating an Organization
1. Sign up or log in
2. Click "Create Organization"
3. Enter organization name and slug
4. You'll be assigned as OWNER automatically

### Role Permissions

| Action | Owner | Admin | Member |
|--------|-------|-------|--------|
| Create organization | ✅ | ✅ | ✅ |
| Manage subscription | ✅ | ❌ | ❌ |
| Invite users | ✅ | ✅ | ❌ |
| Manage tools | ✅ | ✅ | ❌ |
| Approve requests | ✅ | ✅ | ❌ |
| Request access | ✅ | ✅ | ✅ |
| View audit logs | ✅ | ✅ | ✅ |

### Using RBAC in Code

**Server-side:**
```typescript
import { isAdminOrOwner } from '@/lib/rbac'

const hasPermission = await isAdminOrOwner(organizationId, userId)
if (!hasPermission) {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
```

**Client-side:**
```tsx
import { useIsAdminOrOwner } from '@/lib/hooks/use-role'
import { RoleGuard } from '@/components/role-guard'

// Using hooks
const isAdmin = useIsAdminOrOwner()
{isAdmin && <AdminButton />}

// Using component
<RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
  <AdminPanel />
</RoleGuard>
```

## Development Roadmap

- [x] Phase 1: Authentication & Setup
- [x] Phase 2: Multi-Tenancy
- [ ] Phase 3: Tool Registry
- [ ] Phase 4: Access Workflow
- [ ] Phase 5: Audit System
- [ ] Phase 6: Subscription Enforcement

## Documentation

- **[DATABASE-GUIDE.md](DATABASE-GUIDE.md)** - Complete guide to Supabase setup, migrations, and database operations
- **[supabase/README.md](supabase/README.md)** - Detailed migration documentation with troubleshooting
- **[SECURITY.md](SECURITY.md)** - Security architecture and best practices
- **[prd.md](prd.md)** - Product requirements and specifications

## License

MIT
