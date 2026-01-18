'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ArrowLeft, Sparkles, Zap } from 'lucide-react'

export default function CreateOrganizationPage() {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-black">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-2/5 bg-black p-12 flex-col justify-between relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 dots-pattern opacity-20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 left-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        </div>
        
        <div className="relative z-10 animate-slide-in-left">
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500 rounded-2xl blur-lg opacity-50 animate-pulse-glow"></div>
              <div className="relative p-4 bg-amber-500 rounded-2xl">
                <Building2 className="w-8 h-8 text-black" />
              </div>
            </div>
          </div>
          <h1 className="text-5xl font-black text-white mb-6 leading-tight">
            Create Your<br />Organization
          </h1>
          <p className="text-xl text-gray-400 max-w-md leading-relaxed">
            Set up your workspace to start managing tool access for your team.
          </p>
        </div>

        <div className="relative z-10 space-y-6 animate-slide-up" style={{animationDelay: '0.2s'}}>
          <div className="p-6 bg-neutral-900 rounded-2xl border border-neutral-800">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Quick Setup</h3>
                <p className="text-gray-400 text-sm">Get started in seconds</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              "ITAM has transformed how we manage internal tool access. The audit trail is invaluable for compliance."
            </p>
            <p className="text-gray-500 text-xs mt-3">— Platform Team Lead</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-neutral-50 dark:bg-neutral-950 relative">
        <div className="absolute inset-0 grid-pattern opacity-10"></div>
        
        <div className="w-full max-w-lg relative z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-black dark:text-white hover:text-amber-600 dark:hover:text-amber-400 mb-10 transition-colors font-bold animate-slide-up"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="bg-white dark:bg-neutral-900 rounded-3xl border-2 border-neutral-200 dark:border-neutral-800 p-10 animate-slide-up" style={{animationDelay: '0.1s'}}>
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur-md"></div>
                  <div className="relative p-3 bg-amber-500 rounded-xl">
                    <Sparkles className="w-6 h-6 text-black" />
                  </div>
                </div>
                <h2 className="text-3xl font-black text-black dark:text-white">New Organization</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Create your organization to start managing tool access
              </p>
            </div>

            {error && (
              <div className="mb-8 p-5 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-2xl animate-scale-in">
                <p className="font-black text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-black text-black dark:text-white mb-3 uppercase tracking-wider">
                  Organization Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full px-5 py-4 bg-neutral-50 dark:bg-black border-2 border-neutral-300 dark:border-neutral-800 rounded-2xl text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition-colors font-medium text-lg"
                  placeholder="Acme Inc"
                />
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                  The display name for your organization
                </p>
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-black text-black dark:text-white mb-3 uppercase tracking-wider">
                  Organization Slug
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="slug"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    pattern="[a-z0-9-]+"
                    className="w-full px-5 py-4 bg-neutral-50 dark:bg-black border-2 border-neutral-300 dark:border-neutral-800 rounded-2xl text-black dark:text-white placeholder:text-gray-400 focus:outline-none focus:border-amber-500 transition-colors font-mono font-bold text-lg"
                    placeholder="acme-inc"
                  />
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Used in URLs. Only lowercase letters, numbers, and hyphens allowed.
                </p>
              </div>

              <div className="pt-6 flex gap-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-8 py-4 border-2 border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black text-black dark:text-white rounded-2xl font-black text-lg hover:border-amber-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black text-lg hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 text-center animate-slide-up" style={{animationDelay: '0.2s'}}>
            <p className="text-gray-600 dark:text-gray-400">
              You will be assigned as the <span className="font-black text-amber-600 dark:text-amber-400">Owner</span> with full permissions
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
