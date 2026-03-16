# ITAM - Internal Tool Access Manager

A multi-tenant SaaS application for managing internal tool access requests. Organizations can control which tools their members access, with a structured approval workflow and a fully immutable audit trail.

## Features

- **Multi-tenant architecture** - every organization's data is fully isolated at the database level via Row Level Security
- **Role-based access control** - three roles: Owner, Admin, and Member, each with clearly scoped permissions
- **Access request workflow** - members submit requests; admins approve, reject, or revoke them
- **Immutable audit log** - every state-changing action is recorded and cannot be edited or deleted
- **Team management** - invite members via tokenized email links, change roles, remove users
- **Subscription plans** - Free, Pro, and Enterprise tiers with enforced per-tenant member and tool limits
- **Payment integration** - Razorpay-powered plan upgrades (INR)
- **Email notifications** - transactional emails via Gmail SMTP for invitations and request status changes
- **Google OAuth** - sign in with Google in addition to email/password

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| Database | [Supabase](https://supabase.com) (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Session Management | `@supabase/ssr` (cookie-based) |
| Email | Nodemailer via Gmail SMTP |
| Payments | [Razorpay](https://razorpay.com) |
| Validation | [Zod](https://zod.dev) |
| Hosting | [Vercel](https://vercel.com) |

## User Roles

| Role | Capabilities |
|---|---|
| **Owner** | Everything an Admin can do, plus: manage organization settings, change subscription plan, promote/demote Admins |
| **Admin** | Approve, reject, and revoke access requests; create, edit, and deactivate tools; invite members; view audit logs |
| **Member** | Submit access requests; view own requests; cancel own pending requests |

## Subscription Plans

| Plan | Members | Tools |
|---|---|---|
| Free | Up to 5 | Up to 10 |
| Pro | Up to 25 | Up to 50 |
| Enterprise | Unlimited | Unlimited |

## Project Structure

```
itam/
├── app/
│   ├── (auth)/              # Public auth pages (login, signup)
│   ├── api/                 # Route handlers
│   │   ├── auth/            # Signup and OAuth callback
│   │   ├── audit-logs/      # Paginated audit log with CSV export
│   │   ├── invitations/     # Invite, validate, and accept invitations
│   │   ├── payments/        # Razorpay order creation and verification
│   │   ├── plan/            # Plan read and update
│   │   ├── requests/        # Access request CRUD + approve/reject/revoke/cancel
│   │   ├── settings/        # Tenant settings
│   │   ├── team/            # Member management and role changes
│   │   └── tools/           # Tool CRUD
│   ├── dashboard/           # Protected dashboard pages
│   │   ├── audit/           # Audit log viewer with filters and CSV export
│   │   ├── plan/            # Subscription plan management
│   │   ├── requests/        # Access requests (different views per role)
│   │   ├── settings/        # Organization settings
│   │   ├── team/            # Team and invitations management
│   │   ├── tools/           # Tool catalog (request or manage per role)
│   │   └── welcome/         # Onboarding flow
│   └── invite/[token]/      # Invitation acceptance page
├── components/
│   ├── layout/              # DashboardShell, Header, Sidebar
│   └── ui/                  # shadcn/ui components
├── lib/
│   ├── resend.ts            # Email sending (Gmail SMTP)
│   ├── rate-limit.ts        # Rate-limiting utility
│   ├── utils.ts             # Shared utilities
│   └── supabase/            # Supabase client (browser + server + admin)
└── supabase/
    ├── config.toml
    └── migrations/          # All schema migrations
```

## Database Schema

Six tables, all with Row Level Security enabled:

- **`tenants`** - organizations with plan and usage limits
- **`users`** - members linked to an auth user and a tenant, with a role
- **`tools`** - internal tools managed per tenant
- **`access_requests`** - requests from members to access tools (`pending` → `approved`/`rejected`; `approved` → `revoked`)
- **`audit_logs`** - append-only event log (no UPDATE or DELETE policies)
- **`invitations`** - tokenized invite links that expire after 7 days

JWT custom claims (`tenant_id`, `role`) are injected via a Supabase Auth hook and used in all RLS policies via a `my_tenant_id()` helper function.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli)
- A Supabase project
- A Gmail account with an [App Password](https://support.google.com/accounts/answer/185833)
- A Razorpay account (for plan upgrades)

### 1. Clone and install

```bash
git clone https://github.com/Dev-5804/itam.git
cd itam
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Gmail SMTP)
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your-app-password

# Payments (Razorpay)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Apply database migrations

```bash
supabase link --project-ref your-project-ref
supabase db push
```

### 4. Configure Supabase Auth

In the Supabase dashboard:
- Enable **Email/Password** authentication
- Enable **Google OAuth** and add your Google Cloud Console credentials
- Register the `add_custom_claims` function as the **Custom Access Token Hook** under Authentication → Hooks

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## API Reference

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Create auth user, tenant, and owner profile |
| GET | `/api/auth/callback` | Public | Handle OAuth callback |
| POST | `/api/invitations` | Admin, Owner | Send an invitation email |
| GET | `/api/invitations/[token]` | Public | Validate an invitation token |
| POST | `/api/invitations/[token]/accept` | Public | Accept an invitation and create account |
| GET | `/api/tools` | All | List all tools for the tenant |
| POST | `/api/tools` | Admin, Owner | Create a new tool |
| PATCH | `/api/tools/[id]` | Admin, Owner | Update a tool |
| GET | `/api/requests` | All | List requests (members see own; admins see all) |
| POST | `/api/requests` | Member | Submit an access request |
| PATCH | `/api/requests/[id]/approve` | Admin, Owner | Approve a request |
| PATCH | `/api/requests/[id]/reject` | Admin, Owner | Reject a request |
| PATCH | `/api/requests/[id]/revoke` | Admin, Owner | Revoke an approved request |
| PATCH | `/api/requests/[id]/cancel` | Member | Cancel own pending request |
| GET | `/api/team` | Admin, Owner | List all team members |
| PATCH | `/api/team/[id]/role` | Owner | Change a member's role |
| DELETE | `/api/team/[id]` | Owner | Remove a member |
| GET | `/api/audit-logs` | Admin, Owner | Paginated audit log with filters |
| GET | `/api/plan` | Owner | Get current plan and usage |
| PATCH | `/api/plan` | Owner | Change subscription plan |
| GET | `/api/settings` | Owner | Get organization settings |
| PATCH | `/api/settings` | Owner | Update organization name |
| POST | `/api/payments/create-order` | Owner | Create a Razorpay order |
| POST | `/api/payments/verify` | Owner | Verify payment and upgrade plan |

## Deployment

Deploy to Vercel with one click:

[![Deploy with Vercel](https://vercel.com/button)](https://itam-kappa.vercel.app/dashboard/tools)

Set all environment variables from the `.env.local` section above in your Vercel project settings. Set `NEXT_PUBLIC_APP_URL` to your production URL.

## Security

- Row Level Security is enabled on every table - tenants can never access each other's data
- `tenant_id` and `role` are always extracted from the verified JWT, never from the request body
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) are applied to all routes
- All inputs are validated with Zod on both client and server
- Audit logs are append-only - no UPDATE or DELETE policies exist on that table

## License

MIT
