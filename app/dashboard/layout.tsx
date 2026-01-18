import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OrganizationProvider } from '@/lib/context/organization-context'
import { DashboardLayout as Layout } from '@/components/dashboard-layout'

export default async function DashboardLayout({
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
      <Layout>{children}</Layout>
    </OrganizationProvider>
  )
}
