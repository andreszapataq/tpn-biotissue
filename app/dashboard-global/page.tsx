"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, ShieldAlert } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserMenu } from "@/components/auth/user-menu"
import { usePermissions } from "@/hooks/use-permissions"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { KpiStrip } from "@/components/dashboard-global/kpi-strip"
import { InstitutionList } from "@/components/dashboard-global/institution-list"
import { RetirablesPanel } from "@/components/dashboard-global/retirables-panel"

type InstitutionStatus = {
  institution_id: string
  institution_name: string
  institution_code: string
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

type FilterTab = "todos" | "en_uso" | "disponibles" | "retirables"

export default function DashboardGlobalPage() {
  const permissions = usePermissions()
  const [loading, setLoading] = useState(true)
  const [institutionStats, setInstitutionStats] = useState<InstitutionStatus[]>([])
  const [idleMachines, setIdleMachines] = useState<IdleMachine[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<FilterTab>("todos")

  const loadDashboard = async () => {
    try {
      setLoading(true)

      const [statusResult, idleResult] = await Promise.all([
        supabase.rpc("get_institutions_live_status"),
        supabase.rpc("get_idle_machines", { hours_threshold: 72 }),
      ])

      if (statusResult.error) {
        throw statusResult.error
      }

      if (idleResult.error) {
        throw idleResult.error
      }

      setInstitutionStats(statusResult.data || [])
      setIdleMachines(idleResult.data || [])
    } catch (error) {
      console.error("Error loading global dashboard:", error)
      setInstitutionStats([])
      setIdleMachines([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!permissions.canViewGlobalDashboard) {
      return
    }

    void loadDashboard()

    const channel = supabase
      .channel("dashboard-global-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "procedures" }, () => {
        void loadDashboard()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "machines" }, () => {
        void loadDashboard()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "patients" }, () => {
        void loadDashboard()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [permissions.canViewGlobalDashboard])

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

    // Text search
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

    // Tab filter
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

  // Tab counts (computed from unfiltered data so counts stay stable)
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
              title="Vista Global de Instituciones"
              subtitle="Seguimiento en tiempo real de equipos conectados, pacientes activos y maquinas retirables."
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
            <>
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

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
                {/* Left: Institutions */}
                <InstitutionList
                  filteredInstitutions={filteredInstitutions}
                  retirablesByInstitution={retirablesByInstitution}
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  tabCounts={tabCounts}
                />

                {/* Right: Retirables */}
                <RetirablesPanel idleMachines={idleMachines} />
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
