'use client'

import { useState } from 'react'
import { useOrganization } from '@/lib/context/organization-context'
import { useRouter } from 'next/navigation'

export default function CreateToolPage() {
  const { currentOrganization } = useOrganization()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    description: '',
    category: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentOrganization) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/organizations/${currentOrganization.id}/tools`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create tool')
      }

      router.push('/tools')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (!currentOrganization) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-neutral-600 dark:text-neutral-400">Please select an organization</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Add New Tool</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Create a new tool for {currentOrganization.name}
        </p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black dark:text-white mb-2">
                Tool Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                placeholder="e.g., GitHub, Slack, AWS Console"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-black dark:text-white mb-2">
                URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                id="url"
                required
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                placeholder="https://example.com"
              />
              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                The web address where the tool can be accessed
              </p>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-black dark:text-white mb-2">
                Category
              </label>
              <input
                type="text"
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600"
                placeholder="e.g., Development, Communication, Cloud"
              />
              <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                Optional: categorize the tool for easier filtering
              </p>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-black dark:text-white mb-2">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-600 resize-none"
                placeholder="Describe what this tool is used for..."
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                Access Levels
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                Three access levels will be created automatically:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• <strong>READ</strong> - Read-only access</li>
                <li>• <strong>WRITE</strong> - Read and write access</li>
                <li>• <strong>ADMIN</strong> - Full administrative access</li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Important:</strong> Actual access must be granted manually in the external tool. This system only records approvals and revocations.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white rounded-lg font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Tool'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
