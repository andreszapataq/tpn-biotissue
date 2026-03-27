"use client"

import { TrendingDown, Activity, DollarSign, Package } from "lucide-react"
import { StatCard } from "./stat-card"
import { ConsumptionChart } from "./consumption-chart"
import { ConsumptionTable } from "./consumption-table"
import { formatCurrency, formatNumber } from "@/lib/informes/formatters"
import type { ConsumptionResult } from "@/lib/informes/types"
import { Skeleton } from "@/components/ui/skeleton"

interface ConsumptionTabProps {
  data: ConsumptionResult | null
  loading: boolean
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-[300px] w-full" />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  )
}

export function ConsumptionTab({ data, loading }: ConsumptionTabProps) {
  if (loading) return <LoadingSkeleton />
  if (!data) return null

  const { consumedProducts, unusedProducts, zeroPriceProducts, summary, totalValue } = data

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Consumido"
          value={formatCurrency(summary.total_value)}
          subtitle="Valor del período"
          icon={TrendingDown}
          iconColor="text-destructive"
          iconBg="bg-destructive/10"
          valueColor="text-destructive"
        />
        <StatCard
          title="Procedimientos"
          value={formatNumber(summary.total_procedures)}
          subtitle="Realizados en el período"
          icon={Activity}
          iconColor="text-primary"
          iconBg="bg-primary/10"
        />
        <StatCard
          title="Costo Promedio"
          value={formatCurrency(summary.avg_value_per_procedure)}
          subtitle="Por procedimiento"
          icon={DollarSign}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <StatCard
          title="Más Utilizado"
          value={summary.most_used_product.name}
          subtitle={`${formatNumber(summary.most_used_product.quantity)} unidades`}
          icon={Package}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
        />
      </div>

      {/* Chart */}
      <ConsumptionChart data={consumedProducts} />

      {/* Table */}
      <ConsumptionTable
        consumedProducts={consumedProducts}
        zeroPriceProducts={zeroPriceProducts}
        unusedProducts={unusedProducts}
        totalValue={totalValue}
      />
    </div>
  )
}
