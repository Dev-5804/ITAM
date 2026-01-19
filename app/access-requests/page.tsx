'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@/lib/context/organization-context'
import { useIsAdminOrOwner } from '@/lib/hooks/use-role'
import { FileText, Clock, CheckCircle, XCircle, User, Wrench, Calendar, Loader2 } from 'lucide-react'

interface AccessRequest {
  id: string
  tool_id: string
  user_id: string
  access_level: string
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED'
  created_at: string
  reviewed_at: string | null
  tool: {
    id: string
    name: string
  }
  user: {
    id: string
    email: string
    full_name: string | null
  }
  reviewer: {
    id: string
    email: string
    full_name: string | null
  } | null
}

export default function AccessRequestsPage() {
  const { currentOrganization } = useOrganization()
  const isAdminOrOwner = useIsAdminOrOwner()
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    if (currentOrganization) {
      fetchRequests()
    }
  }, [currentOrganization])

  const fetchRequests = async () => {
    if (!currentOrganization) return

    try {
      setLoading(true)
      const response = await fetch(`/api/organizations/${currentOrganization.id}/access-requests`)
      const data = await response.json()

      if (response.ok) {
        setRequests(data.requests || [])
      } else {
        console.error('Failed to fetch requests:', data.error)
      }
    } catch (error) {
      console.error('Error fetching requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    if (!currentOrganization) return

    try {
      setProcessingId(requestId)
      const response = await fetch(
        `/api/organizations/${currentOrganization.id}/access-requests/${requestId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      )

      if (response.ok) {
        await fetchRequests()
      } else {
        const data = await response.json()
        console.error('Failed to update request:', data.error)
      }
    } catch (error) {
      console.error('Error updating request:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      default:
        return <FileText className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const classes = {
      PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      REVOKED: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    }
    return classes[status as keyof typeof classes] || classes.PENDING
  }

  const filteredRequests = requests.filter((req) => {
    if (filter === 'all') return true
    return req.status.toLowerCase() === filter
  })

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  if (!currentOrganization) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <p className="text-neutral-600 dark:text-neutral-400">No organization selected</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Access Requests</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {isAdminOrOwner
                ? 'Review and manage tool access requests from team members'
                : 'View your tool access requests'}
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {pendingCount} Pending
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            All ({requests.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'pending'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            Approved ({requests.filter((r) => r.status === 'APPROVED').length})
          </button>
          <button
            onClick={() => setFilter('rejected')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'rejected'
                ? 'bg-black dark:bg-white text-white dark:text-black'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800'
            }`}
          >
            Rejected ({requests.filter((r) => r.status === 'REJECTED').length})
          </button>
        </div>
      </div>

      {/* Requests List */}
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
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
          <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
            No {filter !== 'all' ? filter : ''} requests
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {isAdminOrOwner
              ? 'Access requests will appear here when team members request tool access'
              : 'Your access requests will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    {getStatusIcon(request.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-black dark:text-white">
                        {request.tool.name}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${getStatusBadge(
                          request.status
                        )}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>
                          {request.user.full_name || request.user.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        <span className="font-medium text-black dark:text-white">
                          {request.access_level}
                        </span>
                        <span>access level</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {request.reason && (
                      <div className="mt-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">
                          <span className="font-semibold">Reason: </span>
                          {request.reason}
                        </p>
                      </div>
                    )}
                    {request.reviewer && (
                      <div className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                        Reviewed by {request.reviewer.full_name || request.reviewer.email} on{' '}
                        {request.reviewed_at && new Date(request.reviewed_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions for admins/owners */}
                {isAdminOrOwner && request.status === 'PENDING' && (
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleUpdateRequest(request.id, 'APPROVED')}
                      disabled={processingId === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => handleUpdateRequest(request.id, 'REJECTED')}
                      disabled={processingId === request.id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
