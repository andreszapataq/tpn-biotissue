"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  ArrowLeft, 
  TrendingDown, 
  TrendingUp, 
  Package, 
  Activity,
  Calendar,
  DollarSign,
  FileText,
  Download,
  Users,
  AlertTriangle,
  Loader2
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { usePermissions } from "@/hooks/use-permissions"
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"
import { es } from "date-fns/locale"

// 🇨🇴 Función para formatear moneda colombiana
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// 🔢 Función para formatear números con separador de miles
const formatNumber = (number: number): string => {
  return new Intl.NumberFormat('es-CO').format(number)
}

interface ConsumptionData {
  product_id: string
  product_name: string
  product_code: string
  category: string
  total_consumed: number
  unit_price: number
  total_value: number
  procedures_count: number
  patients_count: number
}

interface InventoryReport {
  product_id: string
  product_name: string
  product_code: string
  category: string
  current_stock: number
  minimum_stock: number
  unit_price: number
  stock_value: number
  status: string
}

interface ProcedureSummary {
  total_procedures: number
  total_value: number
  avg_value_per_procedure: number
  most_used_product: {
    name: string
    quantity: number
  }
}

export default function Informes() {
  const permissions = usePermissions()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState("this_month")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  
  // Datos de consumo
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([])
  const [totalConsumptionValue, setTotalConsumptionValue] = useState(0)
  const [procedureSummary, setProcedureSummary] = useState<ProcedureSummary>({
    total_procedures: 0,
    total_value: 0,
    avg_value_per_procedure: 0,
    most_used_product: { name: "-", quantity: 0 }
  })
  
  // Datos de inventario
  const [inventoryData, setInventoryData] = useState<InventoryReport[]>([])
  const [totalInventoryValue, setTotalInventoryValue] = useState(0)
  const [lowStockValue, setLowStockValue] = useState(0)
  const [highestStockProduct, setHighestStockProduct] = useState<{name: string, quantity: number}>({name: "-", quantity: 0})

  // Calcular fechas según el rango seleccionado
  const getDateRange = () => {
    const now = new Date()
    
    switch (dateRange) {
      case "today":
        return {
          start: format(now, "yyyy-MM-dd"),
          end: format(now, "yyyy-MM-dd")
        }
      case "this_week":
        const weekStart = subDays(now, 7)
        return {
          start: format(weekStart, "yyyy-MM-dd"),
          end: format(now, "yyyy-MM-dd")
        }
      case "this_month":
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd")
        }
      case "this_year":
        return {
          start: format(startOfYear(now), "yyyy-MM-dd"),
          end: format(endOfYear(now), "yyyy-MM-dd")
        }
      case "custom":
        return {
          start: startDate || format(now, "yyyy-MM-dd"),
          end: endDate || format(now, "yyyy-MM-dd")
        }
      default:
        return {
          start: format(startOfMonth(now), "yyyy-MM-dd"),
          end: format(endOfMonth(now), "yyyy-MM-dd")
        }
    }
  }

  // Cargar datos de consumo
  const loadConsumptionData = async () => {
    try {
      const { start, end } = getDateRange()
      
      // 🔧 CORREGIDO: Primero contar TODOS los procedimientos del período
      const { data: allProcedures, error: procError } = await supabase
        .from("procedures")
        .select("id, patient_id")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)

      if (procError) throw procError

      const totalProceduresInPeriod = allProcedures?.length || 0
      console.log(`📊 Total procedimientos en período: ${totalProceduresInPeriod}`)
      
      // Obtener movimientos de salida (consumo) en el período
      const { data: movements, error: movError } = await supabase
        .from("inventory_movements")
        .select(`
          *,
          product:inventory_products(name, code, category, unit_price)
        `)
        .eq("movement_type", "out")
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`)

      if (movError) throw movError

      console.log(`📦 Total movimientos de salida: ${movements?.length || 0}`)

      // Agrupar por producto y calcular valores
      const productMap = new Map<string, ConsumptionData>()
      let totalValue = 0
      const procedureIds = new Set<string>()

      movements?.forEach(movement => {
        const product = movement.product
        if (!product || !movement.product_id) return

        const productId = movement.product_id
        // 🔧 CORREGIDO: Las cantidades negativas en movimientos "out" son correctas
        // Usar valor absoluto para mostrar consumo positivo
        const quantity = Math.abs(movement.quantity)
        const unitPrice = product.unit_price || 0
        const value = quantity * unitPrice

        console.log(`📦 Producto: ${product.name}, Cantidad: ${quantity}, Precio: ${unitPrice}, Valor: ${value}`)
        
        totalValue += value

        if (movement.reference_type === "procedure" && movement.reference_id) {
          procedureIds.add(movement.reference_id)
        }

        if (productMap.has(productId)) {
          const existing = productMap.get(productId)!
          existing.total_consumed += quantity
          existing.total_value += value
          if (movement.reference_type === "procedure") {
            // Contar movimientos, no procedimientos únicos aquí
            existing.procedures_count += 1
          }
        } else {
          productMap.set(productId, {
            product_id: productId,
            product_name: product.name,
            product_code: product.code,
            category: product.category,
            total_consumed: quantity,
            unit_price: unitPrice,
            total_value: value,
            procedures_count: movement.reference_type === "procedure" ? 1 : 0,
            patients_count: 0 // Se calculará después
          })
        }
      })

      console.log(`💰 Valor total calculado: ${totalValue}`)
      console.log(`🔢 Procedimientos únicos con movimientos: ${procedureIds.size}`)

      // Calcular pacientes únicos por producto
      for (const [productId, data] of productMap.entries()) {
        try {
          // Obtener procedimientos únicos relacionados con este producto
          const { data: movementsForProduct, error: movError } = await supabase
            .from("inventory_movements")
            .select("reference_id")
            .eq("product_id", productId)
            .eq("movement_type", "out")
            .eq("reference_type", "procedure")
            .gte("created_at", `${start}T00:00:00`)
            .lte("created_at", `${end}T23:59:59`)
            .not("reference_id", "is", null)

          if (!movError && movementsForProduct && movementsForProduct.length > 0) {
            const procedureIds = movementsForProduct
              .map(m => m.reference_id)
              .filter((id): id is string => id !== null && id !== undefined)
            
            // 🔧 CORREGIDO: Contar procedimientos únicos, no movimientos
            const uniqueProcedureIds = [...new Set(procedureIds)]
            data.procedures_count = uniqueProcedureIds.length
            
            if (uniqueProcedureIds.length > 0) {
              // Obtener pacientes únicos de estos procedimientos
              const { data: procedures, error: procError } = await supabase
                .from("procedures")
                .select("patient_id")
                .in("id", uniqueProcedureIds)

              if (!procError && procedures) {
                const uniquePatients = new Set()
                procedures.forEach(p => {
                  if (p.patient_id) {
                    uniquePatients.add(p.patient_id)
                  }
                })
                data.patients_count = uniquePatients.size
              }
            }
          }
        } catch (error) {
          console.warn(`Error calculando pacientes para producto ${productId}:`, error)
          data.patients_count = 0
        }
      }

      // 🔧 NUEVO: Cargar todos los productos del inventario para mostrar también los no utilizados
      const { data: allProducts, error: allProductsError } = await supabase
        .from("inventory_products")
        .select("id, name, code, category, unit_price")
        .order("name", { ascending: true })

      if (allProductsError) throw allProductsError

      // Crear un array completo que incluya todos los productos
      const completeConsumptionArray: ConsumptionData[] = (allProducts || []).map(product => {
        const existingData = productMap.get(product.id)
        
        if (existingData) {
          // Producto que sí se consumió - usar datos reales
          return existingData
        } else {
          // Producto que NO se consumió - mostrar con valores en 0
          return {
            product_id: product.id,
            product_name: product.name,
            product_code: product.code,
            category: product.category,
            total_consumed: 0,
            unit_price: product.unit_price || 0,
            total_value: 0,
            procedures_count: 0,
            patients_count: 0
          }
        }
      })

      // Ordenar: primero los que tienen consumo (por valor), luego los que no tienen consumo (alfabéticamente)
      const consumptionArray = completeConsumptionArray.sort((a, b) => {
        if (a.total_consumed === 0 && b.total_consumed === 0) {
          // Ambos sin consumo: ordenar alfabéticamente
          return a.product_name.localeCompare(b.product_name)
        }
        if (a.total_consumed === 0) return 1 // a va al final
        if (b.total_consumed === 0) return -1 // b va al final
        // Ambos con consumo: ordenar por valor (mayor a menor), o por cantidad si ambos tienen valor 0
        if (a.total_value === 0 && b.total_value === 0) {
          return b.total_consumed - a.total_consumed
        }
        return b.total_value - a.total_value
      })

      // El producto más utilizado sigue siendo el primero con consumo real
      const mostUsedProduct = consumptionArray.find(item => item.total_consumed > 0) || null
      const summary: ProcedureSummary = {
        total_procedures: totalProceduresInPeriod, // Usar conteo real de procedimientos
        total_value: totalValue,
        avg_value_per_procedure: totalProceduresInPeriod > 0 ? totalValue / totalProceduresInPeriod : 0,
        most_used_product: mostUsedProduct ? {
          name: mostUsedProduct.product_name,
          quantity: mostUsedProduct.total_consumed
        } : { name: "-", quantity: 0 }
      }

      console.log("📊 Resumen final:", summary)

      setConsumptionData(consumptionArray)
      setTotalConsumptionValue(totalValue)
      setProcedureSummary(summary)

    } catch (error: any) {
      console.error("Error loading consumption data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de consumo",
        variant: "destructive",
      })
    }
  }

  // Cargar datos de inventario actual
  const loadInventoryData = async () => {
    try {
      const { data: products, error } = await supabase
        .from("inventory_products")
        .select("*")
        .order("name", { ascending: true })

      if (error) throw error

      let totalValue = 0
      let lowStockValue = 0
      let maxStock = 0
      let productWithMostStock = { name: "-", quantity: 0 }

      const inventoryArray: InventoryReport[] = (products || []).map(product => {
        const stockValue = (product.stock || 0) * (product.unit_price || 0)
        const currentStock = product.stock || 0
        totalValue += stockValue

        // Verificar si este producto tiene el mayor stock
        if (currentStock > maxStock) {
          maxStock = currentStock
          productWithMostStock = {
            name: product.name,
            quantity: currentStock
          }
        }

        let status = "normal"
        if ((product.stock || 0) === 0) {
          status = "out_of_stock"
        } else if ((product.stock || 0) <= (product.minimum_stock || 0)) {
          status = "low_stock"
          lowStockValue += stockValue
        }

        return {
          product_id: product.id,
          product_name: product.name,
          product_code: product.code,
          category: product.category,
          current_stock: product.stock || 0,
          minimum_stock: product.minimum_stock || 0,
          unit_price: product.unit_price || 0,
          stock_value: stockValue,
          status
        }
      })

      setInventoryData(inventoryArray)
      setTotalInventoryValue(totalValue)
      setLowStockValue(lowStockValue)
      setHighestStockProduct(productWithMostStock)

    } catch (error: any) {
      console.error("Error loading inventory data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de inventario",
        variant: "destructive",
      })
    }
  }

  // Cargar todos los datos
  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadConsumptionData(),
        loadInventoryData()
      ])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "out_of_stock":
        return <Badge variant="destructive">Agotado</Badge>
      case "low_stock":
        return <Badge variant="destructive">Stock Bajo</Badge>
      default:
        return <Badge variant="default">Normal</Badge>
    }
  }

  // Cargar datos al inicializar y cuando cambia el rango de fechas
  useEffect(() => {
    if (permissions.canViewReports) {
      loadAllData()
    }
  }, [dateRange, startDate, endDate, permissions.canViewReports])

  // Verificar permisos - Solo administradores y financieros pueden ver los informes
  if (!permissions.canViewReports) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
            </div>
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-orange-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
                <p className="text-gray-600">Los informes financieros están disponibles únicamente para administradores y personal financiero.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole={["administrador", "financiero"]}>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Informes Financieros</h1>
                <p className="text-gray-600">Reportes de consumo e inventario con valores monetarios</p>
              </div>
            </div>

            {/* Controles de filtro */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Filtros de Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Período</Label>
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="this_week">Últimos 7 días</SelectItem>
                        <SelectItem value="this_month">Este mes</SelectItem>
                        <SelectItem value="this_year">Este año</SelectItem>
                        <SelectItem value="custom">Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {dateRange === "custom" && (
                    <>
                      <div>
                        <Label>Fecha inicio</Label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Fecha fin</Label>
                        <Input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  
                  <div className="flex items-end">
                    <Button onClick={loadAllData} disabled={loading}>
                      {loading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      Generar Reporte
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="consumo" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="consumo">📉 Reporte de Consumo</TabsTrigger>
              <TabsTrigger value="inventario">📦 Reporte de Inventario</TabsTrigger>
            </TabsList>

            {/* Tab de Consumo */}
            <TabsContent value="consumo" className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2">Generando reporte de consumo...</span>
                </div>
              ) : (
                <>
                  {/* Resumen de Consumo */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Consumido</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(totalConsumptionValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Valor total del período
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Procedimientos</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatNumber(procedureSummary.total_procedures)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Total realizados
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Promedio</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatCurrency(procedureSummary.avg_value_per_procedure)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Por procedimiento
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Más Utilizado</CardTitle>
                        <Package className="h-4 w-4 text-purple-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold truncate">
                          {procedureSummary.most_used_product.name}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(procedureSummary.most_used_product.quantity)} unidades
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabla de Consumo */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Detalle de Consumo por Producto</CardTitle>
                      <CardDescription>
                        Incluye todos los productos del inventario. Los productos sin uso se muestran en naranja.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {consumptionData.length === 0 ? (
                        <div className="text-center py-8">
                          <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                          <p className="text-gray-500">No hay datos de consumo en el período seleccionado</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-3 px-4">Producto</th>
                                <th className="text-left py-3 px-4">Código</th>
                                <th className="text-left py-3 px-4">Categoría</th>
                                <th className="text-right py-3 px-4">Cantidad</th>
                                <th className="text-right py-3 px-4">Precio Unit.</th>
                                <th className="text-right py-3 px-4">Valor Total</th>
                                <th className="text-right py-3 px-4">Procedimientos</th>
                                <th className="text-right py-3 px-4">Pacientes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {consumptionData.map((item) => {
                                const isUnused = item.total_consumed === 0
                                return (
                                  <tr 
                                    key={item.product_id} 
                                    className={`border-b hover:bg-gray-50 ${isUnused ? 'bg-orange-50/30' : ''}`}
                                  >
                                    <td className="py-3 px-4 font-medium">
                                      {item.product_name}
                                      {isUnused && <span className="ml-2 text-xs text-orange-600 font-semibold">(Sin uso en este rango)</span>}
                                    </td>
                                    <td className="py-3 px-4">
                                      <Badge variant={isUnused ? "secondary" : "outline"}>{item.product_code}</Badge>
                                    </td>
                                    <td className="py-3 px-4">
                                      <Badge variant="secondary">{item.category}</Badge>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      {formatNumber(item.total_consumed)}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      {formatCurrency(item.unit_price)}
                                    </td>
                                    <td className={`py-3 px-4 text-right font-bold ${isUnused ? 'text-orange-600' : 'text-red-600'}`}>
                                      {formatCurrency(item.total_value)}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      {formatNumber(item.procedures_count)}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                      {formatNumber(item.patients_count)}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* Tab de Inventario */}
            <TabsContent value="inventario" className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2">Generando reporte de inventario...</span>
                </div>
              ) : (
                <>
                  {/* Resumen de Inventario */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Valor Total Inventario</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(totalInventoryValue)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Valor actual en stock
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Productos Totales</CardTitle>
                        <Package className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatNumber(inventoryData.length)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tipos de productos
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mayor Stock</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-lg font-bold text-green-600 truncate">
                          {highestStockProduct.name}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatNumber(highestStockProduct.quantity)} unidades disponibles
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Productos Activos</CardTitle>
                        <Users className="h-4 w-4 text-purple-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {formatNumber(inventoryData.filter(item => item.current_stock > 0).length)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Con stock disponible
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabla de Inventario */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Inventario Actual con Valores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4">Producto</th>
                              <th className="text-left py-3 px-4">Código</th>
                              <th className="text-left py-3 px-4">Categoría</th>
                              <th className="text-right py-3 px-4">Stock Actual</th>
                              <th className="text-right py-3 px-4">Stock Mín.</th>
                              <th className="text-right py-3 px-4">Precio Unit.</th>
                              <th className="text-right py-3 px-4">Valor Stock</th>
                              <th className="text-center py-3 px-4">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inventoryData.map((item) => (
                              <tr key={item.product_id} className="border-b hover:bg-gray-50">
                                <td className="py-3 px-4 font-medium">{item.product_name}</td>
                                <td className="py-3 px-4">
                                  <Badge variant="outline">{item.product_code}</Badge>
                                </td>
                                <td className="py-3 px-4">
                                  <Badge variant="secondary">{item.category}</Badge>
                                </td>
                                <td className="py-3 px-4 text-right">{formatNumber(item.current_stock)}</td>
                                <td className="py-3 px-4 text-right">{formatNumber(item.minimum_stock)}</td>
                                <td className="py-3 px-4 text-right">{formatCurrency(item.unit_price)}</td>
                                <td className={`py-3 px-4 text-right font-bold ${item.stock_value === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {formatCurrency(item.stock_value)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {getStatusBadge(item.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </ProtectedRoute>
  )
} 