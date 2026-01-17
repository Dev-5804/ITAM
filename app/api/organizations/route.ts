import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAuditLog } from '@/lib/audit'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) {
      return Response.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({ name, slug })
      .select()
      .single()

    if (orgError) {
      if (orgError.code === '23505') {
        return Response.json({ error: 'Organization slug already exists' }, { status: 400 })
      }
      throw orgError
    }

    // Create membership with OWNER role
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        organization_id: org.id,
        user_id: user.id,
        role: 'OWNER',
      })

    if (membershipError) throw membershipError

    // Create audit log
    await createAuditLog({
      organizationId: org.id,
      actorId: user.id,
      action: 'ORGANIZATION_CREATED',
      resourceType: 'organization',
      resourceId: org.id,
      metadata: { name, slug },
    })

    return Response.json({ organization: org })
  } catch (error: any) {
    console.error('Error creating organization:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
