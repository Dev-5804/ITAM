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
    // Fetch memberships
    const { data: memberships, error: membershipsError } = await supabase
      .from('memberships')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (membershipsError) throw membershipsError

    // Fetch profiles for all user_ids
    const userIds = memberships?.map((m) => m.user_id) || []
    
    if (userIds.length === 0) {
      return Response.json({ memberships: [] })
    }

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', userIds)

    if (profilesError) throw profilesError

    // Map profiles to memberships
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
    const membershipsWithProfiles = memberships?.map((membership) => ({
      ...membership,
      user: profileMap.get(membership.user_id) || null,
    }))

    return Response.json({ memberships: membershipsWithProfiles })
  } catch (error: any) {
    console.error('Error fetching memberships:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
