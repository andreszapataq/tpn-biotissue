import { useAuth } from "@/components/auth/auth-provider"
import { useInstitution } from "@/components/institutions/institution-provider"

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
  const { selectedInstitutionId } = useInstitution()

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

  // Use the role for the currently selected institution if available,
  // otherwise fall back to the user's global role
  const membership = selectedInstitutionId
    ? user.memberships.find((m) => m.institution_id === selectedInstitutionId)
    : null
  const effectiveRole = membership?.role || user.role

  const isAdmin = effectiveRole === "administrador"
  const isManager = effectiveRole === "gerente"
  const isSupport = effectiveRole === "soporte"
  const isAssistant = effectiveRole === "asistente"

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
