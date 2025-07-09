import { useAuth } from "@/components/auth/auth-provider"

export interface UserPermissions {
  canEditMachines: boolean
  canDeleteMachines: boolean
  canEditInventory: boolean
  canAdjustStock: boolean
  canAddProcedureSupplies: boolean // Nuevo permiso específico
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
      canViewAll: false,
      isAdmin: false,
    }
  }

  // Solo administradores tienen permisos completos
  const isAdmin = user.role === "administrador"
  const isSurgeon = user.role === "cirujano"
  const isSupport = user.role === "soporte"

  return {
    canEditMachines: isAdmin,
    canDeleteMachines: isAdmin,
    canEditInventory: isAdmin,
    canAdjustStock: isAdmin,
    canAddProcedureSupplies: isAdmin || isSurgeon || isSupport, // Cirujanos y soporte pueden agregar insumos a procedimientos
    canViewAll: true, // Todos pueden ver la información
    isAdmin: isAdmin,
  }
} 