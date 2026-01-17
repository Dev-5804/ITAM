'use client'

import { useOrganization } from '@/lib/context/organization-context'
import type { UserRole } from '@/lib/types/database'

export function useRole() {
  const { currentRole } = useOrganization()
  return currentRole
}

export function useIsRole(role: UserRole | UserRole[]) {
  const currentRole = useRole()
  if (!currentRole) return false
  
  if (Array.isArray(role)) {
    return role.includes(currentRole)
  }
  return currentRole === role
}

export function useIsOwner() {
  return useIsRole('OWNER')
}

export function useIsAdminOrOwner() {
  return useIsRole(['ADMIN', 'OWNER'])
}

export function useIsMember() {
  return useIsRole('MEMBER')
}
