"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Cell } from "recharts"
import { formatCurrency } from "@/lib/informes/formatters"
import type { ConsumptionData } from "@/lib/informes/types"

interface ConsumptionChartProps {
  data: ConsumptionData[]
}

function generateColors(count: number) {
  // Gradient from deep blue to light slate-blue
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1)
    const hue = 220 + t * 15          // 220 → 235
    const sat = 65 - t * 25           // 65% → 40%
    const light = 40 + t * 25         // 40% → 65%
    return `hsl(${hue}, ${sat}%, ${light}%)`
  })
}

const chartConfig = {
  valor: {
    label: "Valor Total",
    color: "hsl(220, 65%, 40%)",
  },
} satisfies ChartConfig

export function ConsumptionChart({ data }: ConsumptionChartProps) {
  if (data.length === 0) return null

  const top = data.slice(0, 8)
  const colors = generateColors(top.length)

  const chartData = top.map((item, index) => ({
    name: item.product_name.length > 22
      ? item.product_name.slice(0, 22) + "..."
      : item.product_name,
    fullName: item.product_name,
    valor: item.total_value,
    cantidad: item.total_consumed,
    fill: colors[index],
  }))

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Top Productos por Valor Consumido</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
              fontSize={12}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={160}
              fontSize={11}
              tickLine={false}
            />
            <ChartTooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0].payload
                return (
                  <div className="rounded-lg border bg-background p-2.5 shadow-md">
                    <p className="text-sm font-medium mb-1">{item.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.valor)}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={32}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
