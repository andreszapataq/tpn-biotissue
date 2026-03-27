"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Pie, PieChart, Cell } from "recharts"
import { formatCurrency } from "@/lib/informes/formatters"
import type { InventoryReport } from "@/lib/informes/types"

interface InventoryChartProps {
  data: InventoryReport[]
}

const CATEGORY_COLORS: Record<string, string> = {
  "Apósitos": "hsl(200, 70%, 50%)",
  "Canisters": "hsl(150, 60%, 45%)",
  "Accesorios": "hsl(280, 55%, 55%)",
}

const DEFAULT_COLOR = "hsl(220, 15%, 60%)"

export function InventoryChart({ data }: InventoryChartProps) {
  if (data.length === 0) return null

  // Agrupar por categoría
  const categoryMap = new Map<string, number>()
  for (const item of data) {
    if (item.stock_value === 0) continue
    const current = categoryMap.get(item.category) || 0
    categoryMap.set(item.category, current + item.stock_value)
  }

  if (categoryMap.size === 0) return null

  const chartData = [...categoryMap.entries()].map(([category, value]) => ({
    name: category,
    value,
    fill: CATEGORY_COLORS[category] || DEFAULT_COLOR,
  }))

  const chartConfig: ChartConfig = {}
  for (const item of chartData) {
    chartConfig[item.name] = {
      label: item.name,
      color: item.fill,
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribución de Valor por Categoría</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[280px] w-full">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => [formatCurrency(value as number), "Valor"]}
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
