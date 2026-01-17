import { createClient } from '@/lib/supabase/server'
import { isAdminOrOwner } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

// GET /api/organizations/[organizationId]/tools/[toolId] - Get single tool
export async function GET(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; toolId: string }> }
) {
  const { organizationId, toolId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: tool, error } = await supabase
      .from('tools')
      .select('*, access_levels:tool_access_levels(*)')
      .eq('id', toolId)
      .eq('organization_id', organizationId)
      .single()

    if (error) throw error
    if (!tool) {
      return Response.json({ error: 'Tool not found' }, { status: 404 })
    }

    return Response.json({ tool })
  } catch (error: any) {
    console.error('Error fetching tool:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/organizations/[organizationId]/tools/[toolId] - Update tool
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; toolId: string }> }
) {
  const { organizationId, toolId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin or owner
  const hasPermission = await isAdminOrOwner(organizationId, user.id)
  if (!hasPermission) {
    return Response.json({ error: 'Forbidden: Admin or Owner role required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, category, status } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (category !== undefined) updates.category = category
    if (status !== undefined) updates.status = status

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: tool, error } = await supabase
      .from('tools')
      .update(updates)
      .eq('id', toolId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error

    // Create audit log
    await createAuditLog({
      organizationId,
      actorId: user.id,
      action: 'TOOL_UPDATED',
      resourceType: 'tool',
      resourceId: toolId,
      metadata: updates,
    })

    return Response.json({ tool })
  } catch (error: any) {
    console.error('Error updating tool:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/organizations/[organizationId]/tools/[toolId] - Archive tool (soft delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; toolId: string }> }
) {
  const { organizationId, toolId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is admin or owner
  const hasPermission = await isAdminOrOwner(organizationId, user.id)
  if (!hasPermission) {
    return Response.json({ error: 'Forbidden: Admin or Owner role required' }, { status: 403 })
  }

  try {
    // Soft delete by setting deleted_at
    const { data: tool, error } = await supabase
      .from('tools')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', toolId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error

    // Create audit log
    await createAuditLog({
      organizationId,
      actorId: user.id,
      action: 'TOOL_ARCHIVED',
      resourceType: 'tool',
      resourceId: toolId,
      metadata: { name: tool.name },
    })

    return Response.json({ message: 'Tool archived successfully', tool })
  } catch (error: any) {
    console.error('Error archiving tool:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
