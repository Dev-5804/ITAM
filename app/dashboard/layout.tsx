import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'
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

    // If user doesn't have an organization, redirect to welcome (unless already there)
    if (!userData?.tenant_id) {
        const headersList = await headers()
        const pathname = headersList.get('x-pathname') || ''
        const isTenantlessPage = pathname.startsWith('/dashboard/welcome') ||
            pathname.startsWith('/dashboard/create-organization')
        if (isTenantlessPage) {
            return <>{children}</>
        }
        redirect('/dashboard/welcome')
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
        <DashboardShell role={role} tenantName={tenantName} userName={userName}>
            {children}
        </DashboardShell>
    )
}
