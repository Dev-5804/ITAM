'use client'

import { useOrganization } from '@/lib/context/organization-context'
import { useIsOwner, useIsAdminOrOwner, useRole } from '@/lib/hooks/use-role'
import { RoleGuard } from '@/components/role-guard'

export default function TestRolesPage() {
  const { currentOrganization, currentRole } = useOrganization()
  const isOwner = useIsOwner()
  const isAdminOrOwner = useIsAdminOrOwner()
  const role = useRole()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Role Testing Page</h1>

        {/* Test 1: Display Current Role */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Current Role Information</h2>
          <dl className="space-y-2">
            <div>
              <dt className="font-medium text-gray-500">Organization:</dt>
              <dd>{currentOrganization?.name || 'None'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Your Role:</dt>
              <dd className="font-mono">{role || 'None'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Is Owner:</dt>
              <dd>{isOwner ? '✅ Yes' : '❌ No'}</dd>
            </div>
            <div>
              <dt className="font-medium text-gray-500">Is Admin or Owner:</dt>
              <dd>{isAdminOrOwner ? '✅ Yes' : '❌ No'}</dd>
            </div>
          </dl>
        </div>

        {/* Test 2: Owner-Only Content */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Owner-Only Content</h2>
          <RoleGuard allowedRoles={['OWNER']}>
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              ✅ You can see this because you are an OWNER
            </div>
          </RoleGuard>
          <RoleGuard
            allowedRoles={['ADMIN']}
            fallback={
              <div className="p-4 bg-gray-50 border border-gray-200 rounded">
                ❌ This is hidden because you are not an ADMIN
              </div>
            }
          >
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              ✅ You can see this because you are an ADMIN
            </div>
          </RoleGuard>
        </div>

        {/* Test 3: Admin or Owner Content */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Admin/Owner Content</h2>
          <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded">
              ✅ You can see this because you are OWNER or ADMIN
            </div>
          </RoleGuard>
        </div>

        {/* Test 4: Hook-based Rendering */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Hook-based Rendering</h2>
          {isOwner && (
            <div className="p-4 bg-purple-50 border border-purple-200 rounded mb-2">
              ✅ useIsOwner() hook works
            </div>
          )}
          {isAdminOrOwner && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded">
              ✅ useIsAdminOrOwner() hook works
            </div>
          )}
          {!isAdminOrOwner && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              ❌ You are a regular member
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
