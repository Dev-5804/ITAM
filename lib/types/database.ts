// Database types based on schema
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER'
export type SubscriptionPlan = 'FREE' | 'PRO'
export type AccessLevel = 'READ' | 'WRITE' | 'ADMIN'
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'

export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface Membership {
  id: string
  organization_id: string
  user_id: string
  role: UserRole
  created_at: string
  updated_at: string
  deleted_at: string | null
  organization?: Organization
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  organization_id: string
  plan: SubscriptionPlan
  user_limit: number
  tool_limit: number
  created_at: string
  updated_at: string
}

export interface Tool {
  id: string
  organization_id: string
  name: string
  url: string
  description: string | null
  category: string | null
  status: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AccessRequest {
  id: string
  organization_id: string
  tool_id: string
  user_id: string
  access_level: AccessLevel
  reason: string | null
  status: RequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
  tool?: Tool
  user?: Profile
  reviewer?: Profile
}

export interface AuditLog {
  id: string
  organization_id: string
  actor_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, any> | null
  created_at: string
  actor?: Profile
}

export interface Invitation {
  id: string
  organization_id: string
  email: string
  role: UserRole
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  inviter?: Profile
}
