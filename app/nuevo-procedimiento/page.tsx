"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Minus, Save } from "lucide-react"
import Link from "next/link"

// Datos de productos disponibles
const availableProducts = [
  { id: 1, name: "VAC Granufoam Small", code: "VGF-S", stock: 15 },
  { id: 2, name: "VAC Granufoam Medium", code: "VGF-M", stock: 2 },
  { id: 3, name: "VAC Granufoam Large", code: "VGF-L", stock: 8 },
  { id: 4, name: "VAC WhiteFoam Small", code: "VWF-S", stock: 12 },
  { id: 5, name: "VAC WhiteFoam Medium", code: "VWF-M", stock: 7 },
  { id: 6, name: "VAC WhiteFoam Large", code: "VWF-L", stock: 5 },
  { id: 7, name: "Canister 300ml", code: "CAN-300", stock: 3 },
  { id: 8, name: "Canister 500ml", code: "CAN-500", stock: 8 },
  { id: 9, name: "Tubing Set Standard", code: "TUB-STD", stock: 20 },
  { id: 10, name: "Drape Kit", code: "DRP-KIT", stock: 25 },
]

const npwtMachines = [
  { id: "NPWT-001", name: "VAC Therapy Unit 001", serial: "VTU001234" },
  { id: "NPWT-002", name: "VAC Therapy Unit 002", serial: "VTU002345" },
  { id: "NPWT-003", name: "VAC Therapy Unit 003", serial: "VTU003456" },
]

export default function NuevoProcedimiento() {
  const [selectedProducts, setSelectedProducts] = useState<{ [key: number]: number }>({})
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

  const handleProductQuantityChange = (productId: number, change: number) => {
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
                    {npwtMachines.map((machine) => (
                      <SelectItem key={machine.id} value={machine.id}>
                        {machine.name} (Serial: {machine.serial})
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
      </div>
    </div>
  )
}
