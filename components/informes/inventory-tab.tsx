"use client"

import { TrendingUp, Package, AlertTriangle } from "lucide-react"
import { StatCard } from "./stat-card"
import { InventoryChart } from "./inventory-chart"
import { InventoryTable } from "./inventory-table"
import { formatCurrency, formatNumber } from "@/lib/informes/formatters"
import type { InventoryResult } from "@/lib/informes/types"
import { Skeleton } from "@/components/ui/skeleton"

interface InventoryTabProps {
  data: InventoryResult | null
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
        <Skeleton className="h-[280px] w-full" />
      </div>
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  )
}

export function InventoryTab({ data, loading }: InventoryTabProps) {
  if (loading) return <LoadingSkeleton />
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Valor en Stock"
          value={formatCurrency(data.totalValue)}
          subtitle="Valor actual en bodega"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
          valueColor="text-emerald-600"
        />
        <StatCard
          title="Productos con Stock"
          value={formatNumber(data.productsWithStockCount)}
          subtitle="Tipos de producto activos"
          icon={Package}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <StatCard
          title="Stock Bajo"
          value={formatNumber(data.lowStockCount)}
          subtitle="Requieren reposición"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
          valueColor={data.lowStockCount > 0 ? "text-amber-600" : undefined}
        />
        <StatCard
          title="Mayor Stock"
          value={data.highestStockProduct.name}
          subtitle={`${formatNumber(data.highestStockProduct.quantity)} unidades disponibles`}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
      </div>

      {/* Chart */}
      <InventoryChart data={data.withStock} />

      {/* Table */}
      <InventoryTable
        withStock={data.withStock}
        outOfStock={data.outOfStock}
      />
    </div>
  )
}
