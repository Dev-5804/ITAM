import { createClient } from '@/lib/supabase/server'
import { isAdminOrOwner, checkSubscriptionLimits } from '@/lib/rbac'
import { createAuditLog } from '@/lib/audit'
import crypto from 'crypto'

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
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { email, role = 'MEMBER' } = body

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if invitee already has a user account and membership
    const { data: inviteeUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (inviteeUser) {
      const { data: existingMembership } = await supabase
        .from('memberships')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', inviteeUser.id)
        .is('deleted_at', null)
        .single()

      if (existingMembership) {
        return Response.json({ error: 'User already has membership' }, { status: 400 })
      }
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex')

    // Create invitation via secure RPC (includes limit checks)
    const { data: invitationId, error: inviteError } = await supabase
      .rpc('create_invitation', {
        org_id: organizationId,
        invitee_email: email.toLowerCase(),
        invitee_role: role,
        invitation_token: token,
        expires_days: 7
      })

    if (inviteError) {
      if (inviteError.message.includes('limit reached')) {
        return Response.json({ error: inviteError.message }, { status: 400 })
      }
      if (inviteError.code === '23505' || inviteError.message.includes('duplicate')) {
        return Response.json({ error: 'Invitation already sent to this email' }, { status: 400 })
      }
      throw inviteError
    }

    // Fetch the created invitation
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single()

    if (fetchError) throw fetchError

    return Response.json({ invitation })
  } catch (error: any) {
    console.error('Error creating invitation:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

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
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*, inviter:profiles!invitations_invited_by_fkey(*)')
      .eq('organization_id', organizationId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ invitations })
  } catch (error: any) {
    console.error('Error fetching invitations:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
