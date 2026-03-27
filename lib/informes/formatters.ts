// Funciones de formateo y exportación para el módulo de informes

/** Formatear moneda colombiana (COP) */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/** Formatear números con separador de miles colombiano */
export const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('es-CO').format(number)
}

/** Generar CSV a partir de datos y columnas */
export function generateCSV(
  data: Record<string, unknown>[],
  columns: { key: string; header: string }[]
): string {
  const header = columns.map(c => c.header).join(",")
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key]
      if (val === null || val === undefined) return ""
      const str = String(val)
      // Escapar comillas y valores con comas
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(",")
  )
  return [header, ...rows].join("\n")
}

/** Descargar CSV como archivo */
export function downloadCSV(csv: string, filename: string): void {
  // BOM para que Excel reconozca UTF-8
  const bom = "\uFEFF"
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
