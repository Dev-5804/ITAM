'use client'

import { useIsAdminOrOwner, useIsOwner } from '@/lib/hooks/use-role'
import type { ReactNode } from 'react'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles?: ('OWNER' | 'ADMIN' | 'MEMBER')[]
  fallback?: ReactNode
}

export function RoleGuard({ children, allowedRoles = [], fallback = null }: RoleGuardProps) {
  const isOwner = useIsOwner()
  const isAdminOrOwner = useIsAdminOrOwner()

  const hasAccess = () => {
    if (allowedRoles.length === 0) return true
    
    if (allowedRoles.includes('OWNER') && isOwner) return true
    if (allowedRoles.includes('ADMIN') && isAdminOrOwner && !isOwner) return true
    if (allowedRoles.includes('MEMBER')) return true
    
    return false
  }

  if (!hasAccess()) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
