import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')

    if (code) {
        const supabase = await createClient()
        const { data: { session } } = await supabase.auth.exchangeCodeForSession(code)

        // For OAuth sign-ins (e.g. Google), ensure a public.users row exists.
        // Email/password users are created via /api/auth/signup which already inserts the row.
        if (session?.user) {
            const user = session.user
            const supabaseAdmin = await createAdminClient()

            const { data: existing } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('id', user.id)
                .maybeSingle()

            if (!existing) {
                const fullName =
                    user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    user.email?.split('@')[0] ||
                    'User'

                await supabaseAdmin.from('users').insert({
                    id: user.id,
                    tenant_id: null,
                    role: 'member',
                    full_name: fullName,
                })
            }
        }
    }

    // URL to redirect to after sign in process completes
    return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
