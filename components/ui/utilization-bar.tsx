"use client"

import { cn } from "@/lib/utils"

interface UtilizationBarProps {
  value: number
  size?: "sm" | "md"
  animated?: boolean
  label?: string
  showPercentage?: boolean
}

function getBarColor(value: number): string {
  if (value < 40) return "bg-warning"
  if (value <= 75) return "bg-info"
  return "bg-success"
}

export function UtilizationBar({
  value,
  size = "sm",
  animated = false,
  label,
  showPercentage = true,
}: UtilizationBarProps) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const barHeight = size === "sm" ? "h-2" : "h-3"

  return (
    <div className="space-y-1.5">
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="text-xs font-medium text-foreground">
              {Math.round(clamped)}%
            </span>
          )}
        </div>
      )}
      <div className={cn("rounded-full bg-muted overflow-hidden", barHeight)}>
        <div
          className={cn(
            "h-full rounded-full transition-all",
            getBarColor(clamped),
            animated && "animate-bar-grow"
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
