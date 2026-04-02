"use client"

import { Activity, Building2, Clock, MonitorSmartphone, Package, Users } from "lucide-react"
import { KpiCard } from "@/components/ui/kpi-card"

interface KpiStripProps {
  totalMachines: number
  connectedMachines: number
  availableMachines: number
  activePatients: number
  institutionCount: number
  utilization: number
  idleMachinesCount: number
}

export function KpiStrip({
  totalMachines,
  connectedMachines,
  availableMachines,
  activePatients,
  institutionCount,
  utilization,
  idleMachinesCount,
}: KpiStripProps) {
  const cardClass = "bg-card/90 backdrop-blur-sm shadow-sm hover:shadow-md transition-all"

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard
        title="FLOTA TOTAL"
        value={totalMachines}
        subtitle={`${institutionCount} sedes`}
        icon={MonitorSmartphone}
        iconColor="text-primary"
        iconBg="bg-primary/10"
        valueSize="large"
        className={cardClass}
        animationDelay="0s"
      />
      <KpiCard
        title="EN USO"
        value={connectedMachines}
        subtitle={`${utilization}% utilizacion`}
        icon={Activity}
        iconColor="text-info"
        iconBg="bg-info/10"
        valueSize="large"
        className={cardClass}
        animationDelay="0.05s"
      />
      <KpiCard
        title="DISPONIBLES"
        value={availableMachines}
        subtitle="listas para asignar"
        icon={Package}
        iconColor="text-success"
        iconBg="bg-success/10"
        valueSize="large"
        className={cardClass}
        animationDelay="0.1s"
      />
      <KpiCard
        title="PACIENTES"
        value={activePatients}
        subtitle="casos activos"
        icon={Users}
        iconColor="text-warning"
        iconBg="bg-warning/10"
        valueSize="large"
        className={cardClass}
        animationDelay="0.15s"
      />
      <KpiCard
        title="INSTITUCIONES"
        value={institutionCount}
        subtitle="sedes conectadas"
        icon={Building2}
        iconColor="text-primary"
        iconBg="bg-primary/10"
        valueSize="large"
        className={cardClass}
        animationDelay="0.2s"
      />
      <KpiCard
        title="RETIRABLES"
        value={idleMachinesCount}
        subtitle="sin actividad >72h"
        icon={Clock}
        iconColor="text-destructive"
        iconBg="bg-destructive/10"
        valueSize="large"
        className={cardClass}
        animationDelay="0.25s"
      />
    </div>
  )
}
