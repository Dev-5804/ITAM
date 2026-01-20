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

    if (!status || !['APPROVED', 'REJECTED', 'REVOKED'].includes(status)) {
      return Response.json(
        { error: 'Status must be APPROVED, REJECTED, or REVOKED' },
        { status: 400 }
      )
    }

    // Review access request via secure RPC
    const { error: reviewError } = await supabase
      .rpc('review_access_request', {
        request_id: requestId,
        new_status: status
      })

    if (reviewError) {
      throw reviewError
    }

    // Fetch the updated request
    const { data: accessRequest, error: fetchError } = await supabase
      .from('access_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchError) throw fetchError

    return Response.json({ request: accessRequest })
  } catch (error: any) {
    console.error('Error updating access request:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
