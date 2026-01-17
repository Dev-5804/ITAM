'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrganization } from '@/lib/context/organization-context'

export default function TestRLSPage() {
  const { currentOrganization } = useOrganization()
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testRLS = async () => {
    setLoading(true)
    const tests = []

    try {
      // Test 1: Can view own organization
      const { data: ownOrg, error: ownOrgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', currentOrganization?.id)

      tests.push({
        name: 'View Own Organization',
        passed: !ownOrgError && ownOrg?.length > 0,
        data: ownOrg,
        error: ownOrgError,
      })

      // Test 2: Cannot view fake organization
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const { data: fakeOrg, error: fakeOrgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', fakeId)

      tests.push({
        name: 'Cannot View Fake Organization',
        passed: fakeOrg?.length === 0,
        data: fakeOrg,
        error: fakeOrgError,
      })

      // Test 3: Can view own memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('memberships')
        .select('*')
        .eq('organization_id', currentOrganization?.id)

      tests.push({
        name: 'View Own Memberships',
        passed: !membershipError && memberships?.length > 0,
        data: memberships,
        error: membershipError,
      })

      // Test 4: Can view subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', currentOrganization?.id)

      tests.push({
        name: 'View Organization Subscription',
        passed: !subError && subscription?.length > 0,
        data: subscription,
        error: subError,
      })

      setResults(tests)
    } catch (error) {
      console.error('Error testing RLS:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">RLS Policy Testing</h1>

        <div className="mb-6">
          <button
            onClick={testRLS}
            disabled={loading || !currentOrganization}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Run RLS Tests'}
          </button>
        </div>

        {results && (
          <div className="space-y-4">
            {results.map((test: any, index: number) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-2 ${
                  test.passed
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{test.name}</h3>
                  <span className="text-2xl">
                    {test.passed ? '✅' : '❌'}
                  </span>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-gray-600">
                    View Details
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify(
                      { data: test.data, error: test.error },
                      null,
                      2
                    )}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
