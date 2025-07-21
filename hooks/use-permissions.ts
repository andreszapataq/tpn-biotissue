import { useAuth } from "@/components/auth/auth-provider"

export interface UserPermissions {
  canEditMachines: boolean
  canDeleteMachines: boolean
  canEditInventory: boolean
  canAdjustStock: boolean
  canAddProcedureSupplies: boolean // Nuevo permiso específico
  canViewReports: boolean // Nuevo permiso para acceso a informes
  canViewAll: boolean
  isAdmin: boolean
}

export function usePermissions(): UserPermissions {
  const { user } = useAuth()

  if (!user) {
    return {
      canEditMachines: false,
      canDeleteMachines: false,
      canEditInventory: false,
      canAdjustStock: false,
      canAddProcedureSupplies: false,
      canViewReports: false,
      canViewAll: false,
      isAdmin: false,
    }
  }

  // Definir roles
  const isAdmin = user.role === "administrador"
  const isSurgeon = user.role === "cirujano"
  const isSupport = user.role === "soporte"
  const isFinanciero = user.role === "financiero"

  return {
    canEditMachines: isAdmin,
    canDeleteMachines: isAdmin,
    canEditInventory: isAdmin,
    canAdjustStock: isAdmin,
    canAddProcedureSupplies: isAdmin || isSurgeon || isSupport, // Cirujanos y soporte pueden agregar insumos a procedimientos
    canViewReports: isAdmin || isFinanciero, // Administradores y financieros pueden ver informes
    canViewAll: true, // Todos pueden ver la información
    isAdmin: isAdmin,
  }
} 