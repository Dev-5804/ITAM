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

    // Create tool via secure RPC (includes limit checks)
    const { data: toolId, error: toolError } = await supabase
      .rpc('create_tool', {
        org_id: organizationId,
        tool_name: name,
        tool_description: description || null,
        tool_category: category || null
      })

    if (toolError) {
      if (toolError.message.includes('limit reached')) {
        return Response.json({ error: toolError.message }, { status: 400 })
      }
      throw toolError
    }

    // Fetch the created tool
    const { data: tool, error: fetchError } = await supabase
      .from('tools')
      .select('*')
      .eq('id', toolId)
      .single()

    if (fetchError) throw fetchError

    return Response.json({ tool })
  } catch (error: any) {
    console.error('Error creating tool:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
