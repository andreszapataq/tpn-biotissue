import { useAuth } from "@/components/auth/auth-provider"
import { useInstitution } from "@/components/institutions/institution-provider"
import { normalizeAppRole, type AppRole } from "@/lib/roles"

export interface UserPermissions {
  /** Rol efectivo: el de la institución activa, o el rol global si no hay membresía. */
  role: AppRole | null
  canManageAdministration: boolean
  canEditMachines: boolean
  canDeleteMachines: boolean
  canEditPatients: boolean
  canEditInventory: boolean
  canAdjustStock: boolean
  canViewInventoryValue: boolean
  canAddProcedureSupplies: boolean
  canViewReports: boolean
  canViewGlobalDashboard: boolean
  canViewAll: boolean
  isAdmin: boolean
}

const NO_PERMISSIONS: UserPermissions = {
  role: null,
  canManageAdministration: false,
  canEditMachines: false,
  canDeleteMachines: false,
  canEditPatients: false,
  canEditInventory: false,
  canAdjustStock: false,
  canViewInventoryValue: false,
  canAddProcedureSupplies: false,
  canViewReports: false,
  canViewGlobalDashboard: false,
  canViewAll: false,
  isAdmin: false,
}

/**
 * Alcance de cada rol:
 * - administrador: todo, incluida la administración de usuarios e instituciones.
 * - asistente: todo excepto la administración de usuarios e instituciones.
 * - soporte: operación diaria (procedimientos, insumos, máquinas, pacientes) sin inventario ni informes.
 * - gerente: solo consulta de la Vista Global.
 */
export function usePermissions(): UserPermissions {
  const { user } = useAuth()
  const { selectedInstitutionId } = useInstitution()

  if (!user) {
    return NO_PERMISSIONS
  }

  // Use the role for the currently selected institution if available,
  // otherwise fall back to the user's global role
  const membership = selectedInstitutionId
    ? user.memberships.find((m) => m.institution_id === selectedInstitutionId)
    : null
  const role = normalizeAppRole(membership?.role || user.role)

  const isAdmin = role === "administrador"
  const isAssistant = role === "asistente"
  const isSupport = role === "soporte"
  const isManager = role === "gerente"

  const isFullOperator = isAdmin || isAssistant
  const isOperator = isFullOperator || isSupport

  return {
    role,
    canManageAdministration: isAdmin,
    canEditMachines: isOperator,
    canDeleteMachines: isFullOperator,
    canEditPatients: isOperator,
    canEditInventory: isFullOperator,
    canAdjustStock: isFullOperator,
    canViewInventoryValue: isFullOperator,
    canAddProcedureSupplies: isOperator,
    canViewReports: isFullOperator,
    canViewGlobalDashboard: isFullOperator || isManager,
    canViewAll: true,
    isAdmin,
  }
}
