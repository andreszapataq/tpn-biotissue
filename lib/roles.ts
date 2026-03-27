export const APP_ROLES = [
  "administrador",
  "soporte",
  "asistente",
  "gerente",
] as const

export type AppRole = (typeof APP_ROLES)[number]

export const PUBLIC_REGISTRATION_ROLES: AppRole[] = ["soporte", "asistente"]

export function normalizeAppRole(role?: string | null): AppRole {
  switch (role) {
    case "administrador":
    case "soporte":
    case "asistente":
    case "gerente":
      return role
    case "cirujano":
    case "enfermera":
    case "admin_institucional":
      return "soporte"
    case "financiero":
      return "gerente"
    default:
      return "asistente"
  }
}

export function canSelfRegisterRole(role?: string | null): boolean {
  return PUBLIC_REGISTRATION_ROLES.includes(normalizeAppRole(role))
}

export function hasGlobalVisibility(role?: string | null): boolean {
  const normalizedRole = normalizeAppRole(role)
  return normalizedRole === "administrador" || normalizedRole === "gerente"
}

export function getRoleLabel(role?: string | null): string {
  switch (normalizeAppRole(role)) {
    case "administrador":
      return "Administrador"
    case "soporte":
      return "Soporte"
    case "asistente":
      return "Asistente"
    case "gerente":
      return "Gerente"
    default:
      return "Asistente"
  }
}

export function getRoleBadgeClassName(role?: string | null): string {
  switch (normalizeAppRole(role)) {
    case "administrador":
      return "bg-blue-50 text-blue-700 border border-blue-200"
    case "soporte":
      return "bg-green-50 text-green-700 border border-green-200"
    case "asistente":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200"
    case "gerente":
      return "bg-slate-50 text-slate-700 border border-slate-200"
    default:
      return "bg-gray-50 text-gray-700 border border-gray-200"
  }
}
