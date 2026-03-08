import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Use admin client to bypass RLS (my_tenant_id() in RLS requires JWT claim
    // which may not be set if the custom claims hook isn't configured)
    const supabaseAdmin = await createAdminClient()
    const { data: userData } = await supabaseAdmin
        .from('users')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single()

    let tenantId: string | null = userData?.tenant_id ?? null

    // Recovery: if public.users row is missing/stale but app_metadata has tenant_id
    // (can happen if the invitation accept set app_metadata but failed to upsert the DB row)
    if (!tenantId && user.app_metadata?.tenant_id) {
        tenantId = user.app_metadata.tenant_id as string
        const role = (user.app_metadata?.role as string) || 'member'
        const fullName = (user.user_metadata?.full_name as string) || null
        await supabaseAdmin.from('users').upsert(
            { id: user.id, tenant_id: tenantId, role, full_name: fullName },
            { onConflict: 'id' }
        )
    }

    if (tenantId) {
        const role = userData?.role || 'member'
        if (role === 'owner') {
            redirect('/dashboard/plan')
        }
        redirect('/dashboard/requests')
    }

    // Otherwise show the welcome/onboarding page
    redirect('/dashboard/welcome')
}
