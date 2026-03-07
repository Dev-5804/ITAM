import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { ReactNode } from 'react'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    const { data: userData } = await supabase
        .from('users')
        .select('role, full_name, tenant_id')
        .eq('id', user.id)
        .single()

    // If user doesn't have an organization, don't render the dashboard UI
    // The create-organization page will handle this case
    if (!userData?.tenant_id) {
        return <>{children}</>
    }

    let tenantName = 'Your Organization'
    const { data: tenantData } = await supabase
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
