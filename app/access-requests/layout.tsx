import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrganizationProvider } from '@/lib/context/organization-context'
import { DashboardLayout } from '@/components/dashboard-layout'

export default async function AccessRequestsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <OrganizationProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </OrganizationProvider>
  )
}
