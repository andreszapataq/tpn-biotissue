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

/**
 * Retorna el nombre de visualización de una máquina.
 * El subtipo (C)/(P) ya está incluido en el campo model desde la creación.
 */
export function getMachineDisplayName(model: string, _lote?: string): string {
  return model
}
