import { createClient } from '@/lib/supabase/server'

// GET - Fetch invitations for the current user
export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch invitations sent to the user's email (case-insensitive)
    const { data: invitations, error: invitationsError } = await supabase
      .from('invitations')
      .select('*, organization:organizations(id, name)')
      .ilike('email', user.email || '')
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (invitationsError) throw invitationsError

    // Fetch all unique inviter IDs
    const inviterIds = [...new Set(invitations?.map((inv) => inv.invited_by) || [])]

    if (inviterIds.length === 0) {
      return Response.json({ invitations: [] })
    }

    // Fetch profiles for all inviters
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', inviterIds)

    if (profilesError) throw profilesError

    // Map profiles to invitations
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])
    const invitationsWithProfiles = invitations?.map((invitation) => ({
      ...invitation,
      inviter: profileMap.get(invitation.invited_by) || null,
    }))

    return Response.json({ invitations: invitationsWithProfiles })
  } catch (error: any) {
    console.error('Error fetching invitations:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Decline an invitation
export async function DELETE(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { invitationId } = await request.json()

    if (!invitationId) {
      return Response.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Verify the invitation belongs to the user
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .ilike('email', user.email || '')
      .single()

    if (fetchError || !invitation) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // Delete the invitation
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)

    if (deleteError) throw deleteError

    return Response.json({ success: true })
  } catch (error: any) {
    console.error('Error declining invitation:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
