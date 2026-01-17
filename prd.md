# Product Requirements Document (PRD)

## Product Name

**Internal Tool Access Manager (ITAM)**

---

## 1. Product Objective

Build a multi-tenant SaaS application that **records, governs, and audits access to internal tools** used by organizations.

The system **must enforce approval workflows and audit logs**.
The system **must not automate or control access inside third-party tools**.

---

## 2. Fixed Technology Stack

### Frontend

* Next.js (App Router)
* React
* Tailwind CSS

### Backend / Platform

* Supabase

  * PostgreSQL (primary database)
  * Supabase Auth (email/password + OAuth)

---

## 3. Authentication Requirements (Mandatory)

### 3.1 Authentication Providers

* Supabase Auth **must** be used
* Supported login methods:

  * Email + password
  * OAuth: GitHub and Google

### 3.2 Authentication Rules

* OAuth **must be used only for identity verification**
* OAuth **must not**:

  * Assign roles automatically
  * Create organizations automatically
  * Grant tool access
  * Call third-party APIs

### 3.3 Session Handling

* Supabase session **must be used for route protection**
* Server components **must validate sessions**
* Unauthenticated users **must be redirected**

---

## 4. Multi-Tenancy (Mandatory)

* Every user **must belong to at least one organization**
* All business data **must include `organization_id`**
* Cross-organization access **must be impossible**
* Row Level Security (RLS) **must enforce tenant isolation**

---

## 5. User Roles (Strict)

### Owner

* Create organization
* Manage subscription
* Assign roles
* Full access to all data

### Admin

* Manage tools
* Approve / reject access requests
* Revoke access
* View audit logs

### Member

* Request tool access
* View own access history

Role enforcement **must exist in backend and frontend**.

---

## 6. Core Functional Requirements

---

### 6.1 Organization Management

* Owner **must be able to create an organization**
* Owner/Admin **must invite users by email**
* Invited users **must accept invitation**
* Each membership **must store role information**

---

### 6.2 Tool Registry

Admins **must be able to**:

* Create tools
* Update tools
* Archive tools (soft delete)

Each tool **must include**:

* Name
* Category
* Status
* Organization ID

---

### 6.3 Access Levels

Each tool **must support**:

* Read
* Write
* Admin

Access levels **must be structured data**, not free-text.

---

### 6.4 Access Request Workflow

Members **must be able to**:

* Request access to a tool
* Select exactly one access level
* Provide an optional reason

Request states **must be enforced**:

* `PENDING`
* `APPROVED`
* `REJECTED`
* `REVOKED`

Admins **must be able to**:

* Approve requests
* Reject requests
* Revoke approved access

State transitions **must be validated server-side**.

---

### 6.5 Manual Access Rule (Explicit)

* The system **must not integrate with GitHub, Slack, AWS, or any external tools**
* After approval:

  * Admin **must manually grant access in the real tool**
* The system **must only record approvals and revocations**

UI **must clearly state**:

> “Actual access must be granted manually in the external tool.”

---

### 6.6 Audit Logging (Mandatory)

Audit logs **must be created automatically** for:

* Access requests
* Approvals
* Rejections
* Revocations
* Role changes
* Membership changes
* Authentication events

Audit logs:

* Must be append-only
* Must never be editable or deletable
* Must include actor, action, timestamp, organization

---

## 7. Subscription & Limits

### Plans

| Plan | Limits           |
| ---- | ---------------- |
| Free | 5 users, 3 tools |
| Pro  | Unlimited        |

Rules:

* Limits **must be enforced in backend logic**
* Frontend checks **must not be trusted**
* Violations **must return explicit errors**

---

## 8. Database Requirements (Supabase PostgreSQL)

### Required Tables

* organizations
* memberships
* tools
* tool_access_levels
* access_requests
* audit_logs
* subscriptions

Rules:

* Foreign keys **must be enforced**
* `organization_id` **must exist on all business tables**
* Soft deletes **must be used**
* Indexes **must exist on foreign keys**

---

## 9. Authorization & Security

* Row Level Security **must be enabled**
* Policies **must restrict by organization and role**
* Client-side role checks **must not be trusted**
* Input validation **must exist for all writes**

---

## 10. Frontend Requirements

### Routes (Required)

* `/login`
* `/dashboard`
* `/tools`
* `/access-requests`
* `/audit-logs`
* `/settings`

### UI Rules

* Role-based rendering **must be enforced**
* Unauthorized access **must redirect**
* Loading and error states **must be handled**

---

## 11. Development Flow (Mandatory Order)

### Phase 1 — Foundation

* Next.js setup
* Supabase project setup
* Auth integration (email + OAuth)
* Protected routing

### Phase 2 — Multi-Tenancy

* Organization creation
* Membership model
* Role enforcement
* RLS policies

### Phase 3 — Tool Registry

* Tool CRUD
* Access level modeling
* Admin-only enforcement

### Phase 4 — Access Workflow

* Request creation
* Approval / rejection
* Revocation logic
* Status validation

### Phase 5 — Audit System

* Central logging utility
* Automatic log creation
* Read-only audit UI

### Phase 6 — Subscription Enforcement

* Plan modeling
* Limit checks
* Error feedback

## 12. Explicit Exclusions

The system **must not include**:

* Third-party API calls
* Automated access provisioning
* SSO
* SCIM
* Webhooks

These **may only appear as future scope**.

---

## 13. Acceptance Criteria

The project is complete only if:

* Multi-tenancy is enforced
* RBAC is correct
* Audit logs are immutable
* OAuth is identity-only
* Backend enforces limits
* README documents architecture and decisions
