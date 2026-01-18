'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@/lib/context/organization-context'
import { useRouter } from 'next/navigation'
import { RoleGuard } from '@/components/role-guard'
import type { Tool } from '@/lib/types/database'
import { Search, Filter, Plus, Wrench, Archive, ChevronRight, Shield, Building2 } from 'lucide-react'

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
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-black">
        <p className="text-black dark:text-white font-black text-xl">Please select an organization</p>
      </div>
    )
  }

  const getStatusStyles = (status: string) => {
    if (status === 'ACTIVE') {
      return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-500'
    }
    return 'bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white border-neutral-300 dark:border-neutral-700'
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Tools</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Manage tools in {currentOrganization.name}
          </p>
        </div>
        <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
          <button
            onClick={() => router.push('/tools/create')}
            className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Add Tool
          </button>
        </RoleGuard>
      </div>

      {/* Search and Filter */}
      {!loading && tools.length > 0 && (
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm text-black dark:text-white focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-neutral-200 dark:border-neutral-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-4">Loading tools...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && tools.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <Wrench className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">No tools yet</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Get started by creating your first tool.
          </p>
          <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
            <button
              onClick={() => router.push('/tools/create')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              Add Tool
            </button>
          </RoleGuard>
        </div>
      )}

      {/* No Results from Filter */}
      {!loading && tools.length > 0 && filteredTools.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <Search className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">No results found</h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            No tools match your search criteria.
          </p>
          <button
            onClick={() => {
              setSearchQuery('')
              setCategoryFilter('all')
            }}
            className="px-4 py-2 bg-neutral-100 dark:bg-neutral-800 text-black dark:text-white rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Tools Table */}
      {!loading && filteredTools.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Tool Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Active Accesses
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredTools.map((tool) => (
                <tr key={tool.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Wrench className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-black dark:text-white">{tool.name}</p>
                        {tool.description && (
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-1">
                            {tool.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {tool.category ? (
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {tool.category}
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      tool.status === 'ACTIVE'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}>
                      {tool.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-neutral-900 dark:text-neutral-100">0</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/tools/${tool.id}`)}
                        className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                        title="View details"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <RoleGuard allowedRoles={['OWNER', 'ADMIN']}>
                        <button
                          onClick={() => handleArchive(tool.id)}
                          className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Archive tool"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </RoleGuard>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
