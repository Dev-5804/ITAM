import { createClient } from '@/lib/supabase/server'

interface CreateAuditLogParams {
  organizationId: string
  actorId: string | null
  action: string
  resourceType: string
  resourceId?: string
  metadata?: Record<string, any>
}

export async function createAuditLog({
  organizationId,
  actorId,
  action,
  resourceType,
  resourceId,
  metadata,
}: CreateAuditLogParams) {
  const supabase = await createClient()

  const { error } = await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_id: actorId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata,
  })

  if (error) {
    console.error('Failed to create audit log:', error)
  }
}
