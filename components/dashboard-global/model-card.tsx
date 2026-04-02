"use client"

import { useState } from "react"
import { MonitorSmartphone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UtilizationBar } from "@/components/ui/utilization-bar"
import { cn } from "@/lib/utils"
import type { MachineModel } from "@/lib/constants"

interface ModelCardProps {
  model: MachineModel
  totalCount: number
  inUseCount: number
  availableCount: number
  maintenanceCount: number
  index: number
}

export function ModelCard({
  model,
  totalCount,
  inUseCount,
  availableCount,
  maintenanceCount,
  index,
}: ModelCardProps) {
  const utilization = totalCount > 0 ? Math.round((inUseCount / totalCount) * 100) : 0
  const [imgError, setImgError] = useState(false)

  return (
    <Card
      className={cn(
        "relative overflow-hidden bg-card/90 backdrop-blur-sm shadow-sm",
        "hover:shadow-md hover:border-primary/20 transition-all",
        "animate-fade-in-up"
      )}
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <CardContent className="p-4">
        {/* Image area */}
        <div className="aspect-[4/3] bg-muted/50 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
          {!imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={model.image}
              alt={model.name}
              className="object-contain w-full h-full p-2"
              onError={() => setImgError(true)}
            />
          ) : (
            <MonitorSmartphone className="h-16 w-16 text-muted-foreground/40" />
          )}
        </div>

        {/* Model name */}
        <h3 className="font-semibold text-sm text-foreground leading-tight truncate" title={model.name}>
          {model.shortName}
        </h3>
        {model.subtitle && (
          <p className="text-xs text-muted-foreground">{model.subtitle}</p>
        )}
        <p className="text-xs font-mono text-muted-foreground mt-0.5">Ref: {model.code}</p>

        {/* Counts */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">En uso</span>
            <Badge variant="info" className="text-xs tabular-nums">{inUseCount}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Disponibles</span>
            <Badge variant="success" className="text-xs tabular-nums">{availableCount}</Badge>
          </div>
          {maintenanceCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Mant.</span>
              <Badge variant="warning" className="text-xs tabular-nums">{maintenanceCount}</Badge>
            </div>
          )}
        </div>

        {/* Utilization bar */}
        <div className="mt-3">
          <UtilizationBar value={utilization} size="sm" animated label={`Total: ${totalCount}`} />
        </div>
      </CardContent>
    </Card>
  )
}
