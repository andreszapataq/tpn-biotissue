import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para obtener la fecha actual en zona horaria de Colombia (UTC-5)
export function getCurrentDateInColombia(): string {
  const now = new Date()
  const colombiaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Bogota" }))
  return colombiaTime.toISOString().split("T")[0]
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
  const date = new Date(timestamp)
  return date.toLocaleDateString("es-ES", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
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
