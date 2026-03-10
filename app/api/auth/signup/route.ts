import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

const RATE_LIMIT_COUNT = 5
const RATE_LIMIT_WINDOW_MS = 60 * 1000

const signUpSchema = z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
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
        const ip = request.headers.get('x-forwarded-for') || '127.0.0.1'
        if (!checkRateLimit(ip, RATE_LIMIT_COUNT, RATE_LIMIT_WINDOW_MS)) {
            return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
        }

        const body = await request.json()
        const result = signUpSchema.safeParse(body)

        if (!result.success) {
            return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 })
        }

        const { fullName, email, password } = result.data

        // Use the admin client to create the user
        const supabaseAdmin = await createAdminClient()

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        })

        if (authError || !authData.user) {
            return NextResponse.json({ error: authError?.message || 'Failed to create user' }, { status: 400 })
        }

        const userId = authData.user.id

        // Create user record without tenant (user can create or join org later)
        const { error: insertError } = await supabaseAdmin
            .from('users')
            .insert({
                id: userId,
                tenant_id: null,
                role: 'member',
                full_name: fullName
            })

        if (insertError) {
            // Rollback auth user creation if user record creation fails
            await supabaseAdmin.auth.admin.deleteUser(userId)
            return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
        }

        // Return success — client will sign in using the password it already has
        return NextResponse.json({ success: true, email })
    } catch (err) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
