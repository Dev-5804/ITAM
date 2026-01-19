'use client'

import { useOrganization } from '@/lib/context/organization-context'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  Wrench, 
  FileText, 
  Activity, 
  Settings, 
  ChevronDown,
  LogOut,
  User,
  Shield,
  Building2,
  Mail
} from 'lucide-react'
import Link from 'next/link'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { currentOrganization, organizations = [], setCurrentOrganizationId, userRole } = useOrganization()
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [userEmail, setUserEmail] = useState<string>('')
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [pendingInvitationsCount, setPendingInvitationsCount] = useState(0)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    const fetchPendingRequests = async () => {
      if (!currentOrganization) return

      try {
        const response = await fetch(`/api/organizations/${currentOrganization.id}/access-requests`)
        const data = await response.json()
        if (response.ok) {
          const pending = data.requests?.filter((r: any) => r.status === 'PENDING').length || 0
          setPendingRequestsCount(pending)
        }
      } catch (error) {
        console.error('Error fetching pending requests:', error)
      }
    }

    fetchPendingRequests()
    
    // Refresh pending count every 30 seconds
    const interval = setInterval(fetchPendingRequests, 30000)
    return () => clearInterval(interval)
  }, [currentOrganization])

  useEffect(() => {
    const fetchPendingInvitations = async () => {
      try {
        const response = await fetch('/api/invitations')
        const data = await response.json()
        if (response.ok) {
          setPendingInvitationsCount(data.invitations?.length || 0)
        }
      } catch (error) {
        console.error('Error fetching pending invitations:', error)
      }
    }

    fetchPendingInvitations()
    
    // Refresh pending count every 30 seconds
    const interval = setInterval(fetchPendingInvitations, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['OWNER', 'ADMIN', 'MEMBER'], requiresOrg: true },
    { name: 'My Invitations', icon: Mail, href: '/invitations', roles: ['OWNER', 'ADMIN', 'MEMBER'], badge: 'invitations', requiresOrg: false },
    { name: 'Tools', icon: Wrench, href: '/tools', roles: ['OWNER', 'ADMIN'], requiresOrg: true },
    { name: 'Access Requests', icon: FileText, href: '/access-requests', roles: ['OWNER', 'ADMIN', 'MEMBER'], badge: 'requests', requiresOrg: true },
    { name: 'Audit Logs', icon: Activity, href: '/audit-logs', roles: ['OWNER', 'ADMIN'], requiresOrg: true },
    { name: 'Settings', icon: Settings, href: '/settings', roles: ['OWNER', 'ADMIN', 'MEMBER'], requiresOrg: true },
  ]

  const visibleNavItems = navItems.filter(item => {
    // Show "My Invitations" even without an organization
    if (!item.requiresOrg) return true
    // Other items require organization and role
    return currentOrganization && userRole && item.roles.includes(userRole)
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-neutral-200 dark:border-neutral-800">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="p-2 bg-black dark:bg-white rounded-lg">
              <Shield className="w-5 h-5 text-white dark:text-black" />
            </div>
            <span className="font-bold text-lg text-black dark:text-white">ITAM</span>
          </Link>
        </div>

        {/* Organization Selector */}
        <div className="px-4 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="w-full flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="w-4 h-4 text-neutral-500 flex-shrink-0" />
                <span className="text-sm font-semibold text-black dark:text-white truncate">
                  {currentOrganization?.name || 'Select org'}
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            </button>

            {orgDropdownOpen && organizations.length > 1 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg z-50 py-1">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      setCurrentOrganizationId(org.id)
                      setOrgDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 ${
                      currentOrganization?.id === org.id
                        ? 'text-black dark:text-white font-semibold'
                        : 'text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Role Badge */}
          {userRole && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${getRoleBadgeColor(userRole)}`}>
                {userRole}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const showBadge = 
              (item.badge === 'requests' && pendingRequestsCount > 0) ||
              (item.badge === 'invitations' && pendingInvitationsCount > 0)
            const badgeCount = item.badge === 'requests' ? pendingRequestsCount : pendingInvitationsCount
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative ${
                  isActive
                    ? 'bg-black dark:bg-white text-white dark:text-black'
                    : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
                {showBadge && (
                  <span className="ml-auto bg-amber-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                    {badgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Menu */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-colors"
            >
              <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-black dark:text-white truncate">{userEmail}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-500 flex-shrink-0" />
            </button>

            {userDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg z-50 py-1">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
