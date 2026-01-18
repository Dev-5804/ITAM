'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@/lib/context/organization-context'
import Link from 'next/link'
import { RoleGuard } from '@/components/role-guard'
import { Wrench, Users, FileText, Activity } from 'lucide-react'

interface DashboardStats {
  totalTools: number
  activeUsers: number
  pendingRequests: number
}

interface AuditLog {
  id: string
  action: string
  actor_email: string
  target: string
  created_at: string
}

export default function DashboardPage() {
  const { currentOrganization } = useOrganization()
  const [stats, setStats] = useState<DashboardStats>({
    totalTools: 0,
    activeUsers: 0,
    pendingRequests: 0
  })
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentOrganization) {
      fetchDashboardData()
    }
  }, [currentOrganization])

  const fetchDashboardData = async () => {
    if (!currentOrganization) return

    try {
      setLoading(true)

      // Fetch tools count
      const toolsRes = await fetch(`/api/organizations/${currentOrganization.id}/tools`)
      const toolsData = await toolsRes.json()
      const totalTools = toolsData.tools?.length || 0

      // Fetch members count
      const membersRes = await fetch(`/api/organizations/${currentOrganization.id}/members`)
      const membersData = await membersRes.json()
      const activeUsers = membersData.members?.length || 0

      // Fetch pending access requests count (you'll need to create this endpoint)
      // For now, we'll set it to 0
      const pendingRequests = 0

      setStats({
        totalTools,
        activeUsers,
        pendingRequests
      })

      // Fetch recent activity (audit logs) - you'll need to create this endpoint
      // For now, we'll use empty array
      setRecentActivity([])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!currentOrganization) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-neutral-600 dark:text-neutral-400 mb-4">No organization selected</p>
          <Link
            href="/organizations/create"
            className="inline-flex items-center px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90"
          >
            Create Organization
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Dashboard</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Overview of your organization's access management
        </p>
      </div>

      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Tools */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Tools</h3>
            </div>
            {loading ? (
              <div className="h-9 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-black dark:text-white">{stats.totalTools}</p>
            )}
            <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
              <Link href="/tools" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                View all →
              </Link>
            </RoleGuard>
          </div>

          {/* Active Users */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Active Users</h3>
            </div>
            {loading ? (
              <div className="h-9 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-black dark:text-white">{stats.activeUsers}</p>
            )}
          </div>

          {/* Pending Requests */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Pending Requests</h3>
            </div>
            {loading ? (
              <div className="h-9 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
            ) : (
              <p className="text-3xl font-bold text-black dark:text-white">{stats.pendingRequests}</p>
            )}
            <Link href="/access-requests" className="text-xs text-amber-600 dark:text-amber-400 hover:underline mt-2 inline-block">
              Review →
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black dark:text-white">Recent Activity</h2>
              <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
                <Link href="/audit-logs" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white">
                  View all →
                </Link>
              </RoleGuard>
            </div>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {loading ? (
              // Loading skeleton
              [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-3/4" />
                    <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))
            ) : recentActivity.length > 0 ? (
              // Display actual activity
              recentActivity.map((log) => (
                <div key={log.id} className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <Activity className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-black dark:text-white">{log.action}</p>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {log.actor_email} • {log.target} • {new Date(log.created_at).toRelativeTimeString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              // Empty state
              <div className="p-8 text-center">
                <Activity className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm text-neutral-600 dark:text-neutral-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
