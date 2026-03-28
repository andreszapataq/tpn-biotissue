"use client"

import { Clock3 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

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

interface RetirablesPanelProps {
  idleMachines: IdleMachine[]
}

function formatIdleHours(hours: number | null): string {
  if (!hours) return "—"
  if (hours < 24) return `${Math.round(hours)}h`
  const days = Math.floor(hours / 24)
  const remaining = Math.round(hours % 24)
  return `${days}d ${remaining}h`
}

export function RetirablesPanel({ idleMachines }: RetirablesPanelProps) {
  return (
    <Card className={cn("bg-card/90 backdrop-blur-sm", idleMachines.length > 3 && "border-warning/30")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-warning" />
          <span className="uppercase tracking-wider text-sm">Retiros</span>
          {idleMachines.length > 0 && (
            <Badge variant="warning" className="ml-auto text-xs">
              {idleMachines.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Equipos sin actividad {">"}72h o nunca usados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {idleMachines.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay maquinas candidatas para retiro.
          </p>
        ) : (
          <ScrollArea className="h-[calc(100vh-420px)] min-h-[200px]">
            <div className="space-y-2 pr-3">
              {idleMachines.map((machine, index) => {
                const isHighSeverity = (machine.idle_hours ?? 0) > 120
                const borderColor = machine.never_used
                  ? "border-l-warning"
                  : isHighSeverity
                    ? "border-l-destructive"
                    : "border-l-neutral"

                return (
                  <div
                    key={machine.machine_id}
                    className={cn(
                      "rounded-lg border border-l-4 p-3 animate-fade-in-up space-y-1.5 bg-card",
                      borderColor
                    )}
                    style={{ animationDelay: `${index * 0.04}s` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="text-xs font-medium mb-1">
                          {machine.machine_model}
                        </Badge>
                        <p className="text-xs font-mono text-muted-foreground">
                          Lote {machine.machine_lote}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {machine.never_used ? (
                          <StatusBadge status="never_used" />
                        ) : (
                          <span className={cn(
                            "text-lg font-bold tabular-nums",
                            isHighSeverity ? "text-destructive" : "text-warning"
                          )}>
                            {formatIdleHours(machine.idle_hours)}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {machine.institution_name}
                    </p>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
