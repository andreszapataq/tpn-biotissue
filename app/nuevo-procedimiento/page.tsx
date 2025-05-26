"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, Save, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { useRouter } from "next/navigation"

type Machine = Tables<"machines">
type InventoryProduct = Tables<"inventory_products">
type Patient = Tables<"patients">
type Procedure = Tables<"procedures">
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/components/auth/auth-provider"

export default function NuevoProcedimiento() {
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: number }>({})
  const [machines, setMachines] = useState<Machine[]>([])
  const [availableProducts, setAvailableProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    startTime: "",
    endTime: "",
    patientName: "",
    patientId: "",
    patientAge: "",
    surgeon: "",
    assistant: "",
    diagnosis: "",
    machine: "",
  })

  // Cargar datos desde Supabase
  const loadData = async () => {
    try {
      setLoading(true)
      
      const [machinesResult, productsResult] = await Promise.all([
        supabase.from("machines").select("*").eq("status", "active").order("model", { ascending: true }),
        supabase.from("inventory_products").select("*").order("name", { ascending: true })
      ])

      if (machinesResult.error) throw machinesResult.error
      if (productsResult.error) throw productsResult.error

      setMachines(machinesResult.data || [])
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
    loadData()
  }, [])

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

    // Validaciones básicas
    if (!formData.machine) {
      toast({
        title: "Error",
        description: "Debe seleccionar una máquina",
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
      console.log("🚀 Starting procedure save process...")

      // 1. Crear o buscar paciente
      console.log("👤 Searching for existing patient:", formData.patientId)
      let patient: Patient
      
      // Primero intentar buscar pacientes existentes
      const { data: existingPatients, error: searchError } = await supabase
        .from("patients")
        .select("*")
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
      const { data: userProfile, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single()

      if (userError) {
        console.error("❌ Error getting user profile:", JSON.stringify(userError, null, 2))
        console.log("⚠️ Continuing without user profile - will use null for created_by")
      }
      console.log("✅ User profile:", userProfile?.id || "not found")

      // 3. Crear procedimiento
      const procedureData: any = {
        patient_id: patient.id,
        machine_id: formData.machine,
        surgeon_name: formData.surgeon,
        assistant_name: formData.assistant || null,
        procedure_date: formData.date,
        start_time: formData.startTime,
        end_time: formData.endTime || null,
        diagnosis: formData.diagnosis,
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

      // 4. Registrar productos utilizados y actualizar inventario
      console.log("📦 Processing inventory updates for products:", Object.keys(selectedProducts))
      const productUpdates = []
      const procedureProducts = []
      const inventoryMovements = []

      for (const [productId, quantity] of Object.entries(selectedProducts)) {
        const product = availableProducts.find(p => p.id === productId)
        if (!product) continue

        const newStock = (product.stock || 0) - quantity
        console.log(`📦 Product ${product.name}: ${product.stock} -> ${newStock} (used: ${quantity})`)

        // Actualizar stock del producto
        productUpdates.push(
          supabase
            .from("inventory_products")
            .update({ 
              stock: newStock,
              updated_at: new Date().toISOString()
            })
            .eq("id", productId)
        )

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
          notes: `Usado en procedimiento - Paciente: ${patient.name}`
        }
        
        // Solo agregar created_by si tenemos un usuario válido
        if (userProfile?.id) {
          movementData.created_by = userProfile.id
        }
        
        inventoryMovements.push(movementData)
      }

      // Ejecutar todas las actualizaciones
      console.log("📦 Updating product stocks...")
      const updateResults = await Promise.all(productUpdates)
      console.log("✅ Stock updates completed")

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
      console.error("Error saving procedure:", error)
      console.error("Error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      toast({
        title: "Error",
        description: error.message || error.details || "No se pudo guardar el procedimiento",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
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
                <h1 className="text-3xl font-bold text-gray-900">Nuevo Procedimiento</h1>
                <p className="text-gray-600">Registro de terapia de presión negativa</p>
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Máquina NPWT */}
          <Card>
            <CardHeader>
              <CardTitle>Máquina NPWT</CardTitle>
              <CardDescription>Seleccionar equipo utilizado</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="machine">Máquina Utilizada</Label>
                <Select
                  value={formData.machine}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, machine: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar máquina NPWT" />
                  </SelectTrigger>
                  <SelectContent>
                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.model} (Lote: {machine.lote})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <div className="grid gap-4">
                {availableProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.name}</span>
                        <Badge variant="outline">{product.code}</Badge>
                        <Badge variant={(product.stock || 0) < 5 ? "destructive" : "secondary"}>Stock: {product.stock || 0}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleProductQuantityChange(product.id, -1)}
                        disabled={!selectedProducts[product.id]}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{selectedProducts[product.id] || 0}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleProductQuantityChange(product.id, 1)}
                        disabled={selectedProducts[product.id] >= (product.stock || 0)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

              {/* Botones de Acción */}
              <div className="flex gap-4 justify-end">
                <Link href="/">
                  <Button variant="outline">Cancelar</Button>
                </Link>
                <Button type="submit" className="min-w-32" disabled={saving}>
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
