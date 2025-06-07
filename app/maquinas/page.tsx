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
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Search, Settings, Plus, Edit, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { formatTimestampForColombia } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { usePermissions } from "@/hooks/use-permissions"

type Machine = Tables<"machines">

export default function Maquinas() {
  const [searchTerm, setSearchTerm] = useState("")
  const [machines, setMachines] = useState<Machine[]>([])
  const [machinesInUse, setMachinesInUse] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const { toast } = useToast()
  const permissions = usePermissions()

  // Modelos de máquinas NPWT disponibles con códigos de referencia
  const machineModels = [
    { code: "12236", name: "TopiVac Hand T-NPWT Classic" },
    { code: "12229", name: "TopiVac Hand T-NPWT Irrigation" }, 
    { code: "13066", name: "TopiVac Handy Careoxi NPWT" },
    { code: "12212", name: "TopiVac Medium Clinic V4" }
  ]

  // Formulario para nueva máquina
  const [newMachine, setNewMachine] = useState({
    lote: "",
    reference_code: "12236",
    model: "TopiVac Hand T-NPWT Classic",
    status: "active" as const,
    observations: "",
  })

  // Formulario para editar máquina
  const [editMachine, setEditMachine] = useState<Partial<Machine>>({})

  // Cargar máquinas desde la base de datos
  const loadMachines = async () => {
    try {
      setLoading(true)
      
      // Cargar máquinas y procedimientos activos en paralelo
      const [machinesResult, activeProceduresResult] = await Promise.all([
        supabase
          .from("machines")
          .select("*")
          .order("lote", { ascending: true }),
        supabase
          .from("procedures")
          .select("machine_id")
          .eq("status", "active")
      ])

      if (machinesResult.error) throw machinesResult.error
      if (activeProceduresResult.error) throw activeProceduresResult.error

      // Crear set de máquinas en uso
      const usedMachineIds = new Set(
        activeProceduresResult.data?.map(proc => proc.machine_id).filter((id): id is string => Boolean(id)) || []
      )

      setMachines(machinesResult.data || [])
      setMachinesInUse(usedMachineIds)
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

      // Recargar datos para actualizar estados
      await loadMachines()
      setIsCreateDialogOpen(false)
      setNewMachine({
        lote: "",
        reference_code: "12236",
        model: "TopiVac Hand T-NPWT Classic",
        status: "active",
        observations: "",
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

      // Recargar datos para actualizar estados
      await loadMachines()
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

      // Recargar datos para actualizar estados
      await loadMachines()
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
      machine.lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      machine.reference_code.toLowerCase().includes(searchTerm.toLowerCase())
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

  // Nueva función para mostrar el estado de uso
  const getUsageBadge = (machineId: string, machineStatus: string) => {
    // Solo mostrar estado de uso si la máquina está activa
    if (machineStatus !== "active") {
      return null
    }

    const isInUse = machinesInUse.has(machineId)
    
    if (isInUse) {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          En Uso
        </Badge>
      )
    } else {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          Disponible
        </Badge>
      )
    }
  }

  const openEditDialog = (machine: Machine) => {
    setSelectedMachine(machine)
    setEditMachine({
      lote: machine.lote,
      reference_code: machine.reference_code,
      model: machine.model,
      status: machine.status,
      observations: machine.observations,
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
                  <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
                  <Settings className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {machines.filter(m => m.status === "active" && !machinesInUse.has(m.id)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Listas para usar</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">En Uso</CardTitle>
                  <Settings className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-500">
                    {machines.filter(m => m.status === "active" && machinesInUse.has(m.id)).length}
                  </div>
                  <p className="text-xs text-muted-foreground">En procedimientos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Acciones</CardTitle>
                  <Plus className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  {permissions.canEditMachines ? (
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" className="w-full h-10 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium">
                          <Plus className="h-4 w-4 flex-shrink-0" />
                          <span className="whitespace-nowrap">Nueva Máquina</span>
                        </Button>
                      </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Crear Nueva Máquina</DialogTitle>
                        <DialogDescription>Registrar un nuevo equipo NPWT</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="lote">Lote</Label>
                          <Input
                            id="lote"
                            value={newMachine.lote}
                            onChange={(e) => setNewMachine({ ...newMachine, lote: e.target.value.toUpperCase() })}
                            placeholder="Ej: 1221110001"
                          />
                        </div>
                        <div>
                          <Label htmlFor="model">Modelo</Label>
                          <Select
                            value={newMachine.model}
                            onValueChange={(value) => {
                              const selectedModel = machineModels.find(m => m.name === value)
                              setNewMachine({ 
                                ...newMachine, 
                                model: value,
                                reference_code: selectedModel?.code || ""
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {machineModels.map((model) => (
                                <SelectItem key={model.code} value={model.name}>
                                  {model.code} - {model.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="observations">Observaciones</Label>
                          <Textarea
                            id="observations"
                            value={newMachine.observations}
                            onChange={(e) => setNewMachine({ ...newMachine, observations: e.target.value })}
                            placeholder="Observaciones importantes sobre la máquina..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleCreateMachine}
                          disabled={isCreating || !newMachine.lote}
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
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-gray-500">Solo administradores</p>
                      <p className="text-xs text-gray-400">pueden crear máquinas</p>
                    </div>
                  )}
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
                          <h3 className="text-lg font-semibold">{machine.model}</h3>
                          <Badge variant="outline">{machine.reference_code}</Badge>
                          {getUsageBadge(machine.id, machine.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Lote:</span> {machine.lote}
                          </div>
                          <div>
                            <span className="font-medium">Último Mantenimiento:</span> {machine.last_maintenance || "No registrado"}
                          </div>
                          <div>
                            <span className="font-medium">Observaciones:</span> {machine.observations || "Ninguna"}
                          </div>
                          <div>
                            <span className="font-medium">Estado:</span> {machine.status === "active" ? "Activa" : machine.status === "maintenance" ? "Mantenimiento" : "Inactiva"}
                          </div>
                          <div>
                            <span className="font-medium">Creada:</span> {machine.created_at ? formatTimestampForColombia(machine.created_at) : 'N/A'}
                          </div>
                        </div>
                      </div>
                      {permissions.canEditMachines && (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(machine)}
                          >
                            Editar
                          </Button>
                          {permissions.canDeleteMachines && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteMachine(machine.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
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
                  <Label htmlFor="edit_lote">Lote</Label>
                  <Input
                    id="edit_lote"
                    value={editMachine.lote || ""}
                    onChange={(e) => setEditMachine({ ...editMachine, lote: e.target.value.toUpperCase() })}
                    placeholder="Ej: 12236"
                  />
                </div>
                <div>
                  <Label htmlFor="edit_model">Modelo</Label>
                  <Select
                    value={editMachine.model || "TopiVac Hand T-NPWT Classic"}
                    onValueChange={(value) => {
                      const selectedModel = machineModels.find(m => m.name === value)
                      setEditMachine({ 
                        ...editMachine, 
                        model: value,
                        reference_code: selectedModel?.code || ""
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {machineModels.map((model) => (
                        <SelectItem key={model.code} value={model.name}>
                          {model.code} - {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="edit_observations">Observaciones</Label>
                  <Textarea
                    id="edit_observations"
                    value={editMachine.observations || ""}
                    onChange={(e) => setEditMachine({ ...editMachine, observations: e.target.value })}
                    placeholder="Observaciones importantes sobre la máquina..."
                    rows={3}
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
                  disabled={isUpdating || !editMachine.lote}
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