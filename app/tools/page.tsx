'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@/lib/context/organization-context'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/role-guard'
import type { Tool } from '@/lib/types/database'

export default function ToolsPage() {
  const { currentOrganization } = useOrganization()
  const router = useRouter()
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    if (currentOrganization) {
      fetchTools()
    }
  }, [currentOrganization])

  const fetchTools = async () => {
    if (!currentOrganization) return

    try {
      setLoading(true)
      const response = await fetch(
        `/api/organizations/${currentOrganization.id}/tools`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch tools')
      }

      setTools(data.tools || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async (toolId: string) => {
    if (!currentOrganization) return
    if (!confirm('Are you sure you want to archive this tool?')) return

    try {
      const response = await fetch(
        `/api/organizations/${currentOrganization.id}/tools/${toolId}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to archive tool')
      }

      // Refresh the list
      fetchTools()
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Filter tools based on search and category
  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      searchQuery === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory =
      categoryFilter === 'all' || tool.category === categoryFilter

    return matchesSearch && matchesCategory
  })

  // Get unique categories
  const categories = Array.from(new Set(tools.map((t) => t.category).filter(Boolean)))

  if (!currentOrganization) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-600">Please select an organization</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tools</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage tools in {currentOrganization.name}
            </p>
          </div>
          <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
            <button
              onClick={() => router.push('/tools/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              + Add Tool
            </button>
          </RoleGuard>
        </div>

        {/* Search and Filter */}
        {!loading && tools.length > 0 && (
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search tools by name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="sm:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading tools...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && tools.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tools</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new tool.
            </p>
            <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/tools/create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  + Add Tool
                </button>
              </div>
            </RoleGuard>
          </div>
        )}

        {/* No Results from Filter */}
        {!loading && tools.length > 0 && filteredTools.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600">No tools match your search criteria.</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setCategoryFilter('all')
              }}
              className="mt-4 text-blue-600 hover:text-blue-500 font-medium"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* Tools Grid */}
        {!loading && filteredTools.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => (
              <div
                key={tool.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tool.name}
                      </h3>
                      {tool.category && (
                        <span className="inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {tool.category}
                        </span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tool.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tool.status}
                    </span>
                  </div>

                  {tool.description && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                      {tool.description}
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between">
                    <button
                      onClick={() => router.push(`/tools/${tool.id}`)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-500"
                    >
                      View Details →
                    </button>
                    <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
                      <button
                        onClick={() => handleArchive(tool.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-500"
                      >
                        Archive
                      </button>
                    </RoleGuard>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
