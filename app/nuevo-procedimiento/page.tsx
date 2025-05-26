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
import { supabase, type Machine, type InventoryProduct } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function NuevoProcedimiento() {
  const [selectedProducts, setSelectedProducts] = useState<{ [key: string]: number }>({})
  const [machines, setMachines] = useState<Machine[]>([])
  const [availableProducts, setAvailableProducts] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  
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
        supabase.from("machines").select("*").eq("status", "active").order("name", { ascending: true }),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Aquí iría la lógica para guardar el procedimiento
    console.log("Procedimiento guardado:", { formData, selectedProducts })
    alert("Procedimiento registrado exitosamente")
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
                        {machine.name} (Serial: {machine.serial_number})
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
                        <Badge variant={product.stock < 5 ? "destructive" : "secondary"}>Stock: {product.stock}</Badge>
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
                        disabled={selectedProducts[product.id] >= product.stock}
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
                <Button type="submit" className="min-w-32">
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Procedimiento
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
