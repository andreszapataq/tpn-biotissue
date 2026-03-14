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
      return "bg-purple-100 text-purple-800"
    case "soporte":
      return "bg-green-100 text-green-800"
    case "asistente":
      return "bg-emerald-100 text-emerald-800"
    case "gerente":
      return "bg-slate-100 text-slate-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}
