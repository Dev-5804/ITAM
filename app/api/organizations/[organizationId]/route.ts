import { createClient } from '@/lib/supabase/server'
import { isOrganizationMember } from '@/lib/rbac'

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

  // Check if user is a member of the organization
  const isMember = await isOrganizationMember(organizationId, user.id)
  if (!isMember) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (error) throw error

    return Response.json(organization)
  } catch (error: any) {
    console.error('Error fetching organization:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
