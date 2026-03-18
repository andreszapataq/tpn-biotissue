"use client"

import { useState, useEffect, memo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { UserMenu } from "@/components/auth/user-menu"
import { InstitutionSwitcher } from "@/components/institutions/institution-switcher"
import { useInstitution } from "@/components/institutions/institution-provider"
import { useAuth } from "@/components/auth/auth-provider"
import { usePermissions } from "@/hooks/use-permissions"
import { supabase } from "@/lib/supabase"
import { getCurrentDateInColombia, formatDateForColombia, formatTimestampForColombia, getMachineDisplayName } from "@/lib/utils"
import { Plus, Users, Package, Activity, AlertTriangle, Calendar, Clock, Loader2, Settings, FileText, Search, ChevronLeft, ChevronRight, Building2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Componente memoizado para evitar re-renders innecesarios
const DashboardContent = memo(function DashboardContent() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const { user } = useAuth()
  const { selectedInstitutionId, selectedInstitutionName } = useInstitution()
  const permissions = usePermissions()

  const [activePatients, setActivePatients] = useState(0)
  const [totalClosedProcedures, setTotalClosedProcedures] = useState(0)
  const [inventoryAlerts, setInventoryAlerts] = useState(0)
  const [activeMachines, setActiveMachines] = useState(0)
  const [closedProcedures, setClosedProcedures] = useState<any[]>([])
  const [activeProcedures, setActiveProcedures] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)
  
  // 🔍 Estado para el buscador
  const [searchTerm, setSearchTerm] = useState("")
  
  // 📄 Estados para paginación
  const [currentPagePatients, setCurrentPagePatients] = useState(1)
  const [currentPageProcedures, setCurrentPageProcedures] = useState(1)
  const [currentPageAlerts, setCurrentPageAlerts] = useState(1)
  const ITEMS_PER_PAGE = 10

  // 🔍 Funciones de filtrado
  const filteredPatients = patients.filter(patient => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      patient.name?.toLowerCase().includes(term) ||
      patient.identification?.toLowerCase().includes(term) ||
      patient.status?.toLowerCase().includes(term) ||
      (patient.status === "active" && "en tratamiento".includes(term)) ||
      (patient.status === "completed" && ("completado".includes(term) || "cerrado".includes(term))) ||
      (patient.status === "inactive" && "inactivo".includes(term))
    )
  })

  const filteredClosedProcedures = closedProcedures.filter(procedure => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      procedure.patient?.name?.toLowerCase().includes(term) ||
      procedure.patient?.identification?.toLowerCase().includes(term) ||
      procedure.surgeon_name?.toLowerCase().includes(term) ||
      procedure.diagnosis?.toLowerCase().includes(term) ||
      procedure.location?.toLowerCase().includes(term) ||
      procedure.machine?.model?.toLowerCase().includes(term) ||
      procedure.machine?.lote?.toLowerCase().includes(term)
    )
  })

  const filteredAlerts = alerts.filter(alert => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return alert.product?.toLowerCase().includes(term)
  })

  // 📄 Cálculos de paginación
  const totalPagesPatients = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE)
  const totalPagesProcedures = Math.ceil(filteredClosedProcedures.length / ITEMS_PER_PAGE)
  const totalPagesAlerts = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE)

  // 📄 Datos paginados
  const paginatedPatients = filteredPatients.slice(
    (currentPagePatients - 1) * ITEMS_PER_PAGE,
    currentPagePatients * ITEMS_PER_PAGE
  )

  const paginatedProcedures = filteredClosedProcedures.slice(
    (currentPageProcedures - 1) * ITEMS_PER_PAGE,
    currentPageProcedures * ITEMS_PER_PAGE
  )

  const paginatedAlerts = filteredAlerts.slice(
    (currentPageAlerts - 1) * ITEMS_PER_PAGE,
    currentPageAlerts * ITEMS_PER_PAGE
  )

  // 📄 Funciones de navegación
  const goToPagePatients = (page: number) => {
    setCurrentPagePatients(Math.max(1, Math.min(page, totalPagesPatients)))
  }

  const goToPageProcedures = (page: number) => {
    setCurrentPageProcedures(Math.max(1, Math.min(page, totalPagesProcedures)))
  }

  const goToPageAlerts = (page: number) => {
    setCurrentPageAlerts(Math.max(1, Math.min(page, totalPagesAlerts)))
  }

  // 🔄 Reset paginación cuando cambia la búsqueda
  useEffect(() => {
    setCurrentPagePatients(1)
    setCurrentPageProcedures(1)
    setCurrentPageAlerts(1)
  }, [searchTerm])


  // 📄 Componente de Paginación
  const PaginationControls = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    totalItems,
    itemsPerPage 
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    totalItems: number
    itemsPerPage: number
  }) => {
    if (totalPages <= 1) return null

    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(currentPage * itemsPerPage, totalItems)

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Mostrando {startItem} - {endItem} de {totalItems} registros
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNumber
              if (totalPages <= 5) {
                pageNumber = i + 1
              } else if (currentPage <= 3) {
                pageNumber = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNumber = totalPages - 4 + i
              } else {
                pageNumber = currentPage - 2 + i
              }
              
              return (
                <Button
                  key={pageNumber}
                  variant={currentPage === pageNumber ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNumber)}
                  className="w-8 h-8 p-0"
                >
                  {pageNumber}
                </Button>
              )
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  const loadDashboardData = async () => {
    try {
      setLoadingData(true)

      if (!selectedInstitutionId) {
        setActivePatients(0)
        setTotalClosedProcedures(0)
        setInventoryAlerts(0)
        setActiveMachines(0)
        setClosedProcedures([])
        setActiveProcedures([])
        setPatients([])
        setAlerts([])
        return
      }

      // Cargar contadores
      const [patientsResult, closedProceduresResult, inventoryResult] = await Promise.all([
        supabase
          .from("patients")
          .select("*", { count: "exact" })
          .eq("institution_id", selectedInstitutionId)
          .eq("status", "active"),
        supabase
          .from("procedures")
          .select("*", { count: "exact" })
          .eq("institution_id", selectedInstitutionId)
          .eq("status", "completed"),
        supabase.rpc("get_low_stock_products", { target_institution_id: selectedInstitutionId }),
      ])

      // Cargar todos los pacientes (todos los estados)
      const { data: allPatientsData } = await supabase
        .from("patients")
        .select("*")
        .eq("institution_id", selectedInstitutionId)
        .order("created_at", { ascending: false })

      setActivePatients(patientsResult.count || 0)
      setTotalClosedProcedures(closedProceduresResult.count || 0)
      setInventoryAlerts(inventoryResult.data?.length || 0)
      
      // Cargar máquinas activas
      const { data: machinesData } = await supabase
        .from("machines")
        .select("*", { count: "exact" })
        .eq("institution_id", selectedInstitutionId)
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
        .eq("institution_id", selectedInstitutionId)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      // Cargar todos los procedimientos cerrados
      const { data: closedProceduresData } = await supabase
        .from("procedures")
        .select(`
          *,
          patient:patients(name, identification, status),
          machine:machines(model, lote)
        `)
        .eq("institution_id", selectedInstitutionId)
        .eq("status", "completed")
        .order("updated_at", { ascending: false })

      // Cargar datos para las tabs
      if (allPatientsData) setPatients(allPatientsData)
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
  }, [user, selectedInstitutionId])

  // Navigation items (built dynamically based on permissions)
  const navItems = [
    { href: "/nuevo-procedimiento", icon: Plus, label: "Nuevo Procedimiento", primary: true },
    { href: "/pacientes", icon: Users, label: "Pacientes" },
    { href: "/maquinas", icon: Settings, label: "Máquinas" },
    { href: "/inventario", icon: Package, label: "Inventario" },
    ...(permissions.canViewReports ? [{ href: "/informes", icon: FileText, label: "Informes" }] : []),
    ...(permissions.canViewGlobalDashboard ? [{ href: "/dashboard-global", icon: Building2, label: "Vista Global" }] : []),
    ...(permissions.canManageAdministration ? [{ href: "/admin", icon: Settings, label: "Administración" }] : []),
  ]

  return (
    <TooltipProvider delayDuration={300}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Top Bar */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 leading-tight">Control NPWT</h1>
              <p className="text-xs text-slate-500 leading-tight">Terapia de Presión Negativa</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <InstitutionSwitcher />
            <div className="hidden sm:block text-right border-l pl-3">
              <p className="text-xs text-slate-400 capitalize">
                {currentTime.toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <p className="text-sm font-mono font-medium text-slate-700 tabular-nums">{currentTime.toLocaleTimeString("es-ES")}</p>
            </div>
            <UserMenu />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-6">
        {/* Welcome + Nav */}
        <div>
          {user && (
            <p className="text-sm text-slate-500 mb-3">
              Bienvenido, <span className="font-medium text-slate-700">{user.name}</span>
              {selectedInstitutionName && (
                <span className="text-slate-400"> &mdash; {selectedInstitutionName}</span>
              )}
            </p>
          )}

          {/* Navigation Grid */}
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={item.primary ? "default" : "outline"}
                    className={`h-10 text-sm gap-2 ${
                      item.primary
                        ? "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              icon: Users,
              iconColor: "text-blue-600",
              iconBg: "bg-blue-50/80",
              label: "Activos",
              value: activePatients,
              valueColor: "text-slate-900",
              description: "Pacientes en tratamiento",
            },
            {
              icon: Activity,
              iconColor: "text-indigo-600",
              iconBg: "bg-indigo-50/80",
              label: "Cerrados",
              value: totalClosedProcedures,
              valueColor: "text-slate-900",
              description: "Procedimientos completados",
            },
            {
              icon: Package,
              iconColor: "text-emerald-600",
              iconBg: "bg-emerald-50/80",
              label: "Disponibles",
              value: activeMachines - activeProcedures.length,
              valueColor: "text-emerald-600",
              description: "Máquinas listas para usar",
            },
            {
              icon: AlertTriangle,
              iconColor: inventoryAlerts > 0 ? "text-amber-500" : "text-slate-400",
              iconBg: inventoryAlerts > 0 ? "bg-amber-50/80" : "bg-slate-50",
              label: "Alertas",
              value: inventoryAlerts,
              valueColor: inventoryAlerts > 0 ? "text-amber-500" : "text-slate-900",
              description: "Productos con stock bajo",
              ring: inventoryAlerts > 0,
            },
          ].map((stat, i) => {
            const StatIcon = stat.icon
            return (
              <Card
                key={i}
                className={`bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow transition-all ${stat.ring ? 'ring-1 ring-amber-200/60' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-9 w-9 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                      <StatIcon className={`h-[18px] w-[18px] ${stat.iconColor}`} />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{stat.label}</span>
                  </div>
                  <div className={`text-3xl font-semibold tracking-tight ${stat.valueColor}`}>{stat.value}</div>
                  <p className="text-xs text-slate-400 mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Active Procedures */}
        {activeProcedures.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-base font-semibold text-slate-800">Procedimientos Activos</h2>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                {activeProcedures.length} activo{activeProcedures.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeProcedures.map((procedure: any) => {
                const machineName = getMachineDisplayName(procedure.machine?.model || '', procedure.machine?.lote || '')
                const machineLote = procedure.machine?.lote || ''
                return (
                <Card
                  key={procedure.id}
                  className="bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-sm hover:shadow transition-all group"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">{procedure.patient?.name || 'Sin nombre'}</p>
                        <p className="text-xs text-slate-400 mt-0.5">ID: {procedure.patient?.identification || 'Sin ID'}</p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20 shrink-0 ml-2">
                        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Activo
                      </span>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Cirujano</p>
                        <p className="text-slate-700 truncate">{procedure.surgeon_name}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Fecha</p>
                        <p className="text-slate-700">{formatDateForColombia(procedure.procedure_date)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Ubicación</p>
                        <p className="text-slate-700">{procedure.location || '—'}</p>
                      </div>
                    </div>

                    {/* Machine info — full width with tooltip showing lote */}
                    <div className="bg-slate-50/80 rounded-lg px-3 py-2 mb-3">
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-0.5">Máquina</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="text-sm text-slate-700 font-medium truncate cursor-default">{machineName}</p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{machineName}</p>
                            {machineLote && <p className="text-xs text-muted-foreground">Lote: {machineLote}</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    <Link href={`/procedimiento/${procedure.id}`}>
                      <Button className="w-full h-9 bg-blue-600 hover:bg-blue-700 shadow-sm text-sm group-hover:shadow transition-shadow">
                        <Activity className="h-3.5 w-3.5 mr-1.5" />
                        Gestionar
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="pacientes" className="space-y-4">
          <div className="flex flex-col space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pacientes">Últimos Pacientes</TabsTrigger>
              <TabsTrigger value="procedimientos">Procedimientos Cerrados</TabsTrigger>
              <TabsTrigger value="alertas">Alertas</TabsTrigger>
            </TabsList>
            
            {/* 🔍 Buscador Global */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar pacientes, procedimientos, cirujanos, diagnósticos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {/* Contador de resultados */}
              {(searchTerm || filteredPatients.length > 0 || filteredClosedProcedures.length > 0 || filteredAlerts.length > 0) && (
                <div className="text-sm text-gray-500 whitespace-nowrap">
                  <span className="hidden lg:inline">Encontrados: </span>
                  <span className="font-medium">
                    {filteredPatients.length} pacientes | 
                    {filteredClosedProcedures.length} procedimientos | 
                    {filteredAlerts.length} alertas
                  </span>
                </div>
              )}
            </div>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <TabsContent value="pacientes" className="space-y-4">
                <div className="grid gap-4">
                  {paginatedPatients.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        {searchTerm ? (
                          <div>
                            <p className="text-gray-500 mb-2">
                              No se encontraron pacientes que coincidan con "{searchTerm}"
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSearchTerm("")}
                            >
                              Limpiar búsqueda
                            </Button>
                          </div>
                        ) : (
                          <p className="text-gray-500">No hay pacientes registrados</p>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    paginatedPatients.map((patient) => {
                      const getPatientBadge = (status: string) => {
                        switch (status) {
                          case "active":
                            return <Badge variant="default" className="bg-green-100 text-green-800">En Tratamiento</Badge>
                          case "completed":
                            return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Tratamiento Completado</Badge>
                          case "inactive":
                            return <Badge variant="outline" className="bg-gray-100 text-gray-600">Inactivo</Badge>
                          default:
                            return <Badge variant="outline">{status}</Badge>
                        }
                      }

                      return (
                        <Card key={patient.id}>
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-lg">{patient.name}</CardTitle>
                                <CardDescription>
                                  ID: {patient.identification} • Edad: {patient.age} años
                                </CardDescription>
                              </div>
                              {getPatientBadge(patient.status || "inactive")}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-600">Estado</p>
                                <p className="capitalize">{patient.status === "active" ? "En tratamiento" : patient.status === "completed" ? "Completado" : "Inactivo"}</p>
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
                                <p className="font-medium text-gray-600">Registrado</p>
                                <p>{formatTimestampForColombia(patient.created_at)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                  
                  {/* Paginación para Pacientes */}
                  <PaginationControls
                    currentPage={currentPagePatients}
                    totalPages={totalPagesPatients}
                    onPageChange={goToPagePatients}
                    totalItems={filteredPatients.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </div>
              </TabsContent>

              <TabsContent value="procedimientos" className="space-y-4">
                <div className="grid gap-4">
                  {paginatedProcedures.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        {searchTerm ? (
                          <div>
                            <p className="text-gray-500 mb-2">
                              No se encontraron procedimientos que coincidan con "{searchTerm}"
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSearchTerm("")}
                            >
                              Limpiar búsqueda
                            </Button>
                          </div>
                        ) : (
                          <p className="text-gray-500">No hay procedimientos cerrados</p>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    paginatedProcedures.map((procedure: any) => (
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
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Procedimiento Cerrado
                              </Badge>
                              <Link href={`/procedimiento/${procedure.id}`}>
                                <Button variant="outline" size="sm">
                                  Ver Historial
                                </Button>
                              </Link>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-600">Fecha</p>
                              <div className="flex items-center text-gray-900">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formatDateForColombia(procedure.procedure_date)}
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
                              <p className="font-medium text-gray-600">Ubicación</p>
                              <p className="text-gray-900">{procedure.location || 'No especificada'}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Máquina</p>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-gray-900 truncate cursor-default">{getMachineDisplayName(procedure.machine?.model || '', procedure.machine?.lote || '')}</p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-xs">
                                  <div className="space-y-1">
                                    <p className="font-medium">{getMachineDisplayName(procedure.machine?.model || '', procedure.machine?.lote || '')}</p>
                                    {procedure.machine?.lote && <p className="text-xs text-muted-foreground">Lote: {procedure.machine.lote}</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div>
                              <p className="font-medium text-gray-600">Finalizado</p>
                              <p className="text-gray-900">
                                {procedure.updated_at ? formatTimestampForColombia(procedure.updated_at) : 'N/A'}
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
                  
                  {/* Paginación para Procedimientos */}
                  <PaginationControls
                    currentPage={currentPageProcedures}
                    totalPages={totalPagesProcedures}
                    onPageChange={goToPageProcedures}
                    totalItems={filteredClosedProcedures.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </div>
              </TabsContent>

              <TabsContent value="alertas" className="space-y-4">
                <div className="grid gap-4">
                  {paginatedAlerts.length === 0 ? (
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <AlertTriangle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                        {searchTerm ? (
                          <div>
                            <p className="text-gray-500 mb-2">
                              No se encontraron alertas que coincidan con "{searchTerm}"
                            </p>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSearchTerm("")}
                            >
                              Limpiar búsqueda
                            </Button>
                          </div>
                        ) : (
                          <p className="text-gray-500">No hay alertas de inventario</p>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    paginatedAlerts.map((alert, index) => (
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
                    ))
                  )}
                  
                  {/* Paginación para Alertas */}
                  <PaginationControls
                    currentPage={currentPageAlerts}
                    totalPages={totalPagesAlerts}
                    onPageChange={goToPageAlerts}
                    totalItems={filteredAlerts.length}
                    itemsPerPage={ITEMS_PER_PAGE}
                  />
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
    </TooltipProvider>
  )
})

export default function Dashboard() {
  return (
    <ProtectedRoute requiredRole={["administrador", "soporte", "asistente"]}>
      <DashboardContent />
    </ProtectedRoute>
  )
}
