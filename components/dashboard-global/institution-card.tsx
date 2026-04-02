"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { UtilizationBar } from "@/components/ui/utilization-bar"
import { cn, formatTimestampForColombia } from "@/lib/utils"

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

interface InstitutionCardProps {
  institution: InstitutionStatus
  retirables: IdleMachine[]
  index: number
}

export function InstitutionCard({ institution, retirables, index }: InstitutionCardProps) {
  const utilization =
    institution.total_machines > 0
      ? Math.round((institution.connected_machines / institution.total_machines) * 100)
      : 0

  const isActive = institution.connected_machines > 0

  return (
    <Card
      className={cn(
        "overflow-hidden animate-fade-in-up bg-card/90 backdrop-blur-sm shadow-sm",
        "hover:shadow-md transition-all",
        isActive && "border-l-4 border-l-success"
      )}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <CardContent className="p-4">
        {/* Header: name + status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate" title={institution.institution_name}>
              {institution.institution_name}
            </h3>
            <p className="text-xs font-mono text-muted-foreground">{institution.institution_code}</p>
          </div>
          <StatusBadge
            status={isActive ? "active" : "inactive"}
            label={isActive ? "Activa" : "Inactiva"}
          />
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-info/5 rounded-lg p-2">
            <p className="text-xl font-bold tabular-nums text-info">{institution.connected_machines}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">En uso</p>
          </div>
          <div className="bg-success/5 rounded-lg p-2">
            <p className="text-xl font-bold tabular-nums text-success">{institution.available_machines}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Disponibles</p>
          </div>
          <div className="bg-warning/5 rounded-lg p-2">
            <p className="text-xl font-bold tabular-nums text-warning">{institution.active_patients}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Pacientes</p>
          </div>
        </div>

        {/* Utilization */}
        <div className="mt-3">
          <UtilizationBar
            value={utilization}
            size="sm"
            animated
            label={`${institution.connected_machines}/${institution.total_machines} equipos`}
          />
        </div>

        {/* Footer: retirables + last activity */}
        <div className="mt-3 flex items-center justify-between gap-2">
          {retirables.length > 0 ? (
            <Badge variant="warning" className="text-xs">
              {retirables.length} retirable{retirables.length !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <span />
          )}
          {institution.last_activity_at && (
            <p className="text-[10px] text-muted-foreground truncate">
              {formatTimestampForColombia(institution.last_activity_at)}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
