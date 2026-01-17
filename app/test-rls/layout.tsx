import { OrganizationProvider } from '@/lib/context/organization-context'

export default function TestRLSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <OrganizationProvider>{children}</OrganizationProvider>
}
