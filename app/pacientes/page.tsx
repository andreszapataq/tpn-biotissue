"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageHeader } from "@/components/ui/page-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Search, Eye, Activity, Loader2, Plus, FileText, ExternalLink, X } from "lucide-react"
import Link from "next/link"
import { supabase, type Patient } from "@/lib/supabase"
import { formatTimestampForColombia } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { InstitutionSwitcher } from "@/components/institutions/institution-switcher"
import { useInstitution } from "@/components/institutions/institution-provider"

interface ProcedureInfo {
  id: string
  patient_id: string | null
  status: string | null
  updated_at: string | null
  procedure_date: string
  diagnosis: string
  surgeon_name: string
}

interface PatientProcedureSummary {
  totalProcedures: number
  activeProcedures: number
  completedProcedures: number
  lastClosedAt: string | null
  procedures: ProcedureInfo[]
}

interface PatientWithProcedures extends Patient {
  procedureSummary: PatientProcedureSummary
}

const emptyProcedureSummary: PatientProcedureSummary = {
  totalProcedures: 0,
  activeProcedures: 0,
  completedProcedures: 0,
  lastClosedAt: null,
  procedures: [],
}

function buildProcedureSummaryMap(procedures: ProcedureInfo[]): Map<string, PatientProcedureSummary> {
  const map = new Map<string, PatientProcedureSummary>()

  for (const proc of procedures) {
    if (!proc.patient_id) continue

    let summary = map.get(proc.patient_id)
    if (!summary) {
      summary = {
        totalProcedures: 0,
        activeProcedures: 0,
        completedProcedures: 0,
        lastClosedAt: null,
        procedures: [],
      }
      map.set(proc.patient_id, summary)
    }

    summary.totalProcedures++
    if (proc.status === "active") summary.activeProcedures++
    if (proc.status === "completed") {
      summary.completedProcedures++
      if (proc.updated_at && (!summary.lastClosedAt || proc.updated_at > summary.lastClosedAt)) {
        summary.lastClosedAt = proc.updated_at
      }
    }
    summary.procedures.push(proc)
  }

  return map
}

