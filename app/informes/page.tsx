"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, TrendingDown, Package, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { InstitutionSwitcher } from "@/components/institutions/institution-switcher"
import { useInstitution } from "@/components/institutions/institution-provider"
import { usePermissions } from "@/hooks/use-permissions"
import { getDateRange, loadConsumptionData, loadInventoryData } from "@/lib/informes/queries"
import type { DateRangeType, ConsumptionResult, InventoryResult } from "@/lib/informes/types"
import { ReportFilters } from "@/components/informes/report-filters"
import { ConsumptionTab } from "@/components/informes/consumption-tab"
import { InventoryTab } from "@/components/informes/inventory-tab"
import { ExportButton } from "@/components/informes/export-button"

export default function Informes() {
  const permissions = usePermissions()
  const { toast } = useToast()
  const { selectedInstitutionId } = useInstitution()

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"consumo" | "inventario">("consumo")
  const [dateRange, setDateRange] = useState<DateRangeType>("this_month")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [consumptionResult, setConsumptionResult] = useState<ConsumptionResult | null>(null)
  const [inventoryResult, setInventoryResult] = useState<InventoryResult | null>(null)

  const currentRange = getDateRange(dateRange, startDate, endDate)

  const loadAllData = useCallback(async () => {
    if (!selectedInstitutionId) {
      setConsumptionResult(null)
      setInventoryResult(null)
      return
    }
    setLoading(true)
    try {
      const range = getDateRange(dateRange, startDate, endDate)
      const [consumption, inventory] = await Promise.all([
        loadConsumptionData(selectedInstitutionId, range),
        loadInventoryData(selectedInstitutionId),
      ])
      setConsumptionResult(consumption)
      setInventoryResult(inventory)
    } catch (error) {
      console.error("Error loading report data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del reporte",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [dateRange, startDate, endDate, selectedInstitutionId, toast])

  useEffect(() => {
    if (permissions.canViewReports) {
      loadAllData()
    }
  }, [permissions.canViewReports, loadAllData])

  if (!permissions.canViewReports) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 p-4">
          <div className="max-w-4xl mx-auto pt-8">
            <Link href="/">
              <Button variant="outline" size="sm" className="mb-6">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <Card>
              <CardContent className="pt-8 pb-8 text-center">
                <AlertTriangle className="h-10 w-10 mx-auto text-amber-500 mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-1">Acceso Restringido</h2>
                <p className="text-sm text-muted-foreground">
                  Los informes están disponibles para administradores y gerentes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole={["administrador", "gerente"]}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Informes</h1>
                <p className="text-sm text-muted-foreground">
                  Reportes de consumo e inventario
                </p>
              </div>
            </div>
            <InstitutionSwitcher />
          </div>

          {/* Filters */}
          <div className="mb-6">
            <ReportFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onGenerate={loadAllData}
              loading={loading}
              rangeLabel={currentRange.label}
              exportButton={
                <ExportButton
                  activeTab={activeTab}
                  consumptionData={consumptionResult?.consumedProducts}
                  inventoryData={inventoryResult?.withStock}
                />
              }
            />
          </div>

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "consumo" | "inventario")}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-2 h-11">
              <TabsTrigger value="consumo" className="gap-2 text-sm">
                <TrendingDown className="h-4 w-4" />
                Reporte de Consumo
              </TabsTrigger>
              <TabsTrigger value="inventario" className="gap-2 text-sm">
                <Package className="h-4 w-4" />
                Reporte de Inventario
              </TabsTrigger>
            </TabsList>

            <TabsContent value="consumo">
              <ConsumptionTab data={consumptionResult} loading={loading} />
            </TabsContent>

            <TabsContent value="inventario">
              <InventoryTab data={inventoryResult} loading={loading} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
}
