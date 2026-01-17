import { createClient } from '@/lib/supabase/server'
import { isAdminOrOwner } from '@/lib/rbac'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ organizationId: string }> }
) {
  const { organizationId } = await params
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
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select('*, user:profiles(*)')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ memberships })
  } catch (error: any) {
    console.error('Error fetching memberships:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
