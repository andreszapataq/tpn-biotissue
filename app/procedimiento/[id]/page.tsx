"use client"

import type React from "react"
import { useState, useEffect, use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Plus, Minus, Save, Loader2, CheckCircle, XCircle, Clock, Package } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { formatDateForColombia, formatTimestampWithTimeForColombia, getMachineDisplayName } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"

type Procedure = Tables<"procedures">
type Patient = Tables<"patients">
type Machine = Tables<"machines">
type InventoryProduct = Tables<"inventory_products">
type ProcedureProduct = Tables<"procedure_products">

interface ProcedureDetails extends Procedure {
  patient: Patient
  machine: Machine
}

interface ProductUsage extends ProcedureProduct {
  product: InventoryProduct
}

export default function ProcedureDetail({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [procedure, setProcedure] = useState<ProcedureDetails | null>(null)
  const [productUsage, setProductUsage] = useState<ProductUsage[]>([])
  const [availableProducts, setAvailableProducts] = useState<InventoryProduct[]>([])
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: number }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()



  // Cargar datos del procedimiento
  const loadProcedureData = async () => {
    try {
      setLoading(true)
      
      // Cargar procedimiento con datos relacionados
      const { data: procedureData, error: procedureError } = await supabase
        .from("procedures")
        .select(`
          *,
          patient:patients(*),
          machine:machines(*)
        `)
        .eq("id", resolvedParams.id)
        .single()

      if (procedureError) throw procedureError

      setProcedure(procedureData as ProcedureDetails)

      // Cargar productos utilizados en el procedimiento
      const { data: usageData, error: usageError } = await supabase
        .from("procedure_products")
        .select(`
          *,
          product:inventory_products(*)
        `)
        .eq("procedure_id", resolvedParams.id)
        .order("created_at", { ascending: false })

      if (usageError) throw usageError

      setProductUsage(usageData as ProductUsage[])

      // Cargar productos disponibles
      const { data: productsData, error: productsError } = await supabase
        .from("inventory_products")
        .select("*")
        .order("name", { ascending: true })

      if (productsError) throw productsError

      setAvailableProducts(productsData || [])

    } catch (error: any) {
      console.error("Error loading procedure data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del procedimiento",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProcedureData()
  }, [resolvedParams.id])

  const handleProductQuantityChange = (productId: string, change: number) => {
    setSelectedProducts((prev) => {
      const newQuantity = (prev[productId] || 0) + change
      if (newQuantity <= 0) {
        const { [productId]: removed, ...rest } = prev
        return rest
      }
      return { ...prev, [productId]: newQuantity }
    })
  }

  const handleAddProducts = async () => {
    if (!user || !procedure) return

    if (Object.keys(selectedProducts).length === 0) {
      toast({
        title: "Error",
        description: "Debe seleccionar al menos un producto",
        variant: "destructive",
      })
      return
    }

    // Validar stock disponible
    for (const [productId, quantity] of Object.entries(selectedProducts)) {
      const product = availableProducts.find(p => p.id === productId)
      if (!product || (product.stock || 0) < quantity) {
        toast({
          title: "Error",
          description: `Stock insuficiente para ${product?.name || 'producto'}`,
          variant: "destructive",
        })
        return
      }
    }

    try {
      setSaving(true)

      // Obtener perfil del usuario
      const { data: userProfile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single()

      const procedureProducts = []
      const inventoryMovements = []

      // 🔧 FIX: Actualizar stocks uno por uno para garantizar consistencia
      for (const [productId, quantity] of Object.entries(selectedProducts)) {
        const product = availableProducts.find(p => p.id === productId)
        if (!product) continue

        const newStock = (product.stock || 0) - quantity

        // 🔧 FIX: Actualizar stock inmediatamente, no en batch
        const { error: stockError } = await supabase
          .from("inventory_products")
          .update({ 
            stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq("id", productId)

        if (stockError) {
          console.error(`❌ Error updating stock for ${product.name}:`, stockError)
          throw stockError
        }
        console.log(`✅ Stock updated for ${product.name}: ${newStock}`)

        // Registrar producto usado en procedimiento
        procedureProducts.push({
          procedure_id: procedure.id,
          product_id: productId,
          quantity_used: quantity
        })

        // Registrar movimiento de inventario
        const movementData: any = {
          product_id: productId,
          movement_type: "out",
          quantity: -quantity,
          reference_type: "procedure",
          reference_id: procedure.id,
          notes: `Insumo adicional - Paciente: ${procedure.patient?.name || 'Sin nombre'}`
        }
        
        if (userProfile?.id) {
          movementData.created_by = userProfile.id
        }
        
        inventoryMovements.push(movementData)
      }

      // Insertar productos del procedimiento
      const { error: procedureProductsError } = await supabase
        .from("procedure_products")
        .insert(procedureProducts)

      if (procedureProductsError) throw procedureProductsError

      // Insertar movimientos de inventario
      const { error: movementsError } = await supabase
        .from("inventory_movements")
        .insert(inventoryMovements)

      if (movementsError) throw movementsError

      toast({
        title: "Éxito",
        description: "Insumos agregados correctamente",
      })

      // Limpiar selección y recargar datos
      setSelectedProducts({})
      loadProcedureData()

    } catch (error: any) {
      console.error("Error adding products:", error)
      toast({
        title: "Error",
        description: "No se pudieron agregar los insumos",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCloseProcedure = async () => {
    if (!procedure) return

    try {
      setClosing(true)

      // Actualizar el procedimiento
      const { error: procedureError } = await supabase
        .from("procedures")
        .update({ 
          status: "completed",
          end_time: new Date().toLocaleTimeString("es-ES", { hour12: false }),
          updated_at: new Date().toISOString()
        })
        .eq("id", procedure.id)

      if (procedureError) throw procedureError

      // Actualizar el estado del paciente a "completed"
      if (procedure.patient_id) {
        const { error: patientError } = await supabase
          .from("patients")
          .update({ 
            status: "completed",
            updated_at: new Date().toISOString()
          })
          .eq("id", procedure.patient_id)

        if (patientError) throw patientError
      }

      toast({
        title: "Éxito",
        description: "Procedimiento cerrado correctamente",
      })

      // Redirigir al dashboard
      router.push("/")

    } catch (error: any) {
      console.error("Error closing procedure:", error)
      toast({
        title: "Error",
        description: "No se pudo cerrar el procedimiento",
        variant: "destructive",
      })
    } finally {
      setClosing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800"><Clock className="h-3 w-3 mr-1" />Activo</Badge>
      case "completed":
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Completado</Badge>
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>
      case "unknown":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Estado Desconocido</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTotalProductsUsed = () => {
    return productUsage.reduce((total, usage) => total + usage.quantity_used, 0)
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!procedure) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Procedimiento no encontrado</h1>
              <Link href="/">
                <Button>Volver al Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-3 md:p-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 md:gap-4">
                <Link href="/">
                  <Button variant="outline" size="sm" className="touch-manipulation">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                  </Button>
                </Link>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Detalle del Procedimiento</h1>
                  <p className="text-sm md:text-base text-gray-600">Gestión de terapia NPWT</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {getStatusBadge(procedure.status || "unknown")}
                {procedure.status === "active" && (
                  <Button 
                    onClick={handleCloseProcedure}
                    disabled={closing}
                    className="bg-red-600 hover:bg-red-700 touch-manipulation w-full sm:w-auto"
                    size="sm"
                  >
                    {closing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cerrando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Cerrar Procedimiento</span>
                        <span className="sm:hidden">Cerrar</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Información del Procedimiento */}
            <div className="lg:col-span-2 space-y-6">
              {/* Datos Generales */}
              <Card>
                <CardHeader>
                  <CardTitle>Información General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Fecha del Procedimiento</Label>
                      <p className="text-lg font-semibold">{formatDateForColombia(procedure.procedure_date)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Hora de Inicio</Label>
                      <p className="text-lg font-semibold">{procedure.start_time}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Ubicación</Label>
                      <p className="text-lg font-semibold">{procedure.location || "No especificada"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Cirujano Líder</Label>
                      <p className="text-lg font-semibold">{procedure.surgeon_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Asistente</Label>
                      <p className="text-lg font-semibold">{procedure.assistant_name || "N/A"}</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Diagnóstico Preoperatorio</Label>
                    <p className="text-lg mt-1">{procedure.diagnosis}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Datos del Paciente */}
              <Card>
                <CardHeader>
                  <CardTitle>Datos del Paciente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                         <div>
                       <Label className="text-sm font-medium text-gray-500">Nombre Completo</Label>
                       <p className="text-lg font-semibold">{procedure.patient.name || 'Sin nombre'}</p>
                     </div>
                     <div>
                       <Label className="text-sm font-medium text-gray-500">Identificación</Label>
                       <p className="text-lg font-semibold">{procedure.patient.identification || 'Sin identificación'}</p>
                     </div>
                     <div>
                       <Label className="text-sm font-medium text-gray-500">Edad</Label>
                       <p className="text-lg font-semibold">{procedure.patient.age || 0} años</p>
                     </div>
                  </div>
                </CardContent>
              </Card>

              {/* Máquina Utilizada */}
              <Card>
                <CardHeader>
                  <CardTitle>Equipo NPWT</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Modelo</Label>
                      <p className="text-lg font-semibold">{getMachineDisplayName(procedure.machine.model, procedure.machine.lote)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Lote</Label>
                      <p className="text-lg font-semibold">{procedure.machine.lote}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Panel de Insumos */}
            <div className="space-y-6">
              {/* Resumen de Insumos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Resumen de Insumos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{getTotalProductsUsed()}</div>
                    <p className="text-sm text-gray-500">Total de insumos utilizados</p>
                  </div>
                </CardContent>
              </Card>

              {/* Historial de Insumos */}
              <Card>
                <CardHeader>
                  <CardTitle>Historial de Insumos</CardTitle>
                  <CardDescription>Productos utilizados en este procedimiento</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {productUsage.length > 0 ? (
                      productUsage.map((usage, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm">{usage.product.name}</p>
                              <Badge variant="outline" className="text-xs">
                                Cantidad: {usage.quantity_used}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500">{usage.product.code}</p>
                              <span className="text-xs text-gray-400">•</span>
                              <p className="text-xs text-gray-500">
                                Agregado: {usage.created_at ? formatTimestampWithTimeForColombia(usage.created_at) : "Fecha no disponible"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No hay insumos registrados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Agregar Insumos (solo si está activo) */}
              {procedure.status === "active" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Agregar Insumos</CardTitle>
                    <CardDescription>Seleccionar insumos adicionales para el tratamiento</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {availableProducts.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="outline" className="text-xs">{product.code}</Badge>
                              <Badge 
                                variant={(product.stock || 0) < 5 ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                Stock: {product.stock || 0}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleProductQuantityChange(product.id, -1)}
                              disabled={!selectedProducts[product.id]}
                              className="h-8 w-8 p-0 touch-manipulation"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">{selectedProducts[product.id] || 0}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleProductQuantityChange(product.id, 1)}
                              disabled={selectedProducts[product.id] >= (product.stock || 0)}
                              className="h-8 w-8 p-0 touch-manipulation"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {Object.keys(selectedProducts).length > 0 && (
                      <Button 
                        onClick={handleAddProducts}
                        disabled={saving}
                        className="w-full"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Agregando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Agregar Insumos Seleccionados
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
} 