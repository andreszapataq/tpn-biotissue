"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type DomainStatus =
  | "available"
  | "in_use"
  | "maintenance"
  | "inactive"
  | "active"
  | "completed"
  | "cancelled"
  | "stock_ok"
  | "stock_low"
  | "stock_out"
  | "stock_medium"
  | "never_used"
  | "idle"

const statusConfig: Record<DomainStatus, { variant: "success" | "warning" | "info" | "neutral" | "destructive" | "default"; label: string }> = {
  available: { variant: "success", label: "Disponible" },
  active: { variant: "success", label: "Activo" },
  stock_ok: { variant: "success", label: "Stock OK" },
  completed: { variant: "success", label: "Completado" },
  in_use: { variant: "warning", label: "En uso" },
  stock_medium: { variant: "warning", label: "Stock Medio" },
  maintenance: { variant: "info", label: "Mantenimiento" },
  idle: { variant: "info", label: "Inactiva" },
  stock_low: { variant: "warning", label: "Stock Bajo" },
  inactive: { variant: "neutral", label: "Sin actividad" },
  never_used: { variant: "neutral", label: "Nunca usada" },
  cancelled: { variant: "destructive", label: "Cancelado" },
  stock_out: { variant: "destructive", label: "Sin Stock" },
}

interface StatusBadgeProps {
  status: DomainStatus
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={cn(className)}>
      {label ?? config.label}
    </Badge>
  )
}
