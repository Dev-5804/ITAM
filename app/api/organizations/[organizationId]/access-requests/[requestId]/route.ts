import { createClient } from '@/lib/supabase/server'
import { isAdminOrOwner } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

// PATCH - Update access request (approve/reject)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ organizationId: string; requestId: string }> }
) {
  const { organizationId, requestId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only admins/owners can approve/reject requests
  const hasPermission = await isAdminOrOwner(organizationId, user.id)
  if (!hasPermission) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { status } = body

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return Response.json(
        { error: 'Status must be APPROVED or REJECTED' },
        { status: 400 }
      )
    }

    const { data: accessRequest, error } = await supabase
      .from('access_requests')
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) throw error

    // Create audit log
    await createAuditLog({
      organizationId,
      actorId: user.id,
      action: `ACCESS_REQUEST_${status}`,
      resourceType: 'access_request',
      resourceId: accessRequest.id,
      metadata: { status },
    })

    return Response.json({ request: accessRequest })
  } catch (error: any) {
    console.error('Error updating access request:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
