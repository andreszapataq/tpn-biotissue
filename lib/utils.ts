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
  return new Date(timestamp).toLocaleDateString("es-ES", {
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
 * Función para determinar el nombre de visualización de una máquina
 * basándose en el modelo y el lote. Agrega (C) para cassette o (P) para punta
 * a las máquinas de irrigación según los últimos 4 dígitos del lote.
 */
export function getMachineDisplayName(model: string, lote: string): string {
  // Solo aplicar a máquinas de irrigación
  if (!model.includes("Irrigation")) {
    return model
  }
  
  // Obtener los últimos 4 dígitos del lote
  const lastFourDigits = lote.slice(-4)
  
  // Definir los números para cada tipo
  const cassetteNumbers = ["0895", "0896", "0897"]
  const puntaNumbers = ["0903", "0910", "0911", "0914", "0916"]
  
  if (cassetteNumbers.includes(lastFourDigits)) {
    return `${model} (C)`
  } else if (puntaNumbers.includes(lastFourDigits)) {
    return `${model} (P)`
  }
  
  // Si no coincide con ningún patrón, mostrar solo el modelo
  return model
}
