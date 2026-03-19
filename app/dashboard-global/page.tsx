"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Activity, Building2, Clock3, Loader2, MonitorSmartphone, ShieldAlert } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserMenu } from "@/components/auth/user-menu"
import { usePermissions } from "@/hooks/use-permissions"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Vista Global de Instituciones</h1>
                <p className="text-gray-600">
                  Seguimiento en tiempo real de equipos conectados, pacientes activos y maquinas retirables.
                </p>
              </div>
            </div>
            <UserMenu />
          </div>

          {!permissions.canViewGlobalDashboard ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <ShieldAlert className="h-12 w-12 mx-auto text-orange-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900">Acceso restringido</h2>
                <p className="text-gray-600 mt-2">Esta vista está disponible solo para gerencia y administración.</p>
              </CardContent>
            </Card>
          ) : loading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center gap-3 text-gray-600">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando tablero global...
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Instituciones Activas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.institutions}</div>
                    <p className="text-xs text-muted-foreground">Con actividad o equipos asignados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Maquinas Conectadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.connectedMachines}</div>
                    <p className="text-xs text-muted-foreground">{utilization}% de utilización sobre equipos en sede</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pacientes Activos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.activePatients}</div>
                    <p className="text-xs text-muted-foreground">Casos abiertos en todas las instituciones</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Maquinas Retirables</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{idleMachines.length}</div>
                    <p className="text-xs text-muted-foreground">Sin uso por más de 72 horas o nunca usadas</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Marcador por Institución
                    </CardTitle>
                    <CardDescription>Estado consolidado de pacientes, equipos conectados y disponibilidad.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {institutionStats.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No hay instituciones visibles para este usuario.</p>
                    ) : (
                      institutionStats.map((institution) => {
                        const institutionUtilization =
                          institution.total_machines > 0
                            ? Math.round((institution.connected_machines / institution.total_machines) * 100)
                            : 0

                        return (
                          <div key={institution.institution_id} className="rounded-lg border bg-white p-4 space-y-3">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-gray-900">{institution.institution_name}</h3>
                                <p className="text-xs text-muted-foreground">{institution.institution_code}</p>
                              </div>
                              <Badge variant={institution.connected_machines > 0 ? "default" : "secondary"}>
                                {institution.connected_machines > 0 ? "Con actividad" : "Sin actividad"}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                              <div>
                                <p className="text-muted-foreground">Pacientes</p>
                                <p className="font-semibold">{institution.active_patients}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Procedimientos</p>
                                <p className="font-semibold">{institution.active_procedures}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Conectadas</p>
                                <p className="font-semibold">{institution.connected_machines}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Disponibles</p>
                                <p className="font-semibold">{institution.available_machines}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Mantenimiento</p>
                                <p className="font-semibold">{institution.maintenance_machines}</p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Uso del parque de equipos</span>
                                <span>{institutionUtilization}%</span>
                              </div>
                              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-blue-600"
                                  style={{ width: `${Math.min(institutionUtilization, 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock3 className="h-5 w-5" />
                        Posibles Retiros
                      </CardTitle>
                      <CardDescription>Equipos sin actividad reciente para reasignación.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {idleMachines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No hay maquinas candidatas para retiro.</p>
                      ) : (
                        idleMachines.slice(0, 10).map((machine) => (
                          <div key={machine.machine_id} className="rounded-lg border p-3 bg-white">
                            <p className="font-medium text-sm text-gray-900">{machine.machine_model}</p>
                            <p className="text-xs text-muted-foreground">Lote {machine.machine_lote}</p>
                            <p className="text-xs text-muted-foreground mt-1">{machine.institution_name}</p>
                            <Badge variant={machine.never_used ? "secondary" : "outline"} className="mt-2">
                              {machine.never_used ? "Nunca usada" : `${machine.idle_hours} horas inactiva`}
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Resumen Operativo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Equipos en sede</span>
                        <span className="font-semibold">{summary.totalMachines}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Disponibles</span>
                        <span className="font-semibold">{summary.availableMachines}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Procedimientos activos</span>
                        <span className="font-semibold">{summary.activeProcedures}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Modo tablero</span>
                        <span className="font-semibold flex items-center gap-1">
                          <MonitorSmartphone className="h-4 w-4" />
                          Tiempo real
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
