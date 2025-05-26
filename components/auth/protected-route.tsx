"use client"

import type React from "react"
import { useAuth } from "./auth-provider"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string[]
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user } = useAuth()

  // Sin loading - renderizar inmediatamente
  if (!user) {
    return null // AuthProvider manejará la redirección
  }

  // Verificar rol si es necesario
  if (requiredRole && !requiredRole.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos para esta página</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
