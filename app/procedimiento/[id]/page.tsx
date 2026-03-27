"use client"

import type React from "react"
import { useState, useEffect, use } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Minus, Save, Loader2, CheckCircle, XCircle, Clock, Package, Settings, Edit, Search, X } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { formatDateForColombia, formatTimestampWithTimeForColombia, getMachineDisplayName } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"
import { usePermissions } from "@/hooks/use-permissions"


type Procedure = Tables<"procedures">
type Patient = Tables<"patients">
type Machine = Tables<"machines">
type InventoryProduct = Tables<"inventory_products">
type ProcedureProduct = Tables<"procedure_products">

interface ProcedureMachineRow {
  machine_id: string
  machine: Machine
}

interface ProcedureDetails extends Procedure {
  patient: Patient
  machine: Machine | null
  procedure_machines: ProcedureMachineRow[]
  institution: { name: string } | null
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
  const [addProductSearch, setAddProductSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  
  // Estados para cambio de máquina
  const [availableMachines, setAvailableMachines] = useState<Machine[]>([])
  const [isChangeMachineDialogOpen, setIsChangeMachineDialogOpen] = useState(false)
  const [selectedNewMachine, setSelectedNewMachine] = useState("")
  const [changingMachine, setChangingMachine] = useState(false)
  const [machineToRemove, setMachineToRemove] = useState<string | null>(null)

  // Estados para edición de procedimiento
  const [isEditGeneralDialogOpen, setIsEditGeneralDialogOpen] = useState(false)
  const [isEditPatientDialogOpen, setIsEditPatientDialogOpen] = useState(false)
  const [isUpdatingGeneral, setIsUpdatingGeneral] = useState(false)
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false)
  
  // Estados para formularios de edición
  const [editGeneralData, setEditGeneralData] = useState({
    location: "",
    surgeon_name: "",
    assistant_name: "",
    diagnosis: ""
  })
  
  const [editPatientData, setEditPatientData] = useState({
    name: "",
    identification: "",
    age: 0
  })
  
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  const permissions = usePermissions()

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
          machine:machines(*),
          procedure_machines(machine_id, machine:machines(*)),
          institution:institutions(name)
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
        .eq("institution_id", (procedureData as ProcedureDetails).institution_id)
        .order("name", { ascending: true })

      if (productsError) throw productsError

      setAvailableProducts(productsData || [])

      // Cargar máquinas disponibles para cambio/adición (solo si el procedimiento está activo)
      if (procedureData?.status === "active") {
        const currentMachineIds = (procedureData as ProcedureDetails).procedure_machines?.map(pm => pm.machine_id) || []
        if (currentMachineIds.length === 0 && procedureData.machine_id) {
          currentMachineIds.push(procedureData.machine_id)
        }
        await loadAvailableMachines(currentMachineIds, (procedureData as ProcedureDetails).institution_id)
      }

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

