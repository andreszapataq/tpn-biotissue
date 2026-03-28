"use client"

import { AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { UtilizationBar } from "@/components/ui/utilization-bar"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { formatTimestampForColombia } from "@/lib/utils"

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

interface InstitutionAccordionItemProps {
  institution: InstitutionStatus
  retirables: IdleMachine[]
  index: number
}

function formatIdleTime(hours: number | null, neverUsed: boolean): string {
  if (neverUsed) return "Nunca usada"
  if (!hours) return "Sin datos"
  if (hours < 24) return `${Math.round(hours)}h inactiva`
  const days = Math.floor(hours / 24)
  const remainingHours = Math.round(hours % 24)
  return `${days}d ${remainingHours}h inactiva`
}

export function InstitutionAccordionItem({ institution, retirables, index }: InstitutionAccordionItemProps) {
  const utilization =
    institution.total_machines > 0
      ? Math.round((institution.connected_machines / institution.total_machines) * 100)
      : 0

  const isActive = institution.connected_machines > 0

  return (
    <AccordionItem
      value={institution.institution_id}
      className={cn(
        "border rounded-xl mb-2 bg-card overflow-hidden animate-fade-in-up",
        isActive && "border-l-4 border-l-success"
      )}
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      <AccordionTrigger className="hover:no-underline px-5 py-4">
        <div className="flex items-center justify-between w-full gap-4 mr-4">
          {/* Left: name + code + badges */}
          <div className="text-left min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">{institution.institution_name}</p>
            <p className="text-xs font-mono text-muted-foreground">{institution.institution_code}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <StatusBadge
                status={isActive ? "active" : "inactive"}
                label={isActive ? "Activa" : "Inactiva"}
              />
              {retirables.length > 0 && (
                <Badge variant="warning" className="text-xs">
                  {retirables.length} retirable{retirables.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          {/* Right: machines ratio + bar */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-16 text-right">
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {institution.connected_machines}
              </span>
              <span className="text-sm text-muted-foreground">/{institution.total_machines}</span>
            </div>
            <div className="w-24 hidden md:block">
              <UtilizationBar value={utilization} size="sm" animated showPercentage={false} />
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent>
        <div className="px-5 pb-2">
          <Separator className="mb-4" />

          {/* Metric grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="label-text">Pacientes</p>
              <p className="text-lg font-semibold text-foreground">{institution.active_patients}</p>
            </div>
            <div>
              <p className="label-text">Procedimientos</p>
              <p className="text-lg font-semibold text-foreground">{institution.active_procedures}</p>
            </div>
            <div>
              <p className="label-text">Conectadas</p>
              <p className="text-lg font-semibold text-info">{institution.connected_machines}</p>
            </div>
            <div>
              <p className="label-text">Disponibles</p>
              <p className="text-lg font-semibold text-success">{institution.available_machines}</p>
            </div>
            <div>
              <p className="label-text">Mantenimiento</p>
              <p className="text-lg font-semibold text-foreground">{institution.maintenance_machines}</p>
            </div>
          </div>

          {/* Utilization bar */}
          <div className="mt-4">
            <UtilizationBar value={utilization} size="md" animated label="Utilizacion del parque" />
          </div>

          {/* Last activity */}
          {institution.last_activity_at && (
            <p className="text-xs text-muted-foreground mt-3">
              Ultima actividad: {formatTimestampForColombia(institution.last_activity_at)}
            </p>
          )}

          {/* Retirables inline */}
          {retirables.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="label-text mb-2">Equipos retirables en esta sede</p>
              <div className="flex flex-wrap gap-2">
                {retirables.map((m) => (
                  <Badge key={m.machine_id} variant="warning" className="text-xs font-mono">
                    Lote {m.machine_lote} — {formatIdleTime(m.idle_hours, m.never_used)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
