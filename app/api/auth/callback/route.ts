import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const origin = requestUrl.origin

    // Build the redirect response up-front so we can attach session cookies to it.
    const redirectResponse = NextResponse.redirect(`${origin}/dashboard`)

    if (code) {
        // Wire the Supabase client to write cookies directly onto the redirect
        // response. Using cookies() from next/headers here would write to Next.js's
        // internal store, which is NOT attached to the redirect response — meaning
        // the browser would never receive the session cookies.
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll()
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            redirectResponse.cookies.set(name, value, options)
                        )
                    },
                },
            }
        )

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

    return redirectResponse
}
