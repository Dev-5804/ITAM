'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Users, Mail, Shield, Crown, User, Calendar, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Member {
  id: string
  user_id: string
  role: string
  created_at: string
  user: {
    id: string
    email: string
    full_name: string | null
  }
}

export default function OrganizationMembersPage() {
  const params = useParams()
  const router = useRouter()
  const organizationId = params.organizationId as string
  
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [organizationName, setOrganizationName] = useState<string>('')
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationDetails()
      fetchMembers()
    }
  }, [organizationId])

  const fetchOrganizationDetails = async () => {
    try {
      const response = await fetch(`/api/organizations/${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setOrganizationName(data.name || 'Organization')
      }
    } catch (err) {
      console.error('Error fetching organization:', err)
    }
  }

  const fetchMembers = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/organizations/${organizationId}/members`)
      const data = await response.json()

      if (response.status === 403) {
        setIsAuthorized(false)
        router.push('/dashboard')
        return
      }

      if (response.ok) {
        setMembers(data.memberships || [])
        setIsAuthorized(true)
      } else {
        setError(data.error || 'Failed to fetch members')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return {
          icon: Crown,
          color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
          label: 'Owner',
        }
      case 'ADMIN':
        return {
          icon: Shield,
          color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          label: 'Admin',
        }
      default:
        return {
          icon: User,
          color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
          label: 'Member',
        }
    }
  }

  const groupMembersByRole = () => {
    const owners = members.filter((m) => m.role === 'OWNER')
    const admins = members.filter((m) => m.role === 'ADMIN')
    const regularMembers = members.filter((m) => m.role === 'MEMBER')
    return { owners, admins, regularMembers }
  }

  const { owners, admins, regularMembers } = groupMembersByRole()

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-neutral-400 mx-auto mb-4" />
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading members...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <div className="bg-white dark:bg-black border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-black dark:text-white mb-2">
                Organization Members
              </h1>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {organizationName} • {members.length} {members.length === 1 ? 'member' : 'members'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {members.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-12 text-center">
            <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
              No Members Yet
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Start by inviting members to your organization
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Owners */}
            {owners.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                  Owners ({owners.length})
                </h2>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-200 dark:divide-neutral-800">
                  {owners.map((member) => {
                    const badge = getRoleBadge(member.role)
                    const Icon = badge.icon
                    return (
                      <div key={member.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-black dark:text-white truncate">
                                  {member.user?.full_name || 'Unknown User'}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                                  <Icon className="w-3 h-3" />
                                  {badge.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-4 h-4" />
                                  <span className="truncate">{member.user?.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
                                  <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Admins */}
            {admins.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                  Admins ({admins.length})
                </h2>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-200 dark:divide-neutral-800">
                  {admins.map((member) => {
                    const badge = getRoleBadge(member.role)
                    const Icon = badge.icon
                    return (
                      <div key={member.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-black dark:text-white truncate">
                                  {member.user?.full_name || 'Unknown User'}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                                  <Icon className="w-3 h-3" />
                                  {badge.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-4 h-4" />
                                  <span className="truncate">{member.user?.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
                                  <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Regular Members */}
            {regularMembers.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                  Members ({regularMembers.length})
                </h2>
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg divide-y divide-neutral-200 dark:divide-neutral-800">
                  {regularMembers.map((member) => {
                    const badge = getRoleBadge(member.role)
                    const Icon = badge.icon
                    return (
                      <div key={member.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-black dark:text-white truncate">
                                  {member.user?.full_name || 'Unknown User'}
                                </h3>
                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
                                  <Icon className="w-3 h-3" />
                                  {badge.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-4 h-4" />
                                  <span className="truncate">{member.user?.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4" />
                                  <span>Joined {new Date(member.created_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
