import { createClient } from '@/lib/supabase/server'
import { isOrganizationMember, isAdminOrOwner } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

// GET - Fetch access requests
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

  const isMember = await isOrganizationMember(organizationId, user.id)
  if (!isMember) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const isAdminUser = await isAdminOrOwner(organizationId, user.id)

    // If admin/owner, show all pending requests
    // If regular member, show only their own requests
    let query = supabase
      .from('access_requests')
      .select('*, tool:tools(id, name)')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (!isAdminUser) {
      query = query.eq('user_id', user.id)
    }

    const { data: requests, error } = await query

    if (error) throw error

    // Fetch all unique user IDs and reviewer IDs
    const userIds = new Set<string>()
    requests?.forEach((req) => {
      userIds.add(req.user_id)
      if (req.reviewed_by) userIds.add(req.reviewed_by)
    })

    // Fetch profiles for all users
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(userIds))

    if (profilesError) throw profilesError

    // Map profiles to requests
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
    const requestsWithProfiles = requests?.map((request) => ({
      ...request,
      user: profileMap.get(request.user_id) || null,
      reviewer: request.reviewed_by ? profileMap.get(request.reviewed_by) || null : null,
    }))

    return Response.json({ requests: requestsWithProfiles })
  } catch (error: any) {
    console.error('Error fetching access requests:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create a new access request
export async function POST(
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

  const isMember = await isOrganizationMember(organizationId, user.id)
  if (!isMember) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { tool_id, access_level, reason } = body

    if (!tool_id || !access_level) {
      return Response.json(
        { error: 'Tool ID and access level are required' },
        { status: 400 }
      )
    }

    // Check if there's already a pending request
    const { data: existingRequest } = await supabase
      .from('access_requests')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('tool_id', tool_id)
      .eq('user_id', user.id)
      .eq('status', 'PENDING')
      .single()

    if (existingRequest) {
      return Response.json(
        { error: 'You already have a pending request for this tool' },
        { status: 400 }
      )
    }

    const { data: accessRequest, error } = await supabase
      .from('access_requests')
      .insert({
        organization_id: organizationId,
        tool_id,
        user_id: user.id,
        access_level,
        reason,
        status: 'PENDING',
      })
      .select()
      .single()

    if (error) throw error

    // Create audit log
    await createAuditLog({
      organizationId,
      actorId: user.id,
      action: 'ACCESS_REQUEST_CREATED',
      resourceType: 'access_request',
      resourceId: accessRequest.id,
      metadata: { tool_id, access_level, reason },
    })

    return Response.json({ request: accessRequest })
  } catch (error: any) {
    console.error('Error creating access request:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
