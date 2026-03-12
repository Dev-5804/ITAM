import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const RATE_LIMIT_COUNT = 5
const RATE_LIMIT_WINDOW_MS = 60 * 1000

const createOrgSchema = z.object({
    organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
})

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '') + '-' + Math.random().toString(36).substring(2, 6)
}

export async function POST(request: Request) {
    try {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? 'unknown'
        if (!checkRateLimit(ip, RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS)) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
        }

        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const result = createOrgSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
        }

        const { organizationName } = result.data

        // Check if user already has an organization
        const { data: userData } = await supabase
            .from('users')
            .select('tenant_id')
            .eq('id', user.id)
            .single()

        if (userData?.tenant_id) {
            return NextResponse.json({ error: 'You already belong to an organization' }, { status: 400 })
        }

        const orgSlug = slugify(organizationName)
        const supabaseAdmin = await createAdminClient()

        // Create organization for the user
        const { data: tenantId, error: createError } = await supabaseAdmin.rpc('create_organization_for_user', {
            p_user_id: user.id,
            p_org_name: organizationName,
            p_org_slug: orgSlug
        })

        if (createError) {
            return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
        }

        // Update user's JWT with tenant_id
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
            app_metadata: { tenant_id: tenantId }
        })

        return NextResponse.json({ success: true, tenantId })
    } catch (err) {
        console.error('Create organization error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
