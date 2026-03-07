import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReactNode } from 'react'

export default async function CreateOrganizationLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        redirect('/login')
    }

    // Check if user already has an organization
    const { data: userData } = await supabase
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
