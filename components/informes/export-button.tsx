"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { generateCSV, downloadCSV } from "@/lib/informes/formatters"
import { getCurrentDateInColombia } from "@/lib/utils"
import type { ConsumptionData, InventoryReport } from "@/lib/informes/types"

interface ExportButtonProps {
  activeTab: "consumo" | "inventario"
  consumptionData?: ConsumptionData[]
  inventoryData?: InventoryReport[]
}

const consumptionColumns = [
  { key: "product_name", header: "Producto" },
  { key: "product_code", header: "Código" },
  { key: "category", header: "Categoría" },
  { key: "total_consumed", header: "Cantidad" },
  { key: "unit_price", header: "Precio Unitario" },
  { key: "total_value", header: "Valor Total" },
  { key: "procedures_count", header: "Procedimientos" },
  { key: "patients_count", header: "Pacientes" },
]

const inventoryColumns = [
  { key: "product_name", header: "Producto" },
  { key: "product_code", header: "Código" },
  { key: "category", header: "Categoría" },
  { key: "current_stock", header: "Stock Actual" },
  { key: "minimum_stock", header: "Stock Mínimo" },
  { key: "unit_price", header: "Precio Unitario" },
  { key: "stock_value", header: "Valor Stock" },
  { key: "status", header: "Estado" },
]

export function ExportButton({ activeTab, consumptionData, inventoryData }: ExportButtonProps) {
  const handleExport = () => {
    const date = getCurrentDateInColombia()

    if (activeTab === "consumo" && consumptionData?.length) {
      const csv = generateCSV(
        consumptionData as unknown as Record<string, unknown>[],
        consumptionColumns
      )
      downloadCSV(csv, `reporte-consumo-${date}.csv`)
    } else if (activeTab === "inventario" && inventoryData?.length) {
      const statusLabels: Record<string, string> = {
        normal: "Normal",
        low_stock: "Stock Bajo",
        out_of_stock: "Agotado",
      }
      const mapped = inventoryData.map(item => ({
        ...item,
        status: statusLabels[item.status] || item.status,
      }))
      const csv = generateCSV(
        mapped as unknown as Record<string, unknown>[],
        inventoryColumns
      )
      downloadCSV(csv, `reporte-inventario-${date}.csv`)
    }
  }

  const hasData = activeTab === "consumo"
    ? (consumptionData?.length || 0) > 0
    : (inventoryData?.length || 0) > 0

  return (
    <Button
      variant="outline"
      onClick={handleExport}
      disabled={!hasData}
      title="Exportar a CSV"
    >
      <Download className="h-4 w-4 mr-2" />
      CSV
    </Button>
  )
}
