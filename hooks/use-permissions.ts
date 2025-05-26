import { useAuth } from "@/components/auth/auth-provider"

export interface UserPermissions {
  canEditMachines: boolean
  canDeleteMachines: boolean
  canEditInventory: boolean
  canAdjustStock: boolean
  canViewAll: boolean
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth()

  if (!user) {
    return {
      canEditMachines: false,
      canDeleteMachines: false,
      canEditInventory: false,
      canAdjustStock: false,
      canViewAll: false,
    }
  }

  // Solo administradores tienen permisos completos
  const isAdmin = user.role === "administrador"

  return {
    canEditMachines: isAdmin,
    canDeleteMachines: isAdmin,
    canEditInventory: isAdmin,
    canAdjustStock: isAdmin,
    canViewAll: true, // Todos pueden ver la información
  }
} 