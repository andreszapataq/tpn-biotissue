"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Settings, Plus, Edit, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"

interface Machine {
  id: string
  name: string
  serial_number: string
  model: string
  status: "active" | "maintenance" | "inactive"
  location?: string
  purchase_date?: string
  last_maintenance?: string
  created_at: string
  updated_at: string
}

export default function Maquinas() {
  const [searchTerm, setSearchTerm] = useState("")
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const { toast } = useToast()

  // Formulario para nueva máquina
  const [newMachine, setNewMachine] = useState({
    name: "",
    serial_number: "",
    model: "VAC Therapy Unit",
    status: "active" as const,
    location: "",
    purchase_date: "",
  })

  // Formulario para editar máquina
  const [editMachine, setEditMachine] = useState<Partial<Machine>>({})

  // Cargar máquinas desde la base de datos
  const loadMachines = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("machines")
        .select("*")
        .order("name", { ascending: true })

      if (error) throw error

      setMachines(data || [])
    } catch (error: any) {
      console.error("Error loading machines:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las máquinas",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMachines()
  }, [])

  // Crear nueva máquina
  const handleCreateMachine = async () => {
    try {
      setIsCreating(true)

      const { data, error } = await supabase
        .from("machines")
        .insert([newMachine])
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Máquina creada correctamente",
      })

      setMachines([...machines, data])
      setIsCreateDialogOpen(false)
      setNewMachine({
        name: "",
        serial_number: "",
        model: "VAC Therapy Unit",
        status: "active",
        location: "",
        purchase_date: "",
      })
    } catch (error: any) {
      console.error("Error creating machine:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la máquina",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Actualizar máquina
  const handleUpdateMachine = async () => {
    if (!selectedMachine) return

    try {
      setIsUpdating(true)

      const { data, error } = await supabase
        .from("machines")
        .update({ ...editMachine, updated_at: new Date().toISOString() })
        .eq("id", selectedMachine.id)
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Máquina actualizada correctamente",
      })

      setMachines(machines.map((machine) => 
        machine.id === selectedMachine.id ? data : machine
      ))
      setIsEditDialogOpen(false)
      setSelectedMachine(null)
      setEditMachine({})
    } catch (error: any) {
      console.error("Error updating machine:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la máquina",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  // Eliminar máquina
  const handleDeleteMachine = async (machineId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta máquina?")) return

    try {
      const { error } = await supabase
        .from("machines")
        .delete()
        .eq("id", machineId)

      if (error) throw error

      toast({
        title: "Éxito",
        description: "Máquina eliminada correctamente",
      })

      setMachines(machines.filter((machine) => machine.id !== machineId))
    } catch (error: any) {
      console.error("Error deleting machine:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la máquina",
        variant: "destructive",
      })
    }
  }

  // Filtrar máquinas
  const filteredMachines = machines.filter(
    (machine) =>
      machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.model.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Activa</Badge>
      case "maintenance":
        return <Badge variant="secondary">Mantenimiento</Badge>
      case "inactive":
        return <Badge variant="destructive">Inactiva</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const openEditDialog = (machine: Machine) => {
    setSelectedMachine(machine)
    setEditMachine({
      name: machine.name,
      serial_number: machine.serial_number,
      model: machine.model,
      status: machine.status,
      location: machine.location,
      purchase_date: machine.purchase_date,
      last_maintenance: machine.last_maintenance,
    })
    setIsEditDialogOpen(true)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
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
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Máquinas</h1>
                <p className="text-gray-600">Control y administración de equipos NPWT</p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Máquinas</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{machines.length}</div>
                  <p className="text-xs text-muted-foreground">Equipos registrados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Activas</CardTitle>
                  <Settings className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {machines.filter(m => m.status === "active").length}
                  </div>
                  <p className="text-xs text-muted-foreground">En funcionamiento</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Mantenimiento</CardTitle>
                  <Settings className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {machines.filter(m => m.status === "maintenance").length}
                  </div>
                  <p className="text-xs text-muted-foreground">En mantenimiento</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Acciones</CardTitle>
                  <Plus className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-1" />
                        Nueva Máquina
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear Nueva Máquina</DialogTitle>
                        <DialogDescription>Registrar un nuevo equipo NPWT</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="name">Nombre de la Máquina</Label>
                          <Input
                            id="name"
                            value={newMachine.name}
                            onChange={(e) => setNewMachine({ ...newMachine, name: e.target.value })}
                            placeholder="Ej: VAC Therapy Unit 001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="serial_number">Número de Serie</Label>
                          <Input
                            id="serial_number"
                            value={newMachine.serial_number}
                            onChange={(e) => setNewMachine({ ...newMachine, serial_number: e.target.value.toUpperCase() })}
                            placeholder="Ej: VTU001234"
                          />
                        </div>
                        <div>
                          <Label htmlFor="model">Modelo</Label>
                          <Select
                            value={newMachine.model}
                            onValueChange={(value) => setNewMachine({ ...newMachine, model: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="VAC Therapy Unit">VAC Therapy Unit</SelectItem>
                              <SelectItem value="NPWT-1">NPWT-1</SelectItem>
                              <SelectItem value="NPWT-2">NPWT-2</SelectItem>
                              <SelectItem value="Otro">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="location">Ubicación</Label>
                          <Input
                            id="location"
                            value={newMachine.location}
                            onChange={(e) => setNewMachine({ ...newMachine, location: e.target.value })}
                            placeholder="Ej: Quirófano 1, Sala de Cirugía"
                          />
                        </div>
                        <div>
                          <Label htmlFor="purchase_date">Fecha de Compra</Label>
                          <Input
                            id="purchase_date"
                            type="date"
                            value={newMachine.purchase_date}
                            onChange={(e) => setNewMachine({ ...newMachine, purchase_date: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateMachine}
                          disabled={isCreating || !newMachine.name || !newMachine.serial_number}
                        >
                          {isCreating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creando...
                            </>
                          ) : (
                            "Crear Máquina"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar máquinas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Machines List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredMachines.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Settings className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No hay máquinas registradas</p>
                <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primera Máquina
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredMachines.map((machine) => (
                <Card key={machine.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{machine.name}</h3>
                          <Badge variant="outline">{machine.serial_number}</Badge>
                          {getStatusBadge(machine.status)}
                          <Badge variant="secondary">{machine.model}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Ubicación:</span> {machine.location || "No especificada"}
                          </div>
                          <div>
                            <span className="font-medium">Fecha de Compra:</span> {machine.purchase_date || "No especificada"}
                          </div>
                          <div>
                            <span className="font-medium">Último Mantenimiento:</span> {machine.last_maintenance || "No registrado"}
                          </div>
                          <div>
                            <span className="font-medium">Creada:</span> {new Date(machine.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(machine)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteMachine(machine.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Edit Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Máquina</DialogTitle>
                <DialogDescription>Actualizar información de la máquina</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit_name">Nombre de la Máquina</Label>
                  <Input
                    id="edit_name"
                    value={editMachine.name || ""}
                    onChange={(e) => setEditMachine({ ...editMachine, name: e.target.value })}
                    placeholder="Ej: VAC Therapy Unit 001"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_serial_number">Número de Serie</Label>
                  <Input
                    id="edit_serial_number"
                    value={editMachine.serial_number || ""}
                    onChange={(e) => setEditMachine({ ...editMachine, serial_number: e.target.value.toUpperCase() })}
                    placeholder="Ej: VTU001234"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_status">Estado</Label>
                  <Select
                    value={editMachine.status || "active"}
                    onValueChange={(value) => setEditMachine({ ...editMachine, status: value as Machine["status"] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="maintenance">Mantenimiento</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_location">Ubicación</Label>
                  <Input
                    id="edit_location"
                    value={editMachine.location || ""}
                    onChange={(e) => setEditMachine({ ...editMachine, location: e.target.value })}
                    placeholder="Ej: Quirófano 1, Sala de Cirugía"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_last_maintenance">Último Mantenimiento</Label>
                  <Input
                    id="edit_last_maintenance"
                    type="date"
                    value={editMachine.last_maintenance || ""}
                    onChange={(e) => setEditMachine({ ...editMachine, last_maintenance: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateMachine}
                  disabled={isUpdating || !editMachine.name || !editMachine.serial_number}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Actualizar Máquina"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProtectedRoute>
  )
} 