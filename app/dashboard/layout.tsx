import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // Use admin client to bypass RLS (my_tenant_id() in RLS requires JWT claim
    // which may not be set if the custom claims hook isn't configured)
    const supabaseAdmin = await createAdminClient()
    let { data: userData } = await supabaseAdmin
        .from('users')
        .select('role, full_name, tenant_id')
        .eq('id', user.id)
        .single()

    // Recovery: if public.users row is missing/stale but app_metadata has tenant_id
    if (!userData?.tenant_id && user.app_metadata?.tenant_id) {
        const tenantId = user.app_metadata.tenant_id as string
        const role = (user.app_metadata?.role as string) || 'member'
        const fullName = (user.user_metadata?.full_name as string) || null
        await supabaseAdmin.from('users').upsert(
            { id: user.id, tenant_id: tenantId, role, full_name: fullName },
            { onConflict: 'id' }
        )
        userData = { tenant_id: tenantId, role, full_name: fullName }
    }

    // If user doesn't have an organization, don't render the dashboard UI
    // The create-organization page will handle this case
    if (!userData?.tenant_id) {
        return <>{children}</>
    }

    let tenantName = 'Your Organization'
    const { data: tenantData } = await supabaseAdmin
        .from('tenants')
        .select('name')
        .eq('id', userData.tenant_id)
        .single()

    if (tenantData) {
        tenantName = tenantData.name
    }

    const role = userData?.role || 'member'
    const userName = userData?.full_name || user?.email || 'User'

    return (
        <div className="flex h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
            <Sidebar role={role} tenantName={tenantName} userName={userName} />
            <div className="flex flex-col flex-1 overflow-hidden transition-all duration-300">
                <Header userName={userName} role={role} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 ease-in-out">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
