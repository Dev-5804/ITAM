import { createClient } from '@/lib/supabase/server'
import { isAdminOrOwner, checkSubscriptionLimits } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'

// GET /api/organizations/[organizationId]/tools - List all tools
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

  try {
    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    let query = supabase
      .from('tools')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (!includeArchived) {
      query = query.is('deleted_at', null)
    }

    const { data: tools, error } = await query

    if (error) throw error

    return Response.json({ tools })
  } catch (error: any) {
    console.error('Error fetching tools:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/organizations/[organizationId]/tools - Create a new tool
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

  // Check if user is admin or owner
  const hasPermission = await isAdminOrOwner(organizationId, user.id)
  if (!hasPermission) {
    return Response.json({ error: 'Forbidden: Admin or Owner role required' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, description, category } = body

    if (!name) {
      return Response.json({ error: 'Tool name is required' }, { status: 400 })
    }

    // Check subscription limits
    const limits = await checkSubscriptionLimits(organizationId)
    if (!limits.canAddTool) {
      return Response.json(
        {
          error: `Tool limit reached (${limits.limits.tools}). Upgrade to add more tools.`,
        },
        { status: 400 }
      )
    }

    // Create tool
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .insert({
        organization_id: organizationId,
        name,
        description: description || null,
        category: category || null,
        status: 'ACTIVE',
      })
      .select()
      .single()

    if (toolError) throw toolError

    // Create default access levels
    const accessLevels = [
      { tool_id: tool.id, level: 'READ', description: 'Read-only access' },
      { tool_id: tool.id, level: 'WRITE', description: 'Read and write access' },
      { tool_id: tool.id, level: 'ADMIN', description: 'Full administrative access' },
    ]

    const { error: levelsError } = await supabase
      .from('tool_access_levels')
      .insert(accessLevels)

    if (levelsError) throw levelsError

    // Create audit log
    await createAuditLog({
      organizationId,
      actorId: user.id,
      action: 'TOOL_CREATED',
      resourceType: 'tool',
      resourceId: tool.id,
      metadata: { name, category },
    })

    return Response.json({ tool })
  } catch (error: any) {
    console.error('Error creating tool:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
