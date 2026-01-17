'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Membership, Organization, UserRole } from '@/lib/types/database'

interface OrganizationContextType {
  currentOrganization: Organization | null
  memberships: Membership[]
  currentRole: UserRole | null
  loading: boolean
  switchOrganization: (orgId: string) => void
  refreshMemberships: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const loadMemberships = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('memberships')
        .select('*, organization:organizations(*)')
        .eq('user_id', user.id)
        .is('deleted_at', null)

      if (error) throw error

      setMemberships(data || [])

      // Set current organization from localStorage or first membership
      const savedOrgId = localStorage.getItem('currentOrganizationId')
      const currentMembership = data?.find((m) => m.organization_id === savedOrgId) || data?.[0]

      if (currentMembership) {
        setCurrentOrganization(currentMembership.organization as Organization)
        setCurrentRole(currentMembership.role)
        localStorage.setItem('currentOrganizationId', currentMembership.organization_id)
      }
    } catch (error) {
      console.error('Error loading memberships:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMemberships()
  }, [])

  const switchOrganization = (orgId: string) => {
    const membership = memberships.find((m) => m.organization_id === orgId)
    if (membership) {
      setCurrentOrganization(membership.organization as Organization)
      setCurrentRole(membership.role)
      localStorage.setItem('currentOrganizationId', orgId)
    }
  }

  const refreshMemberships = async () => {
    await loadMemberships()
  }

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        memberships,
        currentRole,
        loading,
        switchOrganization,
        refreshMemberships,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
