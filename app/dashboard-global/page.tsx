"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, ShieldAlert } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserMenu } from "@/components/auth/user-menu"
import { usePermissions } from "@/hooks/use-permissions"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { KpiStrip } from "@/components/dashboard-global/kpi-strip"
import { ModelCardsSection } from "@/components/dashboard-global/model-cards-section"
import { InstitutionCardsSection } from "@/components/dashboard-global/institution-cards-section"
import { GlobalMachineSearch, type GlobalMachine } from "@/components/dashboard-global/global-machine-search"

type InstitutionStatus = {
  institution_id: string
  institution_name: string
  institution_code: string
  is_warehouse: boolean
  active_patients: number
  active_procedures: number
  total_machines: number
  connected_machines: number
  available_machines: number
  maintenance_machines: number
  inactive_machines: number
  last_activity_at: string | null
}

type IdleMachine = {
  machine_id: string
  institution_id: string
  institution_name: string
  machine_model: string
  machine_lote: string
  last_activity_at: string | null
  idle_hours: number | null
  never_used: boolean
}

type ModelStats = {
  model: string
  total_count: number
  in_use_count: number
  available_count: number
  maintenance_count: number
}

type FilterTab = "todos" | "en_uso" | "disponibles" | "retirables"

export default function DashboardGlobalPage() {
  const permissions = usePermissions()

  // Dashboard data
  const [loading, setLoading] = useState(true)
  const [institutionStats, setInstitutionStats] = useState<InstitutionStatus[]>([])
  const [idleMachines, setIdleMachines] = useState<IdleMachine[]>([])
  const [modelStats, setModelStats] = useState<ModelStats[]>([])

  // Institution filters
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterTab>("todos")

  // Global machine search state
  const [globalMachines, setGlobalMachines] = useState<GlobalMachine[]>([])
  const [globalMachinesTotal, setGlobalMachinesTotal] = useState(0)
  const [machinesLoading, setMachinesLoading] = useState(false)
  const [machineSearchTerm, setMachineSearchTerm] = useState("")
  const [machineFilterInstitution, setMachineFilterInstitution] = useState("")
  const [machineFilterModel, setMachineFilterModel] = useState("")
  const [machineFilterStatus, setMachineFilterStatus] = useState("")
  const [machinePage, setMachinePage] = useState(0)
  const [machineSortField, setMachineSortField] = useState("last_maintenance")
  const [machineSortDir, setMachineSortDir] = useState<"asc" | "desc">("asc")

  const loadDashboard = async () => {
    try {
      setLoading(true)

      const [statusResult, idleResult, modelResult] = await Promise.all([
        supabase.rpc("get_institutions_live_status"),
        supabase.rpc("get_idle_machines", { hours_threshold: 72 }),
        supabase.rpc("get_fleet_by_model"),
      ])

      if (statusResult.error) throw statusResult.error
      if (idleResult.error) throw idleResult.error
      if (modelResult.error) throw modelResult.error

      setInstitutionStats(statusResult.data || [])
      setIdleMachines(idleResult.data || [])
      setModelStats(modelResult.data || [])
    } catch (error) {
      console.error("Error loading global dashboard:", error)
      setInstitutionStats([])
      setIdleMachines([])
      setModelStats([])
    } finally {
      setLoading(false)
    }
  }

  const loadGlobalMachines = useCallback(async () => {
    try {
      setMachinesLoading(true)

      const { data, error } = await supabase.rpc("get_global_machines_list", {
        search_term: machineSearchTerm,
        filter_institution_id: machineFilterInstitution || undefined,
        filter_model: machineFilterModel || undefined,
        filter_status: machineFilterStatus || undefined,
        sort_field: machineSortField,
        sort_direction: machineSortDir,
        page_limit: 25,
        page_offset: machinePage * 25,
      })

      if (error) throw error

      const machines = (data || []) as GlobalMachine[]
      setGlobalMachines(machines)
      setGlobalMachinesTotal(machines[0]?.total_count ?? 0)
    } catch (error) {
      console.error("Error loading global machines:", error)
      setGlobalMachines([])
      setGlobalMachinesTotal(0)
    } finally {
      setMachinesLoading(false)
    }
  }, [machineSearchTerm, machineFilterInstitution, machineFilterModel, machineFilterStatus, machineSortField, machineSortDir, machinePage])

  // Initial load + realtime
  useEffect(() => {
    if (!permissions.canViewGlobalDashboard) return

    void loadDashboard()
    void loadGlobalMachines()

    const channel = supabase
      .channel("dashboard-global-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "procedures" }, () => {
        void loadDashboard()
        void loadGlobalMachines()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, () => {
        void loadDashboard()
        void loadGlobalMachines()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
        void loadDashboard()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissions.canViewGlobalDashboard])

  // Reload machines when filters change
  useEffect(() => {
    if (!permissions.canViewGlobalDashboard) return
    void loadGlobalMachines()
  }, [loadGlobalMachines, permissions.canViewGlobalDashboard])

  // Aggregated summary
  const summary = useMemo(() => {
    return institutionStats.reduce(
      (acc, institution) => {
        acc.institutions += 1
        acc.activePatients += institution.active_patients
        acc.activeProcedures += institution.active_procedures
        acc.totalMachines += institution.total_machines
        acc.connectedMachines += institution.connected_machines
        acc.availableMachines += institution.available_machines
        return acc
      },
      {
        institutions: 0,
        activePatients: 0,
        activeProcedures: 0,
        totalMachines: 0,
        connectedMachines: 0,
        availableMachines: 0,
      },
    )
  }, [institutionStats])

  const utilization = summary.totalMachines > 0 ? Math.round((summary.connectedMachines / summary.totalMachines) * 100) : 0

  // Group idle machines by institution
  const retirablesByInstitution = useMemo(() => {
    const map = new Map<string, IdleMachine[]>()
    for (const m of idleMachines) {
      const arr = map.get(m.institution_id) || []
      arr.push(m)
      map.set(m.institution_id, arr)
    }
    return map
  }, [idleMachines])

  // Filtered institutions based on search + tab
  const filteredInstitutions = useMemo(() => {
    let result = institutionStats

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      result = result.filter((inst) =>
        inst.institution_name.toLowerCase().includes(term) ||
        inst.institution_code.toLowerCase().includes(term) ||
        (retirablesByInstitution.get(inst.institution_id) || []).some(
          (m) =>
            m.machine_model.toLowerCase().includes(term) ||
            m.machine_lote.toLowerCase().includes(term)
        )
      )
    }

    switch (activeFilter) {
      case "en_uso":
        result = result.filter((inst) => inst.connected_machines > 0)
        break
      case "disponibles":
        result = result.filter((inst) => inst.available_machines > 0)
        break
      case "retirables":
        result = result.filter((inst) => retirablesByInstitution.has(inst.institution_id))
        break
    }

    return result
  }, [institutionStats, searchTerm, activeFilter, retirablesByInstitution])

  // Tab counts
  const tabCounts = useMemo(
    () => ({
      todos: institutionStats.length,
      en_uso: institutionStats.filter((i) => i.connected_machines > 0).length,
      disponibles: institutionStats.filter((i) => i.available_machines > 0).length,
      retirables: institutionStats.filter((i) => retirablesByInstitution.has(i.institution_id)).length,
    }),
    [institutionStats, retirablesByInstitution],
  )

  return (
    <ProtectedRoute requiredRole={["administrador", "gerente"]}>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/3 to-background">
        <div className="page-container">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <PageHeader
              title="Vista Global"
              subtitle="Seguimiento en tiempo real de equipos, instituciones y pacientes activos."
              backHref="/"
            />
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm rounded-full px-3 py-1.5 border">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                Tiempo real
              </div>
              <UserMenu />
            </div>
          </div>

          {!permissions.canViewGlobalDashboard ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <ShieldAlert className="h-12 w-12 mx-auto text-warning mb-4" />
                <h2 className="heading-2">Acceso restringido</h2>
                <p className="body-muted mt-2">Esta vista esta disponible solo para gerencia y administracion.</p>
              </CardContent>
            </Card>
          ) : loading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando tablero global...
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* KPI Strip */}
              <KpiStrip
                totalMachines={summary.totalMachines}
                connectedMachines={summary.connectedMachines}
                availableMachines={summary.availableMachines}
                activePatients={summary.activePatients}
                institutionCount={summary.institutions}
                utilization={utilization}
                idleMachinesCount={idleMachines.length}
              />

              {/* Section 1: Machine Model Cards */}
              <ModelCardsSection modelStats={modelStats} />

              {/* Section 2: Global Machine Search */}
              <GlobalMachineSearch
                machines={globalMachines}
                totalCount={globalMachinesTotal}
                loading={machinesLoading}
                searchTerm={machineSearchTerm}
                onSearchChange={setMachineSearchTerm}
                institutionFilter={machineFilterInstitution}
                onInstitutionFilterChange={setMachineFilterInstitution}
                modelFilter={machineFilterModel}
                onModelFilterChange={setMachineFilterModel}
                statusFilter={machineFilterStatus}
                onStatusFilterChange={setMachineFilterStatus}
                sortField={machineSortField}
                sortDir={machineSortDir}
                onSortChange={(field, dir) => {
                  setMachineSortField(field)
                  setMachineSortDir(dir)
                  setMachinePage(0)
                }}
                page={machinePage}
                onPageChange={setMachinePage}
                institutions={institutionStats}
              />

              {/* Section 3: Institutions */}
              <InstitutionCardsSection
                filteredInstitutions={filteredInstitutions}
                retirablesByInstitution={retirablesByInstitution}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                tabCounts={tabCounts}
              />
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
