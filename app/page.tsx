"use client"

import { useState, useEffect, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserMenu } from "@/components/auth/user-menu"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Plus, Users, Package, Activity, AlertTriangle, Calendar, Clock, Loader2, Settings } from "lucide-react"

// Componente memoizado para evitar re-renders innecesarios
const DashboardContent = memo(function DashboardContent() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const { user } = useAuth()

  const [activePatients, setActivePatients] = useState(0)
  const [todayProcedures, setTodayProcedures] = useState(0)
  const [inventoryAlerts, setInventoryAlerts] = useState(0)
  const [activeMachines, setActiveMachines] = useState(0)
  const [closedProcedures, setClosedProcedures] = useState<any[]>([])
  const [activeProcedures, setActiveProcedures] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const loadDashboardData = async () => {
    try {
      setLoadingData(true)

      // Cargar contadores
      const [patientsResult, proceduresResult, inventoryResult] = await Promise.all([
        supabase.from("patients").select("*", { count: "exact" }).eq("status", "active"),
        supabase
          .from("procedures")
          .select("*", { count: "exact" })
          .eq("procedure_date", new Date().toISOString().split("T")[0]),
        supabase.rpc("get_low_stock_products"),
      ])

      setActivePatients(patientsResult.count || 0)
      setTodayProcedures(proceduresResult.count || 0)
      setInventoryAlerts(inventoryResult.data?.length || 0)
      
      // Cargar máquinas activas
      const { data: machinesData } = await supabase
        .from("machines")
        .select("*", { count: "exact" })
        .eq("status", "active")
      
      setActiveMachines(machinesData?.length || 0)

      // Cargar procedimientos activos
      const { data: activeProceduresData } = await supabase
        .from("procedures")
        .select(`
          *,
          patient:patients(name, identification),
          machine:machines(model, lote)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      // Cargar procedimientos cerrados
      const { data: closedProceduresData } = await supabase
        .from("procedures")
        .select(`
          *,
          patient:patients(name, identification),
          machine:machines(model, lote)
        `)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })
        .limit(10)

      // Cargar datos para las tabs
      if (patientsResult.data) setPatients(patientsResult.data)
      if (closedProceduresData) setClosedProcedures(closedProceduresData)
      if (activeProceduresData) setActiveProcedures(activeProceduresData)
      if (inventoryResult.data) {
        setAlerts(
          inventoryResult.data.map((item: any) => ({
            product: item.name,
            stock: item.stock,
            minimum: item.minimum_stock,
          })),
        )
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Solo log una vez cuando el usuario cambia
  useEffect(() => {
    if (user) {
      console.log("🏠 Dashboard loaded for user:", user.name)
    }
  }, [user]) // Solo cuando cambia el ID del usuario

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Control NPWT</h1>
              <p className="text-gray-600">Sistema de Terapia de Presión Negativa</p>
              {user && (
                <p className="text-sm text-blue-600 mt-1">
                  Bienvenido, {user.name} ({user.role})
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  {currentTime.toLocaleDateString("es-ES", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-lg font-semibold">{currentTime.toLocaleTimeString("es-ES")}</p>
              </div>
              <UserMenu />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-4">
            <Link href="/nuevo-procedimiento">
              <Button size="lg" className="h-12">
                <Plus className="mr-2 h-5 w-5" />
                Nuevo Procedimiento
              </Button>
            </Link>
            <Link href="/pacientes">
              <Button variant="outline" size="lg" className="h-12">
                <Users className="mr-2 h-5 w-5" />
                Pacientes
              </Button>
            </Link>
            <Link href="/maquinas">
              <Button variant="outline" size="lg" className="h-12">
                <Settings className="mr-2 h-5 w-5" />
                Máquinas
              </Button>
            </Link>
            <Link href="/inventario">
              <Button variant="outline" size="lg" className="h-12">
                <Package className="mr-2 h-5 w-5" />
                Inventario
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pacientes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePatients}</div>
              <p className="text-xs text-muted-foreground">En tratamiento actual</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Procedimientos Hoy</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayProcedures}</div>
              <p className="text-xs text-muted-foreground">Realizados hoy</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Inventario</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{inventoryAlerts}</div>
              <p className="text-xs text-muted-foreground">Productos con stock bajo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Máquinas Activas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeMachines}</div>
              <p className="text-xs text-muted-foreground">En uso actualmente</p>
            </CardContent>
          </Card>
        </div>

        {/* Procedimientos Activos */}
        {activeProcedures.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Procedimientos Activos</h2>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {activeProcedures.length} activo{activeProcedures.length !== 1 ? 's' : ''}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeProcedures.map((procedure: any) => (
                <Card key={procedure.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{procedure.patient?.name || 'Sin nombre'}</CardTitle>
                      <Badge className="bg-green-100 text-green-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Activo
                      </Badge>
                    </div>
                    <CardDescription>
                      ID: {procedure.patient?.identification || 'Sin ID'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <p><span className="font-medium">Cirujano:</span> {procedure.surgeon_name}</p>
                      <p><span className="font-medium">Fecha:</span> {new Date(procedure.procedure_date).toLocaleDateString("es-ES")}</p>
                      <p><span className="font-medium">Máquina:</span> {procedure.machine?.model || 'N/A'}</p>
                      <p><span className="font-medium">Lote:</span> {procedure.machine?.lote || 'N/A'}</p>
                    </div>
                    <div className="pt-2">
                      <Link href={`/procedimiento/${procedure.id}`}>
                        <Button className="w-full" size="sm">
                          <Activity className="h-4 w-4 mr-2" />
                          Gestionar Procedimiento
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="pacientes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pacientes">Pacientes Activos</TabsTrigger>
            <TabsTrigger value="procedimientos">Procedimientos Cerrados</TabsTrigger>
            <TabsTrigger value="alertas">Alertas</TabsTrigger>
          </TabsList>

          {loadingData ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <TabsContent value="pacientes" className="space-y-4">
                <div className="grid gap-4">
                  {patients.map((patient) => (
                    <Card key={patient.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg">{patient.name}</CardTitle>
                            <CardDescription>
                              ID: {patient.identification} • Edad: {patient.age} años
                            </CardDescription>
                          </div>
                          <Badge variant="default">Activo</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-gray-600">Estado</p>
                            <p className="capitalize">{patient.status}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">Edad</p>
                            <p>{patient.age} años</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">Identificación</p>
                            <p>{patient.identification}</p>
                          </div>
                          <div>
                            <p className="font-medium text-gray-600">Creado</p>
                            <p>{new Date(patient.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="procedimientos" className="space-y-4">
                <div className="grid gap-4">
                  {closedProcedures.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        <p className="text-gray-500">No hay procedimientos cerrados</p>
                      </CardContent>
                    </Card>
                  ) : (
                    closedProcedures.map((procedure: any) => (
                      <Card key={procedure.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="bg-blue-100 p-2 rounded-full">
                                <Activity className="h-4 w-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">{procedure.patient?.name || 'Sin nombre'}</p>
                                <p className="text-sm text-gray-600">
                                  Dr. {procedure.surgeon_name} • ID: {procedure.patient?.identification || 'Sin ID'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                                Completado
                              </Badge>
                              <Link href={`/procedimiento/${procedure.id}`}>
                                <Button variant="outline" size="sm">
                                  Ver Historial
                                </Button>
                              </Link>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-600">Fecha</p>
                              <div className="flex items-center text-gray-900">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(procedure.procedure_date).toLocaleDateString("es-ES")}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Hora Inicio</p>
                              <div className="flex items-center text-gray-900">
                                <Clock className="h-3 w-3 mr-1" />
                                {procedure.start_time}
                              </div>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Máquina</p>
                              <p className="text-gray-900">{procedure.machine?.model || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Finalizado</p>
                              <p className="text-gray-900">
                                {procedure.updated_at ? new Date(procedure.updated_at).toLocaleDateString("es-ES") : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          {procedure.diagnosis && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="font-medium text-gray-600 text-sm">Diagnóstico</p>
                              <p className="text-sm text-gray-900 mt-1">{procedure.diagnosis}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="alertas" className="space-y-4">
                <div className="grid gap-4">
                  {alerts.map((alert, index) => (
                    <Card key={index} className="border-orange-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="bg-orange-100 p-2 rounded-full">
                              <AlertTriangle className="h-4 w-4 text-orange-600" />
                            </div>
                            <div>
                              <p className="font-medium">Stock Bajo: {alert.product}</p>
                              <p className="text-sm text-gray-600">
                                Stock actual: {alert.stock} • Mínimo requerido: {alert.minimum}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Solicitar Reposición
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
})

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
