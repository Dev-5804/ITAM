import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if user has an organization
    const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

    // If user has tenant_id, redirect to plan page
    // Note: don't join tenants here — the RLS tenant_select policy relies on
    // my_tenant_id() from the JWT, which may be stale right after org creation.
    // Reading tenant_id directly from the users row is always accurate.
    if (userData?.tenant_id) {
        redirect('/dashboard/plan')
    }

    // Otherwise show the welcome/onboarding page
    redirect('/dashboard/welcome')
}
