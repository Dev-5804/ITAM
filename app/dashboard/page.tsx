'use client'

import { useOrganization } from '@/lib/context/organization-context'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/role-guard'

export default function DashboardPage() {
  const { currentOrganization, memberships, currentRole, loading, switchOrganization } =
    useOrganization()
  const router = useRouter()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!currentOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Organization</h2>
          <p className="text-gray-600 mb-6">
            You need to create or join an organization to access the dashboard.
          </p>
          <button
            onClick={() => router.push('/organizations/create')}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Create Organization
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="mt-2 text-sm text-gray-600">
                Welcome to the Internal Tool Access Manager
              </p>
            </div>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* Organization Selector */}
        {memberships.length > 1 && (
          <div className="mb-6 bg-white shadow rounded-lg p-4">
            <label htmlFor="org-select" className="block text-sm font-medium text-gray-700 mb-2">
              Current Organization
            </label>
            <select
              id="org-select"
              value={currentOrganization.id}
              onChange={(e) => switchOrganization(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {memberships.map((membership) => (
                <option key={membership.organization_id} value={membership.organization_id}>
                  {(membership.organization as any)?.name} ({membership.role})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Organization Info */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Organization</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{currentOrganization.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Slug</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{currentOrganization.slug}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Your Role</dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {currentRole}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/tools')}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">View Tools</div>
                <div className="text-sm text-gray-500">Browse available tools</div>
              </button>

              <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
                <button
                  onClick={() => router.push('/settings')}
                  className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">Manage Team</div>
                  <div className="text-sm text-gray-500">Invite and manage members</div>
                </button>
              </RoleGuard>

              <button
                onClick={() => router.push('/access-requests')}
                className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-900">Access Requests</div>
                <div className="text-sm text-gray-500">View and manage requests</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
