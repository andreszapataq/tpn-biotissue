"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Plus, Minus, Save, Loader2, Search, X } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"
import { InstitutionSwitcher } from "@/components/institutions/institution-switcher"
import { useInstitution } from "@/components/institutions/institution-provider"
import { getCurrentDateInColombia, getMachineDisplayName } from "@/lib/utils"

type Machine = Tables<"machines">
type InventoryProduct = Tables<"inventory_products">
type Patient = Tables<"patients">
type Procedure = Tables<"procedures">

export default function NuevoProcedimiento() {
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: number }>({})
  const [productSearch, setProductSearch] = useState("")
  const [machines, setMachines] = useState<Machine[]>([])
  const [availableProducts, setAvailableProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const { selectedInstitutionId } = useInstitution()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    date: getCurrentDateInColombia(),
    startTime: "",
    endTime: "",
    patientName: "",
    patientId: "",
    patientAge: "",
    surgeon: "",
    assistant: "",
    diagnosis: "",
    location: "",
    machines: [] as string[],
  })



  // Función helper para obtener el badge de estado de la máquina
  const getMachineStatusBadge = (isAvailable: boolean) => {
    if (isAvailable) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
          Disponible
        </Badge>
      )
    } else {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
          En Uso
        </Badge>
      )
    }
  }

  // Cargar datos desde Supabase
  const loadData = async () => {
    try {
      setLoading(true)
      if (!selectedInstitutionId) {
        setMachines([])
        setAvailableProducts([])
        return
      }
      
      const [machinesResult, productsResult, activeProcedureMachinesResult] = await Promise.all([
        supabase.from("machines").select("*").eq("institution_id", selectedInstitutionId).eq("status", "active").order("model", { ascending: true }),
        supabase.from("inventory_products").select("*").eq("institution_id", selectedInstitutionId).order("name", { ascending: true }),
        supabase.from("procedure_machines").select("machine_id, procedure:procedures!inner(status)").eq("institution_id", selectedInstitutionId).eq("procedure.status", "active")
      ])

      if (machinesResult.error) throw machinesResult.error
      if (productsResult.error) throw productsResult.error
      if (activeProcedureMachinesResult.error) throw activeProcedureMachinesResult.error

      // Obtener IDs de máquinas que están siendo usadas en procedimientos activos
      const usedMachineIds = new Set(
        activeProcedureMachinesResult.data?.map(pm => pm.machine_id).filter(Boolean) || []
      )

      // Filtrar máquinas disponibles (no en uso)
      const availableMachines = machinesResult.data?.filter(machine =>
        !usedMachineIds.has(machine.id)
      ) || []

      setMachines(availableMachines)
      setAvailableProducts(productsResult.data || [])
    } catch (error: any) {
      console.error("Error loading data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [selectedInstitutionId])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: "Error",
        description: "Usuario no autenticado",
        variant: "destructive",
      })
      return
    }

    // Validaciones básicas - La máquina ahora es opcional

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

    // 🛡️ PROTECCIÓN ANTI-DUPLICACIÓN: Evitar múltiples envíos simultáneos
    if (saving) {
      console.warn("⚠️ Procedure submission already in progress, ignoring duplicate request")
      toast({
        title: "Procesando",
        description: "Ya se está guardando el procedimiento, por favor espere...",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      console.log("🚀 Starting procedure save process...")
      
      // 🔒 Deshabilitar botón de envío para prevenir clicks múltiples
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (submitButton) {
        submitButton.disabled = true
      }

      // 1. Crear o buscar paciente
      console.log("👤 Searching for existing patient:", formData.patientId)
      let patient: Patient
      
      // Primero intentar buscar pacientes existentes
      const { data: existingPatients, error: searchError } = await supabase
        .from("patients")
        .select("*")
        .eq("institution_id", selectedInstitutionId || "")
        .eq("identification", formData.patientId)

      if (searchError) {
        console.error("❌ Error searching patients:", searchError)
        console.error("❌ Error searching patients - stringified:", JSON.stringify(searchError, null, 2))
        throw searchError
      }

      const existingPatient = existingPatients?.[0]

      if (existingPatient) {
        console.log("✅ Patient found, updating:", existingPatient.id)
        // Actualizar datos del paciente existente
        const { data: updatedPatient, error: updateError } = await supabase
          .from("patients")
          .update({
            name: formData.patientName,
            age: parseInt(formData.patientAge),
            status: "active",
            institution_id: selectedInstitutionId || undefined,
            updated_at: new Date().toISOString()
          })
          .eq("id", existingPatient.id)
          .select()
          .single()

        if (updateError) {
          console.error("❌ Error updating patient:", updateError)
          console.error("❌ Error updating patient - stringified:", JSON.stringify(updateError, null, 2))
          throw updateError
        }
        patient = updatedPatient
        console.log("✅ Patient updated successfully")
      } else {
        console.log("➕ Creating new patient with data:", {
          name: formData.patientName,
          identification: formData.patientId,
          age: parseInt(formData.patientAge),
          status: "active"
        })
        
        // Crear nuevo paciente
        const { data: newPatient, error: createError } = await supabase
          .from("patients")
          .insert({
            name: formData.patientName,
            identification: formData.patientId,
            age: parseInt(formData.patientAge),
            institution_id: selectedInstitutionId || undefined,
            status: "active"
          })
          .select()
          .single()

        if (createError) {
          console.error("❌ Error creating patient:", createError)
          console.error("❌ Error creating patient - stringified:", JSON.stringify(createError, null, 2))
          throw createError
        }
        
        patient = newPatient
        console.log("✅ Patient created successfully:", patient.id)
      }

      // 2. Obtener el ID del usuario en la tabla users
      console.log("👤 Getting user profile for auth_id:", user.id)
      let userProfile = null
      
      try {
        const { data, error: userError } = await supabase
          .from("users")
          .select("id, role")
          .eq("auth_id", user.id)
          .single()

        if (userError) {
          console.warn("⚠️ User profile not found, attempting to create one...")
          
          // Intentar crear el perfil si no existe
          const { data: newProfile, error: createError } = await supabase
            .from("users")
            .insert({
              auth_id: user.id,
              email: user.email,
              name: user.name || user.email,
              role: user.role || "soporte", // Usar el rol del contexto de auth
              is_active: true,
              mfa_enabled: false,
            })
            .select("id, role")
            .single()

          if (createError) {
            console.error("❌ Error creating user profile:", createError)
            console.log("⚠️ Continuing without user profile - will use null for created_by")
          } else {
            userProfile = newProfile
            console.log("✅ User profile created:", userProfile.id)
          }
        } else {
          userProfile = data
          console.log("✅ User profile found:", userProfile.id)
        }
      } catch (error) {
        console.error("❌ Unexpected error getting user profile:", error)
        console.log("⚠️ Continuing without user profile - will use null for created_by")
      }

      // 3. 🔍 Verificar si ya existe un procedimiento reciente para evitar duplicados
      console.log("🔍 Checking for recent procedures to prevent duplicates...")
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

      const { data: recentProcedures } = await supabase
        .from("procedures")
        .select("id, created_at")
        .eq("institution_id", selectedInstitutionId || "")
        .eq("patient_id", patient.id)
        .eq("surgeon_name", formData.surgeon)
        .eq("status", "active")
        .gte("created_at", fiveMinutesAgo)
        .order("created_at", { ascending: false })

      if (recentProcedures && recentProcedures.length > 0) {
        console.warn("⚠️ Recent procedure found, possible duplicate attempt")
        toast({
          title: "Procedimiento ya existe",
          description: "Ya existe un procedimiento reciente para este paciente y configuración.",
          variant: "destructive",
        })
        return
      }

      // 4. Crear procedimiento
      const procedureData: any = {
        institution_id: selectedInstitutionId || undefined,
        patient_id: patient.id,
        machine_id: formData.machines.length > 0 ? formData.machines[0] : null, // Primera máquina para backward compat
        surgeon_name: formData.surgeon,
        assistant_name: formData.assistant || null,
        procedure_date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime || null,
        diagnosis: formData.diagnosis,
        location: formData.location || null,
        status: "active"
      }

      // Solo agregar created_by si tenemos un usuario válido
      if (userProfile?.id) {
        procedureData.created_by = userProfile.id
      }

      console.log("📋 Creating procedure with data:", procedureData)

      const { data: procedure, error: procedureError } = await supabase
        .from("procedures")
        .insert(procedureData)
        .select()
        .single()

      if (procedureError) {
        console.error("❌ Error creating procedure:", procedureError)
        throw procedureError
      }
      console.log("✅ Procedure created successfully:", procedure.id)

      // 4.1 Insertar máquinas en la tabla procedure_machines
      if (formData.machines.length > 0) {
        const procedureMachines = formData.machines.map(machineId => ({
          procedure_id: procedure.id,
          machine_id: machineId,
          institution_id: selectedInstitutionId || "",
        }))

        const { error: pmError } = await supabase
          .from("procedure_machines")
          .insert(procedureMachines)

        if (pmError) {
          console.error("❌ Error inserting procedure_machines:", pmError)
          throw pmError
        }
        console.log("✅ Procedure machines inserted:", formData.machines.length)
      }

      // 5. Registrar productos utilizados y actualizar inventario
      console.log("📦 Processing inventory updates for products:", Object.keys(selectedProducts))
      const procedureProducts = []
      const inventoryMovements = []

      // 🔧 FIX: Actualizar stocks uno por uno para garantizar consistencia
      for (const [productId, quantity] of Object.entries(selectedProducts)) {
        const product = availableProducts.find(p => p.id === productId)
        if (!product) continue

        const newStock = (product.stock || 0) - quantity
        console.log(`📦 Product ${product.name}: ${product.stock} -> ${newStock} (used: ${quantity})`)

        // 🔧 FIX: Actualizar stock inmediatamente, no en batch
        console.log(`🔄 Updating stock for ${product.name}: ${product.stock} -> ${newStock}`)
        
        const { data: updatedProduct, error: stockError } = await supabase
          .from("inventory_products")
          .update({ 
            stock: newStock,
            updated_at: new Date().toISOString()
          })
          .eq("id", productId)
          .select("stock")
          .single()

        if (stockError) {
          console.error(`❌ CRITICAL ERROR updating stock for ${product.name}:`, stockError)
          toast({
            title: "Error Crítico",
            description: `No se pudo actualizar el stock de ${product.name}`,
            variant: "destructive",
          })
          throw stockError
        }
        
        console.log(`✅ Stock updated for ${product.name}: ${updatedProduct?.stock} (expected: ${newStock})`)
        
        // 📊 Log verificación de consistencia (sin lanzar error)
        if (updatedProduct?.stock !== newStock) {
          console.warn(`⚠️ STOCK INCONSISTENCY for ${product.name}: expected ${newStock}, got ${updatedProduct?.stock}`)
          console.warn(`⚠️ This might be due to concurrent operations, but update was successful`)
        } else {
          console.log(`✅ Stock consistency verified for ${product.name}`)
        }

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
          institution_id: selectedInstitutionId || undefined,
          notes: `Usado en procedimiento - Paciente: ${patient.name}`
        }
        
        // Solo agregar created_by si tenemos un usuario válido
        if (userProfile?.id) {
          movementData.created_by = userProfile.id
        }
        
        inventoryMovements.push(movementData)
      }

      // Insertar productos del procedimiento
      console.log("📋 Inserting procedure products...")
      const { error: procedureProductsError } = await supabase
        .from("procedure_products")
        .insert(procedureProducts)

      if (procedureProductsError) {
        console.error("❌ Error inserting procedure products:", procedureProductsError)
        throw procedureProductsError
      }
      console.log("✅ Procedure products inserted")

      // Insertar movimientos de inventario
      console.log("📊 Inserting inventory movements...")
      console.log("📊 Movements data:", JSON.stringify(inventoryMovements, null, 2))
      
      const { error: movementsError } = await supabase
        .from("inventory_movements")
        .insert(inventoryMovements)

      if (movementsError) {
        console.error("❌ Error inserting inventory movements:", JSON.stringify(movementsError, null, 2))
        throw movementsError
      }
      console.log("✅ Inventory movements inserted")

      toast({
        title: "Éxito",
        description: "Procedimiento registrado correctamente",
      })

      // Redirigir al dashboard
      router.push("/")

    } catch (error: any) {
      console.error("❌ CRITICAL ERROR saving procedure:", error)
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
      
      let errorMessage = "No se pudo guardar el procedimiento"
      
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
      
      // 🔓 Rehabilitar botón de envío
      const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement
      if (submitButton) {
        submitButton.disabled = false
      }
    }
  }

  return (
    <ProtectedRoute requiredRole={["administrador", "soporte", "asistente"]}>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al Dashboard
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Nuevo Procedimiento</h1>
                  <p className="text-gray-600">Registro de terapia de presión negativa</p>
                </div>
              </div>
              <InstitutionSwitcher />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset disabled={saving}>
          {/* Información del Procedimiento */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Procedimiento</CardTitle>
              <CardDescription>Fecha, hora y detalles básicos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="date">Fecha del Procedimiento</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="startTime">Hora de Inicio</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">Hora de Fin</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="UCI, Quirófano 3, Hab. 205..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datos del Paciente */}
          <Card>
            <CardHeader>
              <CardTitle>Datos del Paciente</CardTitle>
              <CardDescription>Información personal del paciente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="patientName">Nombre Completo</Label>
                  <Input
                    id="patientName"
                    value={formData.patientName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, patientName: e.target.value }))}
                    placeholder="Nombre completo del paciente"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="patientId">Identificación</Label>
                  <Input
                    id="patientId"
                    value={formData.patientId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, patientId: e.target.value }))}
                    placeholder="Número de identificación"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="patientAge">Edad</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    value={formData.patientAge}
                    onChange={(e) => setFormData((prev) => ({ ...prev, patientAge: e.target.value }))}
                    placeholder="Edad en años"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipo Médico */}
          <Card>
            <CardHeader>
              <CardTitle>Equipo Médico</CardTitle>
              <CardDescription>Personal médico responsable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="surgeon">Cirujano Líder</Label>
                  <Input
                    id="surgeon"
                    value={formData.surgeon}
                    onChange={(e) => setFormData((prev) => ({ ...prev, surgeon: e.target.value }))}
                    placeholder="Nombre del cirujano líder"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="assistant">Asistente</Label>
                  <Input
                    id="assistant"
                    value={formData.assistant}
                    onChange={(e) => setFormData((prev) => ({ ...prev, assistant: e.target.value }))}
                    placeholder="Nombre del asistente"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="diagnosis">Diagnóstico Preoperatorio</Label>
                <Textarea
                  id="diagnosis"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                  placeholder="Descripción del diagnóstico preoperatorio"
                  rows={3}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Máquinas NPWT */}
          <Card>
            <CardHeader>
              <CardTitle>Máquinas NPWT</CardTitle>
              <CardDescription>
                Seleccionar equipos utilizados si el procedimiento lo requiere • {machines.length} máquina{machines.length !== 1 ? 's' : ''} disponible{machines.length !== 1 ? 's' : ''}
                {formData.machines.length > 0 && (
                  <span className="ml-2 font-medium text-blue-700">
                    ({formData.machines.length} seleccionada{formData.machines.length !== 1 ? 's' : ''})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Máquinas Utilizadas</Label>
                {machines.length === 0 ? (
                  <div className="mt-2 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div className="flex items-center gap-2 text-blue-800">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">No hay máquinas disponibles</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      Todas las máquinas están en uso. Puede continuar sin máquina para procedimientos como colocación de apósitos.
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {machines.map((machine) => {
                      const isSelected = formData.machines.includes(machine.id)
                      return (
                        <label
                          key={machine.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "border-blue-500 bg-blue-50/60"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              setFormData((prev) => ({
                                ...prev,
                                machines: checked
                                  ? [...prev.machines, machine.id]
                                  : prev.machines.filter((id) => id !== machine.id),
                              }))
                            }}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-medium">{getMachineDisplayName(machine.model, machine.lote)}</span>
                            <Badge variant="outline" className="text-xs">
                              Lote: {machine.lote}
                            </Badge>
                            {getMachineStatusBadge(true)}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Productos Utilizados */}
          <Card>
            <CardHeader>
              <CardTitle>Productos Utilizados</CardTitle>
              <CardDescription>Seleccionar insumos y cantidades utilizadas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, código o lote..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {productSearch && (
                  <button
                    type="button"
                    onClick={() => setProductSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid gap-3">
                {availableProducts
                  .filter((product) => (product.stock || 0) > 0)
                  .filter((product) => {
                    if (!productSearch.trim()) return true
                    const search = productSearch.toLowerCase()
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
                        ? "border-blue-300 bg-blue-50/70 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{product.name}</span>
                        <Badge variant="outline">{product.code}</Badge>
                        <span className="text-xs text-gray-500">{product.stock} disp.</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Lote:</span> <span className={`font-semibold ${product.lote ? 'text-blue-600' : 'text-gray-500'}`}>{product.lote || "N/A"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {isSelected ? (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleProductQuantityChange(product.id, -1)}
                            className="border-blue-300 hover:bg-blue-100"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="flex flex-col items-center w-10">
                            <span className="text-sm font-bold text-blue-700 leading-none">{qty}</span>
                            <span className="text-[10px] text-blue-500 leading-tight">uds.</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleProductQuantityChange(product.id, 1)}
                            disabled={qty >= (product.stock || 0)}
                            className="border-blue-300 hover:bg-blue-100"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleProductQuantityChange(product.id, 1)}
                          className="px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
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
            </CardContent>
          </Card>

              {/* Botones de Acción */}
              <div className="flex gap-4 justify-end">
                <Link href="/">
                  <Button variant="outline">Cancelar</Button>
                </Link>
                <Button
                  type="submit"
                  className="min-w-32"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Procedimiento
                    </>
                  )}
                </Button>
              </div>
              </fieldset>
            </form>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
