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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, Settings, Plus, Trash2, Loader2, Filter, ArrowRightLeft, History, X } from "lucide-react"
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
import { TransferDialog } from "@/components/machines/transfer-dialog"
import { MACHINE_MODELS } from "@/lib/constants"

type Machine = Tables<"machines">

interface TransferHistoryEntry {
  id: string
  machine_id: string
  from_institution_id: string | null
  to_institution_id: string
  transfer_date: string
  remision: string | null
  notes: string | null
  created_at: string
  machine: { lote: string; model: string } | null
  from_institution: { name: string } | null
  to_institution: { name: string } | null
  transferred_by_user: { name: string } | null
}

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
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const [transferMachine, setTransferMachine] = useState<Machine | null>(null)
  const [transferHistory, setTransferHistory] = useState<TransferHistoryEntry[]>([])
  const [showTransferHistory, setShowTransferHistory] = useState(false)
  const [machineToRetire, setMachineToRetire] = useState<string | null>(null)
  const { toast } = useToast()
  const permissions = usePermissions()
  const { selectedInstitutionId, selectedInstitutionName, availableInstitutions } = useInstitution()
  const currentInstitutionCode = availableInstitutions.find(i => i.id === selectedInstitutionId)?.code || ""
  const isBodega = currentInstitutionCode === "bodega-biotissue"

  // Modelos de máquinas NPWT disponibles con códigos de referencia
  const machineModels = MACHINE_MODELS



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
          .neq("status", "inactive")
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

  // Cargar historial de transferencias
  const loadTransferHistory = async () => {
    if (!selectedInstitutionId) return

    const { data, error } = await supabase
      .from("machine_transfers")
      .select(`
        *,
        machine:machines(lote, model),
        from_institution:institutions!machine_transfers_from_institution_id_fkey(name),
        to_institution:institutions!machine_transfers_to_institution_id_fkey(name),
        transferred_by_user:users!machine_transfers_transferred_by_fkey(name)
      `)
      .or(`from_institution_id.eq.${selectedInstitutionId},to_institution_id.eq.${selectedInstitutionId}`)
      .order("transfer_date", { ascending: false })
      .limit(50)

    if (!error && data) {
      setTransferHistory(data as unknown as TransferHistoryEntry[])
    }
  }

  useEffect(() => {
    if (showTransferHistory) {
      void loadTransferHistory()
    }
  }, [showTransferHistory, selectedInstitutionId])

  const openTransferDialog = (machine: Machine) => {
    setTransferMachine(machine)
    setIsTransferDialogOpen(true)
  }

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
        observations: "",
      })
    } catch (error: any) {
      console.error("Error creating machine:", error)
      const description = error?.code === "23505"
        ? "Ya existe una máquina con ese número de lote"
        : error.message || "No se pudo crear la máquina"
      toast({
        title: "Error",
        description,
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

  // Retirar máquina (soft delete — solo desde Bodega)
  const handleRetireMachine = async () => {
    if (!machineToRetire) return

    try {
      const { error } = await supabase
        .from("machines")
        .update({
          status: "inactive",
          updated_at: new Date().toISOString(),
        })
        .eq("id", machineToRetire)

      if (error) throw error

      toast({
        title: "Máquina Retirada",
        description: "La máquina fue retirada del inventario. El historial se preservó.",
      })

      await loadMachines()
    } catch (error: any) {
      console.error("Error retiring machine:", error)
      toast({
        title: "Error",
        description: "No se pudo retirar la máquina",
        variant: "destructive",
      })
    } finally {
      setMachineToRetire(null)
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
      }

      return matchesSearch && matchesAvailability
    }
  )

  const getUsageBadge = (machineId: string, machineStatus: string) => {
    if (machineStatus === "maintenance") return <StatusBadge status="maintenance" />
    if (machineStatus !== "active") return null

    return machinesInUse.has(machineId)
      ? <StatusBadge status="in_use" />
      : <StatusBadge status="available" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <KpiCard
                title="Total"
                value={machines.length}
                subtitle="Máquinas en sede"
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
                    className="pl-10 pr-9"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
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
                              <SelectItem key={model.name} value={model.name}>
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
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
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
                            <span className="font-medium">Estado:</span> {machine.status === "active" ? "Activa" : "Mantenimiento"}
                          </div>
                          <div>
                            <span className="font-medium">Creada:</span> {machine.created_at ? formatTimestampForColombia(machine.created_at) : 'N/A'}
                          </div>
                        </div>
                      </div>
                      {permissions.canEditMachines && (
                        <div className="flex items-center gap-2">
                          {availableInstitutions.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openTransferDialog(machine)}
                            >
                              <ArrowRightLeft className="h-3 w-3 mr-1" />
                              Transferir
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(machine)}
                          >
                            Editar
                          </Button>
                          
                          {/* Retirar máquina — solo visible desde Bodega */}
                          {isBodega && permissions.canDeleteMachines && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMachineToRetire(machine.id)}
                              className="text-destructive hover:text-destructive/80"
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
                        <SelectItem key={model.name} value={model.name}>
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

          {/* Transfer Dialog */}
          <TransferDialog
            machine={transferMachine}
            currentInstitutionId={selectedInstitutionId || ""}
            currentInstitutionName={selectedInstitutionName || ""}
            availableInstitutions={availableInstitutions}
            open={isTransferDialogOpen}
            onOpenChange={setIsTransferDialogOpen}
            onTransferComplete={() => {
              loadMachines()
              if (showTransferHistory) loadTransferHistory()
            }}
          />

          {/* Transfer History Section */}
          {permissions.canEditMachines && (
            <div className="mt-8">
              <Button
                variant="outline"
                onClick={() => setShowTransferHistory(!showTransferHistory)}
                className="mb-4"
              >
                <History className="h-4 w-4 mr-2" />
                {showTransferHistory ? "Ocultar" : "Ver"} Historial de Transferencias
              </Button>

              {showTransferHistory && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowRightLeft className="h-5 w-5" />
                      Historial de Transferencias
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transferHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No hay transferencias registradas para esta institución
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {transferHistory.map((transfer) => (
                          <div
                            key={transfer.id}
                            className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {transfer.machine
                                  ? `${getMachineDisplayName(transfer.machine.model, transfer.machine.lote)} — Lote: ${transfer.machine.lote}`
                                  : "Máquina eliminada"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {transfer.from_institution?.name || "—"}{" "}
                                <ArrowRightLeft className="h-3 w-3 inline mx-1" />{" "}
                                {transfer.to_institution?.name || "—"}
                              </p>
                              {transfer.remision && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <span className="font-medium">Remisión:</span> {transfer.remision}
                                </p>
                              )}
                              {transfer.notes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {transfer.notes}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-sm text-muted-foreground">
                              <p>{transfer.transfer_date?.split("T")[0]}</p>
                              {transfer.transferred_by_user && (
                                <p className="text-xs">{transfer.transferred_by_user.name}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
      {/* AlertDialog para confirmar retiro de máquina */}
      <AlertDialog open={!!machineToRetire} onOpenChange={(open) => !open && setMachineToRetire(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres retirar esta máquina?</AlertDialogTitle>
            <AlertDialogDescription>
              Se marcará como inactiva pero el historial de procedimientos y transferencias se preservará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRetireMachine}>
              Aceptar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  )
}