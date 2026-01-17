import { OrganizationProvider } from '@/lib/context/organization-context'

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <OrganizationProvider>{children}</OrganizationProvider>
}
