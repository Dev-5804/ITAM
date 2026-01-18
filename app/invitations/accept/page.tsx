'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, CheckCircle2, XCircle, Loader2, ArrowRight, Sparkles } from 'lucide-react'

export default function AcceptInvitationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [organizationName, setOrganizationName] = useState<string>('')

  const handleAccept = async () => {
    if (!token) {
      setError('Invalid invitation link')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      setSuccess(true)
      setOrganizationName(data.organization?.name || 'the organization')

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-3">
            Invalid Invitation
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            This invitation link is invalid or incomplete.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-black dark:text-white mb-3">
            Welcome Aboard!
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 mb-2">
            You have successfully joined <span className="font-semibold text-black dark:text-white">{organizationName}</span>.
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to dashboard...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          {/* Header */}
          <div className="bg-amber-500 p-8 text-center">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-black">
              Organization Invitation
            </h2>
          </div>

          {/* Content */}
          <div className="p-8">
            <p className="text-neutral-700 dark:text-neutral-300 text-center mb-6">
              You've been invited to join an organization. Accept to become a member and start collaborating.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Accept Invitation
                  </>
                )}
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Decline
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
                By accepting, you agree to collaborate within the organization and follow its access policies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