export default function Pacientes() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<PatientWithProcedures | null>(null)
  const [patients, setPatients] = useState<PatientWithProcedures[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const { selectedInstitutionId } = useInstitution()

  const loadPatients = async () => {
    try {
      setLoading(true)
      if (!selectedInstitutionId) {
        setPatients([])
        return
      }

      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("institution_id", selectedInstitutionId)
        .order("name", { ascending: true })

      if (error) throw error

      const validPatients = (data || []).map(patient => ({
        ...patient,
        status: (patient.status as "active" | "completed" | "inactive") || "inactive",
        created_at: patient.created_at || new Date().toISOString(),
        updated_at: patient.updated_at || new Date().toISOString()
      }))

      const patientIds = validPatients.map(p => p.id)

      let summaryMap = new Map<string, PatientProcedureSummary>()

      if (patientIds.length > 0) {
        const { data: proceduresData, error: procError } = await supabase
          .from("procedures")
          .select("id, patient_id, status, updated_at, procedure_date, diagnosis, surgeon_name")
          .in("patient_id", patientIds)
          .order("procedure_date", { ascending: false })

        if (procError) {
          console.error("Error loading procedures:", procError)
        } else {
          summaryMap = buildProcedureSummaryMap(proceduresData || [])
        }
      }

      const patientsWithProcedures: PatientWithProcedures[] = validPatients.map(p => ({
        ...p,
        procedureSummary: summaryMap.get(p.id) || emptyProcedureSummary,
      }))

      setPatients(patientsWithProcedures)
    } catch (error: any) {
      console.error("Error loading patients:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los pacientes",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPatients()
  }, [selectedInstitutionId])

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.identification.includes(searchTerm),
  )

  const activePatients = filteredPatients.filter((p) => p.procedureSummary.activeProcedures > 0)
  const completedPatients = filteredPatients.filter((p) => p.procedureSummary.activeProcedures === 0 && p.procedureSummary.totalProcedures > 0)

  return (
    <ProtectedRoute requiredRole={["administrador", "soporte", "asistente"]}>
      <div className="page-shell">
        <div className="page-container-medium">
          {/* Header */}
          <PageHeader
            title="Gestión de Pacientes"
            subtitle="Control y seguimiento de pacientes en terapia NPWT"
            backHref="/"
            actions={<InstitutionSwitcher />}
          />

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nombre o identificación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No hay pacientes registrados</p>
                <Link href="/nuevo-procedimiento">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Paciente
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Lista de Pacientes */}
              <div className="lg:col-span-2">
                <Tabs defaultValue="activos" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="activos">Pacientes Activos ({activePatients.length})</TabsTrigger>
                    <TabsTrigger value="completados">Tratamientos Completados ({completedPatients.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="activos" className="space-y-4">
                    {activePatients.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">No hay pacientes activos</p>
                        </CardContent>
                      </Card>
                    ) : (
                      activePatients.map((patient) => (
                        <Card key={patient.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold">{patient.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  ID: {patient.identification} • {patient.age} años
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status="active" />
                                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver Detalles
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-muted-foreground">Registrado</p>
                                <p>{formatTimestampForColombia(patient.created_at)}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">Procedimientos Activos</p>
                                <p>{patient.procedureSummary.activeProcedures}</p>
                              </div>
                            </div>
                            {patient.procedureSummary.totalProcedures > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {patient.procedureSummary.totalProcedures} procedimiento{patient.procedureSummary.totalProcedures !== 1 ? "s" : ""} en total
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="completados" className="space-y-4">
                    {completedPatients.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">No hay tratamientos completados</p>
                        </CardContent>
                      </Card>
                    ) : (
                      completedPatients.map((patient) => (
                        <Card key={patient.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold">{patient.name}</h3>
                                <p className="text-sm text-muted-foreground">
                                  ID: {patient.identification} • {patient.age} años
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusBadge status="completed" />
                                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver Historial
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-muted-foreground">Último Cierre</p>
                                <p>{patient.procedureSummary.lastClosedAt
                                  ? formatTimestampForColombia(patient.procedureSummary.lastClosedAt)
                                  : "Sin fecha de cierre"}</p>
                              </div>
                              <div>
                                <p className="font-medium text-muted-foreground">Registrado</p>
                                <p>{formatTimestampForColombia(patient.created_at)}</p>
                              </div>
                            </div>
                            {patient.procedureSummary.totalProcedures > 0 && (
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">
                                  {patient.procedureSummary.totalProcedures} procedimiento{patient.procedureSummary.totalProcedures !== 1 ? "s" : ""} en total
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </div>

              {/* Panel de Detalles */}
              <div className="lg:col-span-1">
                {selectedPatient ? (
                  <Card className="sticky top-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Detalles del Paciente
                      </CardTitle>
                      <CardDescription>{selectedPatient.name}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <h4 className="font-semibold mb-2">Información Personal</h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">ID:</span> {selectedPatient.identification}
                          </p>
                          <p>
                            <span className="font-medium">Edad:</span> {selectedPatient.age} años
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Estado:</span>
                            <StatusBadge status={selectedPatient.procedureSummary.activeProcedures > 0 ? "active" : "completed"} />
                          </div>
                          <p>
                            <span className="font-medium">Registrado:</span> {formatTimestampForColombia(selectedPatient.created_at)}
                          </p>
                          {selectedPatient.procedureSummary.lastClosedAt && (
                            <p>
                              <span className="font-medium">Último Cierre:</span> {formatTimestampForColombia(selectedPatient.procedureSummary.lastClosedAt)}
                            </p>
                          )}
                          <p>
                            <span className="font-medium">Procedimientos:</span>{" "}
                            {selectedPatient.procedureSummary.activeProcedures > 0 && (
                              <span className="text-primary">{selectedPatient.procedureSummary.activeProcedures} activo{selectedPatient.procedureSummary.activeProcedures !== 1 ? "s" : ""}</span>
                            )}
                            {selectedPatient.procedureSummary.activeProcedures > 0 && selectedPatient.procedureSummary.completedProcedures > 0 && ", "}
                            {selectedPatient.procedureSummary.completedProcedures > 0 && (
                              <span className="text-success">{selectedPatient.procedureSummary.completedProcedures} completado{selectedPatient.procedureSummary.completedProcedures !== 1 ? "s" : ""}</span>
                            )}
                            {selectedPatient.procedureSummary.totalProcedures === 0 && (
                              <span className="text-muted-foreground">Sin procedimientos</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Historial de Procedimientos */}
                      {selectedPatient.procedureSummary.procedures.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              Historial de Procedimientos
                            </h4>
                            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
                              {selectedPatient.procedureSummary.procedures.map((proc) => (
                                <div key={proc.id} className="border rounded-lg p-3 text-sm space-y-1">
                                  <div className="flex items-center justify-between">
                                    <StatusBadge status={proc.status === "active" ? "active" : "completed"} />
                                    <Link href={`/procedimiento/${proc.id}`}>
                                      <Button variant="ghost" size="sm" className="h-7 px-2">
                                        <ExternalLink className="h-3 w-3" />
                                      </Button>
                                    </Link>
                                  </div>
                                  <p className="text-muted-foreground">
                                    {formatTimestampForColombia(proc.procedure_date)}
                                  </p>
                                  <p className="text-foreground line-clamp-2">{proc.diagnosis}</p>
                                  <p className="text-muted-foreground text-xs">Dr. {proc.surgeon_name}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="sticky top-4">
                    <CardContent className="pt-6 text-center text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>Selecciona un paciente para ver sus detalles</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
