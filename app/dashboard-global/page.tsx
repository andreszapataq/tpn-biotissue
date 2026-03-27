"use client"

import { useEffect, useMemo, useState } from "react"
import { Activity, Building2, Clock3, Loader2, MonitorSmartphone, ShieldAlert, Users } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserMenu } from "@/components/auth/user-menu"
import { usePermissions } from "@/hooks/use-permissions"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { KpiCard } from "@/components/ui/kpi-card"
import { StatusBadge } from "@/components/ui/status-badge"
import { UtilizationBar } from "@/components/ui/utilization-bar"
import { Badge } from "@/components/ui/badge"

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

export default function DashboardGlobalPage() {
  const permissions = usePermissions()
  const [loading, setLoading] = useState(true)
  const [institutionStats, setInstitutionStats] = useState<InstitutionStatus[]>([])
  const [idleMachines, setIdleMachines] = useState<IdleMachine[]>([])

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
                <p className="body-muted mt-2">Esta vista está disponible solo para gerencia y administración.</p>
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
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  title="Instituciones Activas"
                  value={summary.institutions}
                  subtitle="Con actividad o equipos asignados"
                  icon={Building2}
                  iconColor="text-primary"
                  iconBg="bg-primary/10"
                  valueSize="large"
                  className="bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                  animationDelay="0s"
                />
                <KpiCard
                  title="Maquinas Conectadas"
                  value={summary.connectedMachines}
                  subtitle={`${utilization}% de utilización sobre equipos en sede`}
                  icon={MonitorSmartphone}
                  iconColor="text-info"
                  iconBg="bg-info/10"
                  valueSize="large"
                  className="bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                  animationDelay="0.1s"
                />
                <KpiCard
                  title="Pacientes Activos"
                  value={summary.activePatients}
                  subtitle="Casos abiertos en todas las instituciones"
                  icon={Users}
                  iconColor="text-success"
                  iconBg="bg-success/10"
                  valueSize="large"
                  className="bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                  animationDelay="0.2s"
                />
                <KpiCard
                  title="Maquinas Retirables"
                  value={idleMachines.length}
                  subtitle="Sin uso por más de 72 horas o nunca usadas"
                  icon={Clock3}
                  iconColor="text-warning"
                  iconBg="bg-warning/10"
                  valueSize="large"
                  ring={idleMachines.length > 0 ? "ring-1 ring-warning/30" : undefined}
                  className="bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"
                  animationDelay="0.3s"
                />
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
                {/* Institution Scoreboard */}
                <Card className="bg-card/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Marcador por Institución
                    </CardTitle>
                    <CardDescription>Estado consolidado de pacientes, equipos conectados y disponibilidad.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {institutionStats.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay instituciones visibles para este usuario.</p>
                    ) : (
                      institutionStats.map((institution, index) => {
                        const institutionUtilization =
                          institution.total_machines > 0
                            ? Math.round((institution.connected_machines / institution.total_machines) * 100)
                            : 0

                        return (
                          <div
                            key={institution.institution_id}
                            className="rounded-xl border bg-card p-5 space-y-4 hover:shadow-sm transition-all animate-fade-in-up"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-foreground">{institution.institution_name}</h3>
                                <p className="text-xs font-mono text-muted-foreground">{institution.institution_code}</p>
                              </div>
                              <StatusBadge
                                status={institution.connected_machines > 0 ? "active" : "inactive"}
                                label={institution.connected_machines > 0 ? "Con actividad" : "Sin actividad"}
                              />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                              <div>
                                <p className="label-text">Pacientes</p>
                                <p className="font-semibold text-foreground">{institution.active_patients}</p>
                              </div>
                              <div>
                                <p className="label-text">Procedimientos</p>
                                <p className="font-semibold text-foreground">{institution.active_procedures}</p>
                              </div>
                              <div>
                                <p className="label-text">Conectadas</p>
                                <p className="font-semibold text-foreground">{institution.connected_machines}</p>
                              </div>
                              <div>
                                <p className="label-text">Disponibles</p>
                                <p className="font-semibold text-foreground">{institution.available_machines}</p>
                              </div>
                              <div>
                                <p className="label-text">Mantenimiento</p>
                                <p className="font-semibold text-foreground">{institution.maintenance_machines}</p>
                              </div>
                            </div>

                            <UtilizationBar
                              value={institutionUtilization}
                              size="sm"
                              animated
                              label="Uso del parque de equipos"
                            />
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Posibles Retiros */}
                  <Card className={`bg-card/90 backdrop-blur-sm ${idleMachines.length > 3 ? "border-warning/30" : ""}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock3 className="h-5 w-5 text-warning" />
                        Posibles Retiros
                      </CardTitle>
                      <CardDescription>Equipos sin actividad reciente para reasignación.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {idleMachines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay maquinas candidatas para retiro.</p>
                      ) : (
                        idleMachines.slice(0, 10).map((machine, index) => (
                          <div
                            key={machine.machine_id}
                            className={`rounded-lg border p-3 animate-fade-in-up ${
                              machine.never_used
                                ? "border-l-4 border-l-warning bg-warning-muted/30"
                                : (machine.idle_hours ?? 0) > 120
                                  ? "border-l-4 border-l-destructive bg-destructive/5"
                                  : "border-l-4 border-l-neutral bg-card"
                            }`}
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <p className="font-medium text-sm text-foreground">{machine.machine_model}</p>
                            <p className="text-xs text-muted-foreground">Lote {machine.machine_lote}</p>
                            <p className="text-xs text-muted-foreground mt-1">{machine.institution_name}</p>
                            <div className="mt-2">
                              {machine.never_used ? (
                                <StatusBadge status="never_used" />
                              ) : (
                                <Badge variant="info" className="text-xs">
                                  {machine.idle_hours} horas inactiva
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Resumen Operativo */}
                  <Card className="bg-card/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Resumen Operativo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-0 text-sm">
                      <div className="flex items-center justify-between py-3 border-b">
                        <span className="text-muted-foreground">Equipos en sede</span>
                        <span className="font-semibold text-foreground">{summary.totalMachines}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b">
                        <span className="text-muted-foreground">Disponibles</span>
                        <span className="font-semibold text-foreground">{summary.availableMachines}</span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-b">
                        <span className="text-muted-foreground">Procedimientos activos</span>
                        <span className="font-semibold text-foreground">{summary.activeProcedures}</span>
                      </div>
                      <div className="flex items-center justify-between py-3">
                        <span className="text-muted-foreground">Modo tablero</span>
                        <span className="font-semibold text-foreground flex items-center gap-2">
                          <MonitorSmartphone className="h-4 w-4" />
                          Tiempo real
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                          </span>
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
