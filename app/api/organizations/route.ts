import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // This will use RLS policies to filter organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return Response.json({ organizations })
  } catch (error: any) {
    console.error('Error fetching organizations:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

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

    // Create organization via secure RPC
    const { data: orgId, error: orgError } = await supabase
      .rpc('create_organization', {
        org_name: name,
        org_slug: slug
      })

    if (orgError) {
      if (orgError.code === '23505' || orgError.message.includes('duplicate')) {
        return Response.json({ error: 'Organization slug already exists' }, { status: 400 })
      }
      throw orgError
    }

    // Fetch the created organization
    const { data: org, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (fetchError) throw fetchError

    return Response.json({ organization: org })
  } catch (error: any) {
    console.error('Error creating organization:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}
