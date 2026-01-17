import { OrganizationProvider } from '@/lib/context/organization-context'

export default function TestRolesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <OrganizationProvider>{children}</OrganizationProvider>
}