  // Cargar máquinas disponibles para cambio/adición
  const loadAvailableMachines = async (currentMachineIds: string[], institutionId?: string) => {
    const instId = institutionId || procedure?.institution_id || ""
    try {
      // Cargar todas las máquinas activas y máquinas en uso en procedimientos activos (excluyendo el actual)
      const [machinesResult, activeProcedureMachinesResult] = await Promise.all([
        supabase
          .from("machines")
          .select("*")
          .eq("institution_id", instId)
          .eq("status", "active")
          .order("model", { ascending: true }),
        supabase
          .from("procedure_machines")
          .select("machine_id, procedure:procedures!inner(id, status)")
          .eq("institution_id", instId)
          .eq("procedure.status", "active")
      ])

      if (machinesResult.error) throw machinesResult.error
      if (activeProcedureMachinesResult.error) throw activeProcedureMachinesResult.error

      // Crear set de máquinas en uso en OTROS procedimientos activos
      const usedMachineIds = new Set(
        activeProcedureMachinesResult.data
          ?.filter((pm: any) => pm.procedure?.id !== resolvedParams.id)
          .map(pm => pm.machine_id)
          .filter(Boolean) || []
      )

      // Filtrar máquinas disponibles (no en uso en otros procedimientos y no ya asignadas a este)
      const currentMachineIdSet = new Set(currentMachineIds)
      const availableMachinesForChange = machinesResult.data?.filter(machine =>
        !usedMachineIds.has(machine.id) && !currentMachineIdSet.has(machine.id)
      ) || []

      setAvailableMachines(availableMachinesForChange)
    } catch (error: any) {
      console.error("Error loading available machines:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las máquinas disponibles",
        variant: "destructive",
      })
    }
  }

  // Agregar máquina al procedimiento
  const handleAddMachine = async () => {
    if (!permissions.canEditMachines) {
      toast({
        title: "Acceso Denegado",
        description: "No tienes permisos para cambiar máquinas",
        variant: "destructive",
      })
      return
    }

    if (!selectedNewMachine || !procedure) return

    try {
      setChangingMachine(true)

      // Insertar en procedure_machines
      const { error: pmError } = await supabase
        .from("procedure_machines")
        .insert({
          procedure_id: procedure.id,
          machine_id: selectedNewMachine,
          institution_id: procedure.institution_id,
        })

      if (pmError) throw pmError

      // Actualizar machine_id en procedures para backward compat (solo si no tiene una)
      if (!procedure.machine_id) {
        await supabase
          .from("procedures")
          .update({ machine_id: selectedNewMachine, updated_at: new Date().toISOString() })
          .eq("id", procedure.id)
      }

      toast({
        title: "Éxito",
        description: "Máquina agregada correctamente",
      })

      setIsChangeMachineDialogOpen(false)
      setSelectedNewMachine("")
      await loadProcedureData()

    } catch (error: any) {
      console.error("Error adding machine:", error)
      toast({
        title: "Error",
        description: "No se pudo agregar la máquina",
        variant: "destructive",
      })
    } finally {
      setChangingMachine(false)
    }
  }

  // Quitar máquina del procedimiento
  const handleRemoveMachine = async (machineId: string) => {
    if (!permissions.canEditMachines || !procedure) return

    try {
      setChangingMachine(true)

      const { error } = await supabase
        .from("procedure_machines")
        .delete()
        .eq("procedure_id", procedure.id)
        .eq("machine_id", machineId)

      if (error) throw error

      // Actualizar machine_id en procedures para backward compat
      const remaining = procedure.procedure_machines.filter(pm => pm.machine_id !== machineId)
      await supabase
        .from("procedures")
        .update({
          machine_id: remaining.length > 0 ? remaining[0].machine_id : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", procedure.id)

      toast({
        title: "Éxito",
        description: "Máquina removida correctamente",
      })

      await loadProcedureData()

    } catch (error: any) {
      console.error("Error removing machine:", error)
      toast({
        title: "Error",
        description: "No se pudo remover la máquina",
        variant: "destructive",
      })
    } finally {
      setChangingMachine(false)
    }
  }

  useEffect(() => {
    loadProcedureData()
  }, [resolvedParams.id])

  // Abrir diálogo de edición de información general
  const openEditGeneralDialog = () => {
    if (!procedure) return
    setEditGeneralData({
      location: procedure.location || "",
      surgeon_name: procedure.surgeon_name || "",
      assistant_name: procedure.assistant_name || "",
      diagnosis: procedure.diagnosis || ""
    })
    setIsEditGeneralDialogOpen(true)
  }

  // Abrir diálogo de edición de datos del paciente
  const openEditPatientDialog = () => {
    if (!procedure?.patient) return
    setEditPatientData({
      name: procedure.patient.name || "",
      identification: procedure.patient.identification || "",
      age: procedure.patient.age || 0
    })
    setIsEditPatientDialogOpen(true)
  }

  // Actualizar información general del procedimiento
  const handleUpdateGeneralInfo = async () => {
    if (!procedure) return

    try {
      setIsUpdatingGeneral(true)

      const { error } = await supabase
        .from("procedures")
        .update({
          location: editGeneralData.location || null,
          surgeon_name: editGeneralData.surgeon_name,
          assistant_name: editGeneralData.assistant_name || null,
          diagnosis: editGeneralData.diagnosis,
          updated_at: new Date().toISOString()
        })
        .eq("id", procedure.id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Información del procedimiento actualizada correctamente",
      })

      setIsEditGeneralDialogOpen(false)
      await loadProcedureData()

    } catch (error: any) {
      console.error("Error updating procedure:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del procedimiento",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingGeneral(false)
    }
  }

  // Actualizar datos del paciente
  const handleUpdatePatientInfo = async () => {
    if (!procedure?.patient) return

    try {
      setIsUpdatingPatient(true)

      const { error } = await supabase
        .from("patients")
        .update({
          name: editPatientData.name,
          identification: editPatientData.identification,
          age: editPatientData.age,
          updated_at: new Date().toISOString()
        })
        .eq("id", procedure.patient.id)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Datos del paciente actualizados correctamente",
      })

      setIsEditPatientDialogOpen(false)
      await loadProcedureData()

    } catch (error: any) {
      console.error("Error updating patient:", error)
      toast({
        title: "Error",
        description: "No se pudieron actualizar los datos del paciente",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingPatient(false)
    }
  }

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

    // 🛡️ PROTECCIÓN ANTI-DUPLICACIÓN: Evitar múltiples envíos simultáneos
    if (saving) {
      console.warn("⚠️ Product addition already in progress, ignoring duplicate request")
      toast({
        title: "Procesando",
        description: "Ya se están agregando los insumos, por favor espere...",
        variant: "destructive",
      })
      return
    }

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
      console.log("📱 Iniciando agregado de insumos para conexión móvil")

      // 🔄 Función de reintento para conexiones móviles inestables
      const retryOperation = async (operation: () => Promise<any>, maxRetries: number = 3): Promise<any> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            return await operation()
          } catch (error: any) {
            const isNetworkError = error.message?.includes('network') || 
                                 error.message?.includes('connection') ||
                                 error.message?.includes('timeout') ||
                                 error.code === 'PGRST301'
            
            if (isNetworkError && attempt < maxRetries) {
              console.warn(`⚠️ Intento ${attempt} falló, reintentando en 2 segundos...`)
              await new Promise(resolve => setTimeout(resolve, 2000))
              continue
            }
            throw error
          }
        }
        throw new Error("Max retries exceeded")
      }

      // 1️⃣ Obtener perfil del usuario con reintentos
      console.log("👤 Obteniendo perfil de usuario...")
      const { data: userProfile } = await retryOperation(async () => {
        const result = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single()
        return result
      })

      const procedureProducts: Array<{
        procedure_id: string
        product_id: string
        institution_id: string
        quantity_used: number
      }> = []
      
      const inventoryMovements: Array<{
        product_id: string
        movement_type: string
        quantity: number
        reference_type: string
        reference_id: string
        institution_id: string
        notes: string
        created_by?: string
      }> = []
      const productCount = Object.keys(selectedProducts).length
      let currentProduct = 0

      // 2️⃣ Actualizar stocks con progreso detallado
      for (const [productId, quantity] of Object.entries(selectedProducts)) {
        currentProduct++
        const product = availableProducts.find(p => p.id === productId)
        if (!product) continue

        console.log(`📦 Procesando producto ${currentProduct}/${productCount}: ${product.name}`)
        
        // Mostrar progreso específico para iPad
        toast({
          title: "Procesando...",
          description: `Agregando ${product.name} (${currentProduct}/${productCount})`,
        })

        const newStock = (product.stock || 0) - quantity

        // 3️⃣ Actualizar stock con reintentos
        console.log(`🔄 Actualizando stock: ${product.stock} -> ${newStock}`)
        
        const { data: updatedProduct, error: stockError } = await retryOperation(async () => {
          return await supabase
            .from("inventory_products")
            .update({ 
              stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq("id", productId)
            .select("stock")
            .single()
        })

        if (stockError) {
          console.error(`❌ Error actualizando stock para ${product.name}:`, stockError)
          throw stockError
        }
        
        console.log(`✅ Stock actualizado para ${product.name}: ${updatedProduct?.stock}`)

        // Registrar producto usado en procedimiento
        procedureProducts.push({
          procedure_id: procedure.id,
          product_id: productId,
          institution_id: procedure.institution_id,
          quantity_used: quantity
        })

        // Registrar movimiento de inventario
        const movementData: any = {
          product_id: productId,
          movement_type: "out",
          quantity: -quantity,
          reference_type: "procedure",
          reference_id: procedure.id,
          institution_id: procedure.institution_id,
          notes: `Insumo adicional - Paciente: ${procedure.patient?.name || 'Sin nombre'}`
        }
        
        if (userProfile?.id) {
          movementData.created_by = userProfile.id
        }
        
        inventoryMovements.push(movementData)
      }

      // 4️⃣ Insertar productos del procedimiento con reintentos
      console.log("📋 Registrando productos del procedimiento...")
      const { error: procedureProductsError } = await retryOperation(async () => {
        return await supabase
          .from("procedure_products")
          .insert(procedureProducts)
      })

      if (procedureProductsError) throw procedureProductsError

      // 5️⃣ Insertar movimientos de inventario con reintentos
      console.log("📊 Registrando movimientos de inventario...")
      const { error: movementsError } = await retryOperation(async () => {
        return await supabase
          .from("inventory_movements")
          .insert(inventoryMovements)
      })

      if (movementsError) throw movementsError

      toast({
        title: "✅ Éxito",
        description: `${productCount} insumo${productCount > 1 ? 's' : ''} agregado${productCount > 1 ? 's' : ''} correctamente`,
      })

      // Limpiar selección y recargar datos
      setSelectedProducts({})
      loadProcedureData()

    } catch (error: any) {
      console.error("❌ CRITICAL ERROR adding products:", error)
      console.error("❌ Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // 🔍 Verificar si es un problema de conexión
      const isNetworkError = error.message?.includes('network') || 
                           error.message?.includes('connection') ||
                           error.message?.includes('timeout') ||
                           error.code === 'PGRST301'
      
      let errorMessage = "No se pudieron agregar los insumos"
      
      if (isNetworkError) {
        errorMessage = "Problema de conexión. Verifique su internet e intente nuevamente."
      } else if (error.message) {
        errorMessage = error.message
      } else if (error.details) {
        errorMessage = error.details
      }
      
      toast({
        title: "Error",
        description: errorMessage,
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

      // Solo marcar paciente como "completed" si no tiene otros procedimientos activos
      if (procedure.patient_id) {
        const { count, error: countError } = await supabase
          .from("procedures")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", procedure.patient_id)
          .eq("status", "active")
          .neq("id", procedure.id)

        if (countError) throw countError

        if (count === 0) {
          const { error: patientError } = await supabase
            .from("patients")
            .update({
              status: "completed",
              updated_at: new Date().toISOString()
            })
            .eq("id", procedure.patient_id)

          if (patientError) throw patientError
        }
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
        return <StatusBadge status="active" label="Activo" />
      case "completed":
        return <StatusBadge status="completed" label="Completado" />
      case "cancelled":
        return <StatusBadge status="cancelled" label="Cancelado" />
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTotalProductsUsed = () => {
    return productUsage.reduce((total, usage) => total + usage.quantity_used, 0)
  }

  if (loading) {
    return (
      <ProtectedRoute requiredRole={["administrador", "soporte", "asistente"]}>
        <div className="page-shell">
          <div className="page-container-medium">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!procedure) {
    return (
      <ProtectedRoute requiredRole={["administrador", "soporte", "asistente"]}>
        <div className="page-shell">
          <div className="page-container-medium">
            <div className="text-center py-12">
              <h1 className="heading-1 mb-4">Procedimiento no encontrado</h1>
              <a href="/">
                <Button>Volver al Dashboard</Button>
              </a>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole={["administrador", "soporte", "asistente"]}>
      <div className="page-shell">
        <div className="page-container">
          {/* Header */}
          <div className="mb-4 md:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <PageHeader
                title="Detalle del Procedimiento"
                subtitle="Gestión de terapia NPWT"
                backHref="/"
                backLabel="Volver"
              />
              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
                {procedure.institution?.name && (
                  <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {procedure.institution.name}
                  </span>
                )}
                {getStatusBadge(procedure.status || "unknown")}
                {procedure.status === "active" && (
                  <Button
                    onClick={handleCloseProcedure}
                    disabled={closing}
                    variant="destructive"
                    className="touch-manipulation w-full sm:w-auto"
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
                  <div className="flex items-center justify-between">
                    <CardTitle>Información General</CardTitle>
                    {procedure?.status === "active" && (
                      <Button variant="outline" size="sm" onClick={openEditGeneralDialog}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Fecha del Procedimiento</Label>
                      <p className="text-lg font-semibold">{formatDateForColombia(procedure.procedure_date)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Hora de Inicio</Label>
                      <p className="text-lg font-semibold">{procedure.start_time}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Ubicación</Label>
                      <p className="text-lg font-semibold">{procedure.location || "No especificada"}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Cirujano Líder</Label>
                      <p className="text-lg font-semibold">{procedure.surgeon_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Asistente</Label>
                      <p className="text-lg font-semibold">{procedure.assistant_name || "N/A"}</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Diagnóstico Preoperatorio</Label>
                    <p className="text-lg mt-1">{procedure.diagnosis}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Datos del Paciente */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Datos del Paciente</CardTitle>
                    {procedure?.status === "active" && permissions.canEditMachines && (
                      <Button variant="outline" size="sm" onClick={openEditPatientDialog}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                         <div>
                       <Label className="text-sm font-medium text-muted-foreground">Nombre Completo</Label>
                       <p className="text-lg font-semibold">{procedure.patient.name || 'Sin nombre'}</p>
                     </div>
                     <div>
                       <Label className="text-sm font-medium text-muted-foreground">Identificación</Label>
                       <p className="text-lg font-semibold">{procedure.patient.identification || 'Sin identificación'}</p>
                     </div>
                     <div>
                       <Label className="text-sm font-medium text-muted-foreground">Edad</Label>
                       <p className="text-lg font-semibold">{procedure.patient.age || 0} años</p>
                     </div>
                  </div>
                </CardContent>
              </Card>

              {/* Máquinas Utilizadas */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Equipos NPWT</CardTitle>
                    {procedure.status === "active" && permissions.canEditMachines && availableMachines.length > 0 && (
                      <Dialog open={isChangeMachineDialogOpen} onOpenChange={setIsChangeMachineDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Máquina
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Agregar Máquina al Procedimiento</DialogTitle>
                            <DialogDescription>
                              Seleccione una máquina disponible para agregar a este procedimiento.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="new-machine">Máquina a Agregar</Label>
                              {availableMachines.length === 0 ? (
                                <div className="p-3 border border-warning/30 rounded bg-warning-muted">
                                  <p className="text-sm text-warning-foreground">No hay máquinas disponibles</p>
                                  <p className="text-xs text-warning mt-1">
                                    Todas las demás máquinas están en uso o no están disponibles
                                  </p>
                                </div>
                              ) : (
                                <Select value={selectedNewMachine} onValueChange={setSelectedNewMachine}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar máquina" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableMachines.map((machine) => (
                                      <SelectItem key={machine.id} value={machine.id}>
                                        <div className="flex items-center gap-2">
                                          <span>{getMachineDisplayName(machine.model, machine.lote)}</span>
                                          <Badge variant="outline" className="text-xs">
                                            Lote: {machine.lote}
                                          </Badge>
                                          <Badge variant="default" className="bg-success-muted text-success-foreground text-xs">
                                            Disponible
                                          </Badge>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsChangeMachineDialogOpen(false)
                                setSelectedNewMachine("")
                              }}
                            >
                              Cancelar
                            </Button>
                            <Button
                              onClick={handleAddMachine}
                              disabled={changingMachine || !selectedNewMachine}
                            >
                              {changingMachine ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Agregando...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Agregar Máquina
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const machines = procedure.procedure_machines?.length > 0
                      ? procedure.procedure_machines.map(pm => pm.machine)
                      : procedure.machine ? [procedure.machine] : []
                    const machineIds = procedure.procedure_machines?.length > 0
                      ? procedure.procedure_machines.map(pm => pm.machine_id)
                      : procedure.machine_id ? [procedure.machine_id] : []

                    if (machines.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <div className="bg-info-muted p-4 rounded-lg border border-info/30">
                            <p className="text-info-foreground font-medium">Sin máquina asignada</p>
                            <p className="text-primary text-sm mt-1">
                              Este procedimiento no tiene equipo NPWT asignado
                            </p>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div className="space-y-3">
                        {machines.map((machine, idx) => (
                          <div key={machineIds[idx] || idx} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Modelo</Label>
                                <p className="text-lg font-semibold">{getMachineDisplayName(machine.model, machine.lote)}</p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium text-muted-foreground">Lote</Label>
                                <p className="text-lg font-semibold">{machine.lote}</p>
                              </div>
                            </div>
                            {procedure.status === "active" && permissions.canEditMachines && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80 hover:bg-destructive/5 ml-2"
                                onClick={() => setMachineToRemove(machineIds[idx])}
                                disabled={changingMachine}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                  {procedure.status === "active" && permissions.canEditMachines && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Máquinas disponibles para agregar:</span>
                        <Badge variant="outline" className={availableMachines.length > 0 ? "text-success" : "text-warning"}>
                          {availableMachines.length} disponibles
                        </Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Confirmación para quitar máquina */}
              <AlertDialog open={!!machineToRemove} onOpenChange={(open) => { if (!open) setMachineToRemove(null) }}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción quitará la máquina del procedimiento. Podrá volver a agregarla después si lo necesita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => {
                        if (machineToRemove) {
                          handleRemoveMachine(machineToRemove)
                          setMachineToRemove(null)
                        }
                      }}
                    >
                      Quitar máquina
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                    <div className="text-3xl font-bold text-primary">{getTotalProductsUsed()}</div>
                    <p className="text-sm text-muted-foreground">Total de insumos utilizados</p>
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
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm">{usage.product.name}</p>
                              <Badge variant="outline" className="text-xs">
                                Cantidad: {usage.quantity_used}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">{usage.product.code}</p>
                              <span className="text-xs text-muted-foreground">•</span>
                              <p className="text-xs text-muted-foreground">
                                Agregado: {usage.created_at ? formatTimestampWithTimeForColombia(usage.created_at) : "Fecha no disponible"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No hay insumos registrados</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Agregar Insumos (solo si está activo) */}
              {procedure.status === "active" && permissions.canAddProcedureSupplies && (
                <Card>
                  <CardHeader>
                    <CardTitle>Agregar Insumos</CardTitle>
                    <CardDescription>Seleccionar insumos adicionales para el tratamiento</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por nombre, código o lote..."
                        value={addProductSearch}
                        onChange={(e) => setAddProductSearch(e.target.value)}
                        className="pl-9 pr-9"
                      />
                      {addProductSearch && (
                        <button
                          type="button"
                          onClick={() => setAddProductSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {availableProducts
                        .filter((product) => (product.stock || 0) > 0)
                        .filter((product) => {
                          if (!addProductSearch.trim()) return true
                          const search = addProductSearch.toLowerCase()
                          return (
                            product.name?.toLowerCase().includes(search) ||
                            product.code?.toLowerCase().includes(search) ||
                            product.lote?.toLowerCase().includes(search)
                          )
                        })
                        .map((product) => {
                          const qty = selectedProducts[product.id] || 0
                          const isSelected = qty > 0
                          return (
                        <div
                          key={product.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelected
                              ? "border-primary/30 bg-info-muted/70 shadow-sm"
                              : "border-border hover:border-border"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className="text-xs">{product.code}</Badge>
                              <span className="text-xs text-muted-foreground">|</span>
                              <span className="text-xs text-muted-foreground">{product.stock} disp.</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {isSelected ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleProductQuantityChange(product.id, -1)}
                                  className="h-8 w-8 p-0 touch-manipulation border-primary/30 hover:bg-primary/10"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <div className="flex flex-col items-center w-10">
                                  <span className="text-sm font-bold text-primary leading-none">{qty}</span>
                                  <span className="text-[10px] text-primary/70 leading-tight">uds.</span>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleProductQuantityChange(product.id, 1)}
                                  disabled={qty >= (product.stock || 0)}
                                  className="h-8 w-8 p-0 touch-manipulation border-primary/30 hover:bg-primary/10"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleProductQuantityChange(product.id, 1)}
                                className="h-8 px-3 text-xs text-primary hover:text-primary hover:bg-info-muted touch-manipulation"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Agregar
                              </Button>
                            )}
                          </div>
                        </div>
                          )
                        })}
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

        {/* Diálogo de Edición - Información General */}
        <Dialog open={isEditGeneralDialogOpen} onOpenChange={setIsEditGeneralDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Editar Información General</DialogTitle>
              <DialogDescription>
                Modifica los datos generales del procedimiento.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-location">Ubicación</Label>
                  <Input
                    id="edit-location"
                    value={editGeneralData.location}
                    onChange={(e) => setEditGeneralData({...editGeneralData, location: e.target.value})}
                    placeholder="Ej: Quirófano 1"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-surgeon">Cirujano Líder</Label>
                  <Input
                    id="edit-surgeon"
                    value={editGeneralData.surgeon_name}
                    onChange={(e) => setEditGeneralData({...editGeneralData, surgeon_name: e.target.value})}
                    placeholder="Nombre del cirujano"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-assistant">Asistente</Label>
                <Input
                  id="edit-assistant"
                  value={editGeneralData.assistant_name}
                  onChange={(e) => setEditGeneralData({...editGeneralData, assistant_name: e.target.value})}
                  placeholder="Nombre del asistente"
                />
              </div>
              <div>
                <Label htmlFor="edit-diagnosis">Diagnóstico Preoperatorio</Label>
                <Textarea
                  id="edit-diagnosis"
                  value={editGeneralData.diagnosis}
                  onChange={(e) => setEditGeneralData({...editGeneralData, diagnosis: e.target.value})}
                  placeholder="Descripción del diagnóstico"
                  rows={3}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEditGeneralDialogOpen(false)}
                disabled={isUpdatingGeneral}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateGeneralInfo}
                disabled={isUpdatingGeneral || !editGeneralData.surgeon_name || !editGeneralData.diagnosis}
              >
                {isUpdatingGeneral ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Edición - Datos del Paciente */}
        <Dialog open={isEditPatientDialogOpen} onOpenChange={setIsEditPatientDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Editar Datos del Paciente</DialogTitle>
              <DialogDescription>
                Modifica los datos del paciente. Solo administradores pueden realizar esta acción.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-patient-name">Nombre Completo</Label>
                <Input
                  id="edit-patient-name"
                  value={editPatientData.name}
                  onChange={(e) => setEditPatientData({...editPatientData, name: e.target.value})}
                  placeholder="Nombre completo del paciente"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-patient-id">Identificación</Label>
                <Input
                  id="edit-patient-id"
                  value={editPatientData.identification}
                  onChange={(e) => setEditPatientData({...editPatientData, identification: e.target.value})}
                  placeholder="Número de identificación"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-patient-age">Edad</Label>
                <Input
                  id="edit-patient-age"
                  type="number"
                  value={editPatientData.age || ""}
                  onChange={(e) => setEditPatientData({...editPatientData, age: parseInt(e.target.value) || 0})}
                  placeholder="Edad en años"
                  min="0"
                  max="120"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEditPatientDialogOpen(false)}
                disabled={isUpdatingPatient}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdatePatientInfo}
                disabled={isUpdatingPatient || !editPatientData.name || !editPatientData.identification || !editPatientData.age}
              >
                {isUpdatingPatient ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
} 