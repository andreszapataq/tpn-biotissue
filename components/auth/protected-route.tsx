"use client"

import type React from "react"
import { useAuth } from "./auth-provider"
import { usePermissions } from "@/hooks/use-permissions"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth()
  // Mismo rol efectivo (por institución activa) que usan los botones y acciones de cada página
  const { role } = usePermissions()

  // Sin loading - renderizar inmediatamente
  if (!user) {
    return null // AuthProvider manejará la redirección
  }

  // Verificar rol si es necesario
  if (requiredRole && (!role || !requiredRole.includes(role))) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive">Acceso Denegado</h2>
          <p className="text-muted-foreground">No tienes permisos para esta página</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
