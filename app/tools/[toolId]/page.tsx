'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@/lib/context/organization-context'
import { useRouter, useParams } from 'next/navigation'
import { RoleGuard } from '@/components/role-guard'
import type { Tool } from '@/lib/types/database'

export default function ToolDetailsPage() {
  const { currentOrganization } = useOrganization()
  const router = useRouter()
  const params = useParams()
  const toolId = params.toolId as string

  const [tool, setTool] = useState<Tool | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    status: 'ACTIVE',
  })

  useEffect(() => {
    if (currentOrganization && toolId) {
      fetchTool()
    }
  }, [currentOrganization, toolId])

  const fetchTool = async () => {
    if (!currentOrganization) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/organizations/${currentOrganization.id}/tools/${toolId}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tool')
      }

      setTool(data.tool)
      setFormData({
        name: data.tool.name,
        description: data.tool.description || '',
        category: data.tool.category || '',
        status: data.tool.status,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrganization) return

    try {
      const response = await fetch(
        `/api/organizations/${currentOrganization.id}/tools/${toolId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update tool')
      }

      setTool(data.tool)
      setEditing(false)
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading tool...</p>
        </div>
      </div>
    )
  }

  if (error || !tool) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error || 'Tool not found'}</p>
          <button
            onClick={() => router.push('/tools')}
            className="mt-4 text-blue-600 hover:text-blue-500"
          >
            ← Back to Tools
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/tools')}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            ← Back to Tools
          </button>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{tool.name}</h1>
              <span
                className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  tool.status === 'ACTIVE'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {tool.status}
              </span>
            </div>
            {!editing && (
              <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Edit Tool
                </button>
              </RoleGuard>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleUpdate} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tool Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false)
                    setFormData({
                      name: tool.name,
                      description: tool.description || '',
                      category: tool.category || '',
                      status: tool.status,
                    })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="p-6 space-y-6">
              {tool.category && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Category</h3>
                  <p className="mt-1 text-gray-900">{tool.category}</p>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="mt-1 text-gray-900">
                  {tool.description || 'No description provided'}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Access Levels
                </h3>
                <div className="space-y-2">
                  {tool.access_levels?.map((level: any) => (
                    <div
                      key={level.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900">
                          {level.level}
                        </span>
                        {level.description && (
                          <p className="text-sm text-gray-600">
                            {level.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Reminder:</strong> Access must be granted manually in
                  the external tool.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
