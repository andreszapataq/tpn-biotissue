import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para obtener la fecha actual en zona horaria de Colombia (UTC-5)
export function getCurrentDateInColombia(): string {
  const now = new Date()
  // Convertir a fecha de Colombia usando Intl.DateTimeFormat
  const colombiaDate = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
  
  return colombiaDate // Ya retorna en formato YYYY-MM-DD
}

// Función para formatear fechas considerando zona horaria de Colombia
export function formatDateForColombia(dateString: string): string {
  // Si la fecha viene como string YYYY-MM-DD, la tratamos como fecha local
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

// Función para formatear fechas con timestamp UTC a Colombia
export function formatTimestampForColombia(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("es-ES", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Función para formatear fechas con timestamp UTC a Colombia incluyendo hora
export function formatTimestampWithTimeForColombia(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString("es-ES", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

// Intervalo de mantenimiento de los equipos (cada 6 meses)
export const MAINTENANCE_INTERVAL_MONTHS = 6
// Umbral de "próximo a vencer": faltan 15 días o menos para cumplir el intervalo
export const MAINTENANCE_DUE_SOON_DAYS = 15

export type MaintenanceLevel = "overdue" | "due_soon" | "ok" | "unknown"

export interface MaintenanceStatus {
  level: MaintenanceLevel
  // Días que faltan para la fecha de vencimiento (negativo si ya venció)
  daysUntilDue: number | null
  // Fecha en la que se cumple el intervalo de mantenimiento (YYYY-MM-DD)
  nextDueDate: string | null
}

/**
 * Calcula el estado de mantenimiento de un equipo a partir de la fecha del
 * último mantenimiento. Los mantenimientos se realizan cada 6 meses:
 * - overdue: ya pasaron más de 6 meses (alarma roja)
 * - due_soon: faltan 15 días o menos para cumplir los 6 meses (alarma naranja)
 * - ok: dentro del periodo normal
 * - unknown: sin fecha de mantenimiento registrada
 */
export function getMaintenanceStatus(lastMaintenance: string | null): MaintenanceStatus {
  if (!lastMaintenance) {
    return { level: "unknown", daysUntilDue: null, nextDueDate: null }
  }

  // La fecha puede venir como YYYY-MM-DD o como timestamp; tomamos solo la fecha
  const dateOnly = lastMaintenance.split("T")[0]
  const last = new Date(dateOnly + "T00:00:00")
  if (Number.isNaN(last.getTime())) {
    return { level: "unknown", daysUntilDue: null, nextDueDate: null }
  }

  const due = new Date(last)
  due.setMonth(due.getMonth() + MAINTENANCE_INTERVAL_MONTHS)

  const today = new Date(getCurrentDateInColombia() + "T00:00:00")
  const msPerDay = 1000 * 60 * 60 * 24
  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / msPerDay)

  const nextDueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(
    due.getDate()
  ).padStart(2, "0")}`

  let level: MaintenanceLevel
  if (daysUntilDue < 0) {
    level = "overdue"
  } else if (daysUntilDue <= MAINTENANCE_DUE_SOON_DAYS) {
    level = "due_soon"
  } else {
    level = "ok"
  }

  return { level, daysUntilDue, nextDueDate }
}

/**
 * Retorna el nombre de visualización de una máquina.
 * El subtipo (C)/(P) ya está incluido en el campo model desde la creación.
 */
export function getMachineDisplayName(model: string, _lote?: string): string {
  return model
}
