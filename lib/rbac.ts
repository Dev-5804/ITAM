import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/types/database'

export async function getUserMemberships(userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('memberships')
    .select('*, organization:organizations(*)')
    .eq('user_id', userId)
    .is('deleted_at', null)

  if (error) throw error
  return data
}

export async function getUserRole(organizationId: string, userId: string): Promise<UserRole | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single()

  if (error) return null
  return data?.role as UserRole
}

export async function isAdminOrOwner(organizationId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(organizationId, userId)
  return role === 'ADMIN' || role === 'OWNER'
}

export async function isOwner(organizationId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(organizationId, userId)
  return role === 'OWNER'
}

export async function isOrganizationMember(organizationId: string, userId: string): Promise<boolean> {
  const role = await getUserRole(organizationId, userId)
  return role !== null
}

export async function getOrganizationSubscription(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error) throw error
  return data
}

export async function checkSubscriptionLimits(organizationId: string) {
  const supabase = await createClient()

  const [subscription, memberCount, toolCount] = await Promise.all([
    getOrganizationSubscription(organizationId),
    supabase
      .from('memberships')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
    supabase
      .from('tools')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .is('deleted_at', null),
  ])

  const currentMembers = memberCount.count || 0
  const currentTools = toolCount.count || 0

  return {
    canAddMember: currentMembers < subscription.user_limit,
    canAddTool: currentTools < subscription.tool_limit,
    currentMembers,
    currentTools,
    limits: {
      users: subscription.user_limit,
      tools: subscription.tool_limit,
    },
  }
}
