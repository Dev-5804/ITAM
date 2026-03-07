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
        .select('tenant_id, tenants(id)')
        .eq('id', user.id)
        .single()

    // If user has tenant_id AND the tenant exists, redirect to plan page
    if (userData?.tenant_id && userData.tenants) {
        redirect('/dashboard/plan')
    }

    // Otherwise show the welcome/onboarding page
    redirect('/dashboard/welcome')
}
