import { createClient } from '@/lib/supabase/server'
import { createAuditLog } from '@/lib/audit'
import { redirect } from 'next/navigation'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?error=Please sign in to accept invitation')
  }

  try {
    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (inviteError || !invitation) {
      redirect('/dashboard?error=Invalid or expired invitation')
    }

    // Check if invitation expired
    if (new Date(invitation.expires_at) < new Date()) {
      redirect('/dashboard?error=Invitation has expired')
    }

    // Check if email matches
    if (invitation.email.toLowerCase() !== user.email?.toLowerCase()) {
      redirect('/dashboard?error=This invitation was sent to a different email address')
    }

    // Create membership
    const { error: membershipError } = await supabase.from('memberships').insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
    })

    if (membershipError) {
      if (membershipError.code === '23505') {
        redirect('/dashboard?error=You are already a member of this organization')
      }
      throw membershipError
    }

    // Mark invitation as accepted
    await supabase
      .from('invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)

    // Create audit log
    await createAuditLog({
      organizationId: invitation.organization_id,
      actorId: user.id,
      action: 'INVITATION_ACCEPTED',
      resourceType: 'invitation',
      resourceId: invitation.id,
      metadata: { email: invitation.email, role: invitation.role },
    })

    redirect('/dashboard?success=Successfully joined organization')
  } catch (error: any) {
    console.error('Error accepting invitation:', error)
    redirect('/dashboard?error=Failed to accept invitation')
  }
}
