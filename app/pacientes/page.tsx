"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Search, Eye, Calendar, Activity } from "lucide-react"
import Link from "next/link"

// Datos simulados de pacientes
const allPatients = [
  {
    id: 1,
    name: "María González",
    identification: "12345678",
    age: 45,
    status: "active",
    currentTreatment: {
      machine: "NPWT-001",
      dressing: "VAC Granufoam",
      lastProcedure: "2024-01-20",
      nextChange: "2024-01-23",
      startDate: "2024-01-15",
    },
    procedures: [
      { date: "2024-01-20", surgeon: "Dr. López", diagnosis: "Úlcera diabética pie derecho" },
      { date: "2024-01-17", surgeon: "Dr. López", diagnosis: "Úlcera diabética pie derecho" },
      { date: "2024-01-15", surgeon: "Dr. López", diagnosis: "Úlcera diabética pie derecho" },
    ],
  },
  {
    id: 2,
    name: "Carlos Rodríguez",
    identification: "87654321",
    age: 62,
    status: "active",
    currentTreatment: {
      machine: "NPWT-002",
      dressing: "VAC WhiteFoam",
      lastProcedure: "2024-01-21",
      nextChange: "2024-01-24",
      startDate: "2024-01-18",
    },
    procedures: [
      { date: "2024-01-21", surgeon: "Dr. Martínez", diagnosis: "Herida quirúrgica infectada" },
      { date: "2024-01-18", surgeon: "Dr. Martínez", diagnosis: "Herida quirúrgica infectada" },
    ],
  },
  {
    id: 3,
    name: "Ana Fernández",
    identification: "11223344",
    age: 38,
    status: "completed",
    lastTreatment: {
      endDate: "2024-01-10",
      totalDays: 12,
      outcome: "Curación completa",
    },
    procedures: [
      { date: "2024-01-10", surgeon: "Dr. García", diagnosis: "Herida traumática" },
      { date: "2024-01-07", surgeon: "Dr. García", diagnosis: "Herida traumática" },
      { date: "2024-01-04", surgeon: "Dr. García", diagnosis: "Herida traumática" },
    ],
  },
]

export default function Pacientes() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPatient, setSelectedPatient] = useState<(typeof allPatients)[0] | null>(null)

  const filteredPatients = allPatients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) || patient.identification.includes(searchTerm),
  )

  const activePatients = filteredPatients.filter((p) => p.status === "active")
  const completedPatients = filteredPatients.filter((p) => p.status === "completed")

  return (
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Pacientes */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="activos" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="activos">Pacientes Activos ({activePatients.length})</TabsTrigger>
                <TabsTrigger value="completados">Tratamientos Completados ({completedPatients.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="activos" className="space-y-4">
                {activePatients.map((patient) => (
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
                          <p className="font-medium text-gray-600">Máquina</p>
                          <p>{patient.currentTreatment.machine}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Último Procedimiento</p>
                          <p>{patient.currentTreatment.lastProcedure}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Apósito Actual</p>
                          <p>{patient.currentTreatment.dressing}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Próximo Cambio</p>
                          <p className="text-orange-600 font-medium">{patient.currentTreatment.nextChange}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="completados" className="space-y-4">
                {completedPatients.map((patient) => (
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
                          <p className="font-medium text-gray-600">Fecha de Finalización</p>
                          <p>{patient.lastTreatment?.endDate}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600">Duración Total</p>
                          <p>{patient.lastTreatment?.totalDays} días</p>
                        </div>
                        <div className="col-span-2">
                          <p className="font-medium text-gray-600">Resultado</p>
                          <p className="text-green-600">{patient.lastTreatment?.outcome}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
                      <p>
                        <span className="font-medium">Estado:</span>
                        <Badge variant={selectedPatient.status === "active" ? "default" : "secondary"} className="ml-2">
                          {selectedPatient.status === "active" ? "Activo" : "Completado"}
                        </Badge>
                      </p>
                    </div>
                  </div>

                  {selectedPatient.status === "active" && selectedPatient.currentTreatment && (
                    <div>
                      <h4 className="font-semibold mb-2">Tratamiento Actual</h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Inicio:</span> {selectedPatient.currentTreatment.startDate}
                        </p>
                        <p>
                          <span className="font-medium">Máquina:</span> {selectedPatient.currentTreatment.machine}
                        </p>
                        <p>
                          <span className="font-medium">Apósito:</span> {selectedPatient.currentTreatment.dressing}
                        </p>
                        <p>
                          <span className="font-medium">Próximo cambio:</span>{" "}
                          {selectedPatient.currentTreatment.nextChange}
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Historial de Procedimientos
                    </h4>
                    <div className="space-y-2">
                      {selectedPatient.procedures.map((procedure, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          <p className="font-medium">{procedure.date}</p>
                          <p className="text-gray-600">{procedure.surgeon}</p>
                          <p className="text-xs text-gray-500">{procedure.diagnosis}</p>
                        </div>
                      ))}
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
      </div>
    </div>
  )
}
