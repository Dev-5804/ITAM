import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { ReactNode } from 'react'

export default async function WelcomeLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // Use admin client to bypass RLS (my_tenant_id() in RLS requires JWT claim
    // which may not be set if the custom claims hook isn't configured)
    const supabaseAdmin = await createAdminClient()
    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    // If user already has an organization, redirect to dashboard plan
    if (userData?.tenant_id) {
        redirect('/dashboard/plan')
    }

    return <>{children}</>
}
