"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ChevronDown, ChevronUp, Package, Wrench } from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/informes/formatters"
import type { ConsumptionData } from "@/lib/informes/types"

type SortField = "product" | "quantity"
type SortDir = "asc" | "desc"

interface ConsumptionTableProps {
  consumedProducts: ConsumptionData[]
  zeroPriceProducts: ConsumptionData[]
  unusedProducts: ConsumptionData[]
  totalValue: number
}

function sortConsumption(items: ConsumptionData[], field: SortField, dir: SortDir) {
  return [...items].sort((a, b) => {
    if (field === "product") {
      return dir === "asc"
        ? a.product_name.localeCompare(b.product_name)
        : b.product_name.localeCompare(a.product_name)
    }
    return dir === "asc"
      ? a.total_consumed - b.total_consumed
      : b.total_consumed - a.total_consumed
  })
}

export function ConsumptionTable({
  consumedProducts,
  zeroPriceProducts,
  unusedProducts,
  totalValue,
}: ConsumptionTableProps) {
  const [unusedOpen, setUnusedOpen] = useState(false)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir(field === "product" ? "asc" : "desc")
    }
  }

  const sorted = sortField
    ? sortConsumption(consumedProducts, sortField, sortDir)
    : consumedProducts

  const hasConsumed = consumedProducts.length > 0
  const hasZeroPrice = zeroPriceProducts.length > 0
  const hasUnused = unusedProducts.length > 0

  if (!hasConsumed && !hasZeroPrice && !hasUnused) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay datos de consumo en el período seleccionado</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabla principal: productos con consumo y precio > 0 */}
      {hasConsumed && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalle de Consumo por Producto</CardTitle>
            <CardDescription>
              {consumedProducts.length} productos consumidos en el período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => toggleSort("product")}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Producto
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="text-right">
                    <button
                      onClick={() => toggleSort("quantity")}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    >
                      Cantidad
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Precio Unit.</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Proced.</TableHead>
                  <TableHead className="text-right hidden lg:table-cell">Pacientes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {item.product_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.product_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(item.total_consumed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-destructive">
                      {formatCurrency(item.total_value)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden lg:table-cell">
                      {formatNumber(item.procedures_count)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden lg:table-cell">
                      {formatNumber(item.patients_count)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5} className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-bold tabular-nums text-destructive">
                    {formatCurrency(totalValue)}
                  </TableCell>
                  <TableCell colSpan={2} className="hidden lg:table-cell" />
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sección de accesorios (precio $0) */}
      {hasZeroPrice && (
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Accesorios Utilizados
            </CardTitle>
            <CardDescription>
              {zeroPriceProducts.length} accesorios sin costo unitario asignado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Procedimientos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zeroPriceProducts.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell className="font-medium">{item.product_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {item.product_code}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(item.total_consumed)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {formatNumber(item.procedures_count)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sección colapsable: sin uso */}
      {hasUnused && (
        <Collapsible open={unusedOpen} onOpenChange={setUnusedOpen}>
          <Card className="border-dashed">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50"
              >
                <span className="text-sm text-muted-foreground">
                  {unusedProducts.length} productos sin consumo en este período
                </span>
                {unusedOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {unusedProducts.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex items-center gap-2 text-sm text-muted-foreground py-1.5 px-2 rounded-md bg-muted/30"
                    >
                      <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                        {item.product_code}
                      </Badge>
                      <span className="truncate">{item.product_name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}
    </div>
  )
}
