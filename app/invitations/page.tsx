'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, CheckCircle, XCircle, Clock, Building2, User, Calendar, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface Invitation {
  id: string
  email: string
  role: string
  token: string
  expires_at: string
  created_at: string
  organization: {
    id: string
    name: string
  }
  inviter: {
    id: string
    email: string
    full_name: string | null
  }
}

export default function InvitationsPage() {
  const router = useRouter()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchInvitations()
  }, [])

  const fetchInvitations = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/invitations')
      const data = await response.json()

      if (response.ok) {
        setInvitations(data.invitations || [])
      } else {
        setError(data.error || 'Failed to fetch invitations')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (token: string, invitationId: string) => {
    try {
      setProcessingId(invitationId)
      setError(null)

      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      const data = await response.json()

      if (!response.ok) {
        // If already a member, automatically decline the invitation
        if (data.error?.includes('already a member')) {
          await handleDecline(invitationId)
          setError('You are already a member of this organization. Invitation removed.')
          return
        }
        throw new Error(data.error || 'Failed to accept invitation')
      }

      // Refresh invitations list
      await fetchInvitations()
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async (invitationId: string) => {
    try {
      setProcessingId(invitationId)
      setError(null)

      const response = await fetch('/api/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to decline invitation')
      }

      // Remove from local state
      setInvitations(invitations.filter((inv) => inv.id !== invitationId))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setProcessingId(null)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const isExpiringSoon = (expiresAt: string) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiry <= 2
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white mb-2">
                My Invitations
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Organizations invitations waiting for your response
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-medium hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 animate-pulse"
              >
                <div className="h-6 bg-neutral-200 dark:bg-neutral-800 rounded w-1/3 mb-4" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
              No Pending Invitations
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              You don't have any organization invitations at the moment
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {invitations.map((invitation) => {
              const expiringSoon = isExpiringSoon(invitation.expires_at)
              const daysUntilExpiry = Math.ceil(
                (new Date(invitation.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              )

              return (
                <div
                  key={invitation.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden"
                >
                  {/* Warning Banner for Expiring Soon */}
                  {expiringSoon && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-6 py-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                        Expires in {daysUntilExpiry} {daysUntilExpiry === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                            {invitation.organization.name}
                          </h3>
                          <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>
                                Invited by{' '}
                                <span className="font-medium text-black dark:text-white">
                                  {invitation.inviter.full_name || invitation.inviter.email}
                                </span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${getRoleBadgeColor(invitation.role)}`}>
                                {invitation.role}
                              </span>
                              <span>role</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                Sent {new Date(invitation.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <button
                        onClick={() => handleAccept(invitation.token, invitation.id)}
                        disabled={processingId === invitation.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingId === invitation.id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Accept Invitation
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDecline(invitation.id)}
                        disabled={processingId === invitation.id}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 rounded-lg text-sm font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-5 h-5" />
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
