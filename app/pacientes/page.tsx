"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Search, Eye, Calendar, Activity, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { supabase, type Patient } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { ProtectedRoute } from "@/components/auth/protected-route"

export default function Pacientes() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Cargar pacientes desde la base de datos
  const loadPatients = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("name", { ascending: true })

      if (error) throw error

      // Filtrar y mapear datos para asegurar tipos correctos
      const validPatients = (data || []).map(patient => ({
        ...patient,
        status: (patient.status as "active" | "completed" | "inactive") || "inactive",
        created_at: patient.created_at || new Date().toISOString(),
        updated_at: patient.updated_at || new Date().toISOString()
      }))

      setPatients(validPatients)
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
    loadPatients()
  }, [])

  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      patient.identification.includes(searchTerm),
  )

  const activePatients = filteredPatients.filter((p) => p.status === "active")
  const completedPatients = filteredPatients.filter((p) => p.status === "completed")

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
                <h1 className="text-3xl font-bold text-gray-900">Gestión de Pacientes</h1>
                <p className="text-gray-600">Control y seguimiento de pacientes en terapia NPWT</p>
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nombre o identificación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No hay pacientes registrados</p>
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
                          <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                          <p className="text-gray-500">No hay pacientes activos</p>
                        </CardContent>
                      </Card>
                    ) : (
                      activePatients.map((patient) => (
                        <Card key={patient.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold">{patient.name}</h3>
                                <p className="text-sm text-gray-600">
                                  ID: {patient.identification} • {patient.age} años
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="default">Activo</Badge>
                                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver Detalles
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-600">Estado</p>
                                <p className="capitalize">{patient.status}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-600">Creado</p>
                                <p>{new Date(patient.created_at).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </TabsContent>

                  <TabsContent value="completados" className="space-y-4">
                    {completedPatients.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <Activity className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                          <p className="text-gray-500">No hay tratamientos completados</p>
                        </CardContent>
                      </Card>
                    ) : (
                      completedPatients.map((patient) => (
                        <Card key={patient.id} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold">{patient.name}</h3>
                                <p className="text-sm text-gray-600">
                                  ID: {patient.identification} • {patient.age} años
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">Completado</Badge>
                                <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                                  <Eye className="h-3 w-3 mr-1" />
                                  Ver Historial
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="font-medium text-gray-600">Finalizado</p>
                                <p>{new Date(patient.updated_at).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="font-medium text-gray-600">Estado</p>
                                <p className="capitalize text-green-600">{patient.status}</p>
                              </div>
                            </div>
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
                            <Badge variant={selectedPatient.status === "active" ? "default" : "secondary"}>
                              {selectedPatient.status === "active" ? "Activo" : "Completado"}
                            </Badge>
                          </div>
                          <p>
                            <span className="font-medium">Creado:</span> {new Date(selectedPatient.created_at).toLocaleDateString()}
                          </p>
                          <p>
                            <span className="font-medium">Actualizado:</span> {new Date(selectedPatient.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="sticky top-4">
                    <CardContent className="pt-6 text-center text-gray-500">
                      <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
