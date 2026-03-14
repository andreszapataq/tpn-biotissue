import { useAuth } from "@/components/auth/auth-provider"

export interface UserPermissions {
  canManageAdministration: boolean
  canEditMachines: boolean
  canDeleteMachines: boolean
  canEditInventory: boolean
  canAdjustStock: boolean
  canAddProcedureSupplies: boolean
  canViewReports: boolean
  canViewGlobalDashboard: boolean
  canViewAll: boolean
  isAdmin: boolean
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth()

  if (!user) {
    return {
      canManageAdministration: false,
      canEditMachines: false,
      canDeleteMachines: false,
      canEditInventory: false,
      canAdjustStock: false,
      canAddProcedureSupplies: false,
      canViewReports: false,
      canViewGlobalDashboard: false,
      canViewAll: false,
      isAdmin: false,
    }
  }

  const isAdmin = user.role === "administrador"
  const isManager = user.role === "gerente"
  const isSupport = user.role === "soporte"
  const isAssistant = user.role === "asistente"

  return {
    canManageAdministration: isAdmin,
    canEditMachines: isAdmin || isSupport,
    canDeleteMachines: isAdmin,
    canEditInventory: isAdmin,
    canAdjustStock: isAdmin,
    canAddProcedureSupplies: isAdmin || isSupport || isAssistant,
    canViewReports: isAdmin,
    canViewGlobalDashboard: isAdmin || isManager,
    canViewAll: true,
    isAdmin,
  }
} 