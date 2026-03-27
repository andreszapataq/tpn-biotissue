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
import { Search, Settings, Plus, Edit, Trash2, Loader2, Filter } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Tables } from "@/lib/database.types"
import { formatTimestampForColombia, getMachineDisplayName } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { InstitutionSwitcher } from "@/components/institutions/institution-switcher"
import { useInstitution } from "@/components/institutions/institution-provider"
import { usePermissions } from "@/hooks/use-permissions"
import { PageHeader } from "@/components/ui/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { KpiCard } from "@/components/ui/kpi-card"

type Machine = Tables<"machines">

export default function Maquinas() {
  const [searchTerm, setSearchTerm] = useState("")
  const [availabilityFilter, setAvailabilityFilter] = useState("all") // "all", "available", "in_use"
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
  const { selectedInstitutionId } = useInstitution()

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
    remision: "",
    observations: "",
  })

  // Formulario para editar máquina
  const [editMachine, setEditMachine] = useState<Partial<Machine>>({})

  // Cargar máquinas desde la base de datos
  const loadMachines = async () => {
    try {
      setLoading(true)
      if (!selectedInstitutionId) {
        setMachines([])
        setMachinesInUse(new Set())
        return
      }
      
      // Cargar máquinas y máquinas en uso via procedure_machines
      const [machinesResult, activeProcedureMachinesResult] = await Promise.all([
        supabase
          .from("machines")
          .select("*")
          .eq("institution_id", selectedInstitutionId)
          .order("lote", { ascending: true }),
        supabase
          .from("procedure_machines")
          .select("machine_id, procedure:procedures!inner(status)")
          .eq("institution_id", selectedInstitutionId)
          .eq("procedure.status", "active")
      ])

      if (machinesResult.error) throw machinesResult.error
      if (activeProcedureMachinesResult.error) throw activeProcedureMachinesResult.error

      // Crear set de máquinas en uso
      const usedMachineIds = new Set(
        activeProcedureMachinesResult.data?.map(pm => pm.machine_id).filter((id): id is string => Boolean(id)) || []
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
    void loadMachines()
  }, [selectedInstitutionId])

  // Crear nueva máquina
  const handleCreateMachine = async () => {
    try {
      setIsCreating(true)

      const { data, error } = await supabase
        .from("machines")
        .insert([{ ...newMachine, institution_id: selectedInstitutionId || undefined }])
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
        remision: "",
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
    // Verificar si la máquina está siendo usada en procedimientos (via procedure_machines)
    const { data: pmData } = await supabase
      .from("procedure_machines")
      .select("procedure_id, procedure:procedures!inner(id, status, procedure_date, patient:patients(name))")
      .eq("machine_id", machineId)

    const procedures = pmData?.map((pm: any) => pm.procedure) || []

    // Fallback: también verificar via legacy machine_id
    if (procedures.length === 0) {
      const { data: legacyProcs } = await supabase
        .from("procedures")
        .select("id, patient:patients(name), procedure_date, status")
        .eq("machine_id", machineId)
      if (legacyProcs && legacyProcs.length > 0) {
        procedures.push(...legacyProcs)
      }
    }

    if (procedures && procedures.length > 0) {
      const activeProcedures = procedures.filter(p => p.status === "active")
      const completedProcedures = procedures.filter(p => p.status === "completed")

      // Si hay procedimientos asociados, ofrecer marcar como fuera de sede en lugar de eliminar
      const message = activeProcedures.length > 0
        ? `Esta máquina tiene ${activeProcedures.length} procedimiento(s) ACTIVO(S).\n\n¿Deseas marcarla como FUERA DE SEDE para preservar el historial médico?\n\n✅ Recomendado: Mantiene el historial\n❌ No se perderán datos médicos`
        : `Esta máquina tiene ${completedProcedures.length} procedimiento(s) en el historial.\n\n¿Deseas marcarla como FUERA DE SEDE para preservar el historial médico?\n\n✅ Recomendado: Mantiene el historial\n❌ No se perderán datos médicos`
      
      if (confirm(message)) {
        await handleInactivateMachine(machineId)
      }
      return
    }

    // Si no hay procedimientos, permitir eliminación física
    if (!confirm("Esta máquina no tiene procedimientos asociados.\n\n¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE esta máquina?")) return

    try {
      const { error } = await supabase
        .from("machines")
        .delete()
        .eq("id", machineId)

      if (error) {
        if (error.code === "23503" || error.message?.includes("still referenced")) {
          toast({
            title: "Error de Integridad",
            description: "Esta máquina está siendo referenciada por otros registros. Se marcará como fuera de sede.",
            variant: "destructive",
          })
          await handleInactivateMachine(machineId)
          return
        }
        throw error
      }

      toast({
        title: "Éxito",
        description: "Máquina eliminada permanentemente",
      })

      await loadMachines()
    } catch (error: any) {
      console.error("Error deleting machine:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar. Se marcará la máquina como fuera de sede.",
        variant: "destructive",
      })
      await handleInactivateMachine(machineId)
    }
  }

  const handleInactivateMachine = async (machineId: string) => {
    try {
      const { error } = await supabase
        .from("machines")
        .update({ 
          status: "inactive",
          updated_at: new Date().toISOString()
        })
        .eq("id", machineId)

      if (error) throw error

      toast({
        title: "Máquina Fuera de Sede",
        description: "La máquina se marcó como fuera de sede. El historial médico se preservó.",
        variant: "default",
      })

      await loadMachines()
    } catch (error: any) {
      console.error("Error inactivating machine:", error)
      toast({
        title: "Error",
        description: "No se pudo marcar la máquina como fuera de sede",
        variant: "destructive",
      })
    }
  }

  // Reactivar máquina
  const handleReactivateMachine = async (machineId: string) => {
    if (!confirm("¿Estás seguro de que quieres reincorporar esta máquina a la sede?")) return

    try {
      const { error } = await supabase
        .from("machines")
        .update({ 
          status: "active",
          updated_at: new Date().toISOString()
        })
        .eq("id", machineId)

      if (error) throw error

      toast({
        title: "Máquina Reincorporada",
        description: "La máquina está de vuelta en sede y disponible para nuevos procedimientos",
      })

      await loadMachines()
    } catch (error: any) {
      console.error("Error reactivating machine:", error)
      toast({
        title: "Error",
        description: "No se pudo reactivar la máquina",
        variant: "destructive",
      })
    }
  }

  // Filtrar máquinas
  const filteredMachines = machines.filter(
    (machine) => {
      // Filtro por texto de búsqueda
      const matchesSearch = machine.lote.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.reference_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (machine.remision || "").toLowerCase().includes(searchTerm.toLowerCase())

      // Filtro por disponibilidad/estado
      const isAvailable = machine.status === "active" && !machinesInUse.has(machine.id)
      const isInUse = machine.status === "active" && machinesInUse.has(machine.id)
      const isInMaintenance = machine.status === "maintenance"
      
      let matchesAvailability = true
      if (availabilityFilter === "available") {
        matchesAvailability = isAvailable
      } else if (availabilityFilter === "in_use") {
        matchesAvailability = isInUse
      } else if (availabilityFilter === "maintenance") {
        matchesAvailability = isInMaintenance
      } else if (availabilityFilter === "inactive") {
        matchesAvailability = machine.status === "inactive"
      }

      return matchesSearch && matchesAvailability
    }
  )

  const getUsageBadge = (machineId: string, machineStatus: string) => {
    // Solo mostrar estado de uso si la máquina está activa
    if (machineStatus !== "active") {
      if (machineStatus === "maintenance") return <StatusBadge status="maintenance" />
      if (machineStatus === "inactive") return <StatusBadge status="off_site" label="Fuera de Sede" />
      return null
    }

    const isInUse = machinesInUse.has(machineId)

    if (isInUse) {
      return <StatusBadge status="in_use" />
    } else {
      return <StatusBadge status="available" />
    }
  }

  const openEditDialog = (machine: Machine) => {
    setSelectedMachine(machine)
    setEditMachine({
      lote: machine.lote,
      reference_code: machine.reference_code,
      model: machine.model,
      status: machine.status,
      remision: machine.remision,
      observations: machine.observations,
      last_maintenance: machine.last_maintenance,
    })
    setIsEditDialogOpen(true)
  }

  return (
    <ProtectedRoute requiredRole={["administrador", "soporte", "asistente"]}>
      <div className="page-shell">
        <div className="page-container-medium">
          {/* Header */}
          <div>
            <PageHeader
              title="Gestión de Máquinas"
              subtitle="Control y administración de equipos NPWT"
              backHref="/"
              actions={<InstitutionSwitcher />}
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              <KpiCard
                title="Capacidad Operativa"
                value={machines.filter(m => m.status === "active" || m.status === "maintenance").length}
                subtitle="Máquinas en servicio"
                icon={Settings}
              />

              <KpiCard
                title="Disponibles"
                value={machines.filter(m => m.status === "active" && !machinesInUse.has(m.id)).length}
                subtitle="Listas para usar"
                icon={Settings}
                iconColor="text-success"
                iconBg="bg-success/10"
              />

              <KpiCard
                title="En Uso"
                value={machines.filter(m => m.status === "active" && machinesInUse.has(m.id)).length}
                subtitle="En procedimientos"
                icon={Settings}
                iconColor="text-warning"
                iconBg="bg-warning/10"
              />

              <KpiCard
                title="Mantenimiento"
                value={machines.filter(m => m.status === "maintenance").length}
                subtitle="En mantenimiento"
                icon={Settings}
                iconColor="text-warning"
                iconBg="bg-warning/10"
              />

              <KpiCard
                title="Fuera de Sede"
                value={machines.filter(m => m.status === "inactive").length}
                subtitle="Máquinas retiradas"
                icon={Trash2}
                iconColor="text-neutral"
                iconBg="bg-neutral/10"
              />
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex gap-4 flex-1 max-w-2xl">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar máquinas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 z-10" />
                  <Select value={availabilityFilter} onValueChange={setAvailabilityFilter}>
                    <SelectTrigger className="w-48 pl-10">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las máquinas</SelectItem>
                      <SelectItem value="available">Solo disponibles</SelectItem>
                      <SelectItem value="in_use">Solo en uso</SelectItem>
                      <SelectItem value="maintenance">En mantenimiento</SelectItem>
                      <SelectItem value="inactive">Fuera de sede</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Botón Nueva Máquina integrado en los filtros */}
              {permissions.canEditMachines && (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="default" className="shrink-0 w-full sm:w-auto">
                      <Plus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Nueva Máquina</span>
                      <span className="sm:hidden">Nueva</span>
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
                        <Label htmlFor="remision">Remisión</Label>
                        <Input
                          id="remision"
                          value={newMachine.remision}
                          onChange={(e) => setNewMachine({ ...newMachine, remision: e.target.value.toUpperCase() })}
                          placeholder="Ej: REM-2026-001"
                        />
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
                      <Button onClick={handleCreateMachine} disabled={!newMachine.lote || !newMachine.model}>
                        Crear Máquina
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          {/* Machines List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMachines.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay máquinas registradas</p>
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
                          <h3 className="text-lg font-semibold">{getMachineDisplayName(machine.model, machine.lote)}</h3>
                          <Badge variant="outline">{machine.reference_code}</Badge>
                          {getUsageBadge(machine.id, machine.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Lote:</span> {machine.lote}
                          </div>
                          <div>
                            <span className="font-medium">Remisión:</span> {machine.remision || "Sin remisión"}
                          </div>
                          <div>
                            <span className="font-medium">Último Mantenimiento:</span> {machine.last_maintenance || "No registrado"}
                          </div>
                          <div>
                            <span className="font-medium">Observaciones:</span> {machine.observations || "Ninguna"}
                          </div>
                          <div>
                            <span className="font-medium">Estado:</span> {machine.status === "active" ? "Activa" : machine.status === "maintenance" ? "Mantenimiento" : "Fuera de Sede"}
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
                          
                          {/* Mostrar botón de reactivar para máquinas inactivas */}
                          {machine.status === "inactive" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReactivateMachine(machine.id)}
                              className="text-success hover:text-success/80"
                            >
                              Reincorporar
                            </Button>
                          ) : (
                            /* Mostrar botón de eliminar/inactivar para máquinas activas */
                            permissions.canDeleteMachines && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteMachine(machine.id)}
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )
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
                      <SelectItem value="maintenance">En Mantenimiento</SelectItem>
                      <SelectItem value="inactive">Fuera de Sede</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit_remision">Remisión</Label>
                  <Input
                    id="edit_remision"
                    value={editMachine.remision || ""}
                    onChange={(e) => setEditMachine({ ...editMachine, remision: e.target.value.toUpperCase() })}
                    placeholder="Ej: REM-2026-001"
                  />
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