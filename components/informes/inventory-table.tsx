"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Button } from "@/components/ui/button"
import { ArrowUpDown, ChevronDown, ChevronUp, Package } from "lucide-react"
import { formatCurrency, formatNumber } from "@/lib/informes/formatters"
import type { InventoryReport } from "@/lib/informes/types"

type SortField = "product" | "stock"
type SortDir = "asc" | "desc"

function sortInventory(items: InventoryReport[], field: SortField, dir: SortDir) {
  return [...items].sort((a, b) => {
    if (field === "product") {
      return dir === "asc"
        ? a.product_name.localeCompare(b.product_name)
        : b.product_name.localeCompare(a.product_name)
    }
    return dir === "asc"
      ? a.current_stock - b.current_stock
      : b.current_stock - a.current_stock
  })
}

interface InventoryTableProps {
  withStock: InventoryReport[]
  outOfStock: InventoryReport[]
}

function StockBar({ current, minimum }: { current: number; minimum: number }) {
  if (minimum === 0) return null
  const ratio = current / minimum
  const percent = Math.min(ratio * 50, 100) // 2x minimum = 100% bar
  let color = "bg-emerald-500"
  if (ratio < 1) color = "bg-destructive"
  else if (ratio < 1.5) color = "bg-amber-500"

  return (
    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function getStatusBadge(status: InventoryReport["status"]) {
  switch (status) {
    case "out_of_stock":
      return <Badge variant="destructive" className="text-[10px]">Agotado</Badge>
    case "low_stock":
      return <Badge variant="destructive" className="text-[10px] bg-amber-600">Stock Bajo</Badge>
    default:
      return <Badge variant="secondary" className="text-[10px]">Normal</Badge>
  }
}

export function InventoryTable({ withStock, outOfStock }: InventoryTableProps) {
  const [outOfStockOpen, setOutOfStockOpen] = useState(false)
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
    ? sortInventory(withStock, sortField, sortDir)
    : withStock

  if (withStock.length === 0 && outOfStock.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">No hay productos en el inventario</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tabla principal: productos con stock */}
      {withStock.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Inventario Actual</CardTitle>
            <CardDescription>
              {withStock.length} productos con stock disponible
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
                      onClick={() => toggleSort("stock")}
                      className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                    >
                      Stock
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Mínimo</TableHead>
                  <TableHead className="hidden sm:table-cell">Nivel</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Precio Unit.</TableHead>
                  <TableHead className="text-right">Valor Stock</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
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
                    <TableCell className="text-right tabular-nums font-medium">
                      {formatNumber(item.current_stock)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                      {formatNumber(item.minimum_stock)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StockBar current={item.current_stock} minimum={item.minimum_stock} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className={`text-right font-semibold tabular-nums ${item.stock_value === 0 ? 'text-muted-foreground' : 'text-emerald-600'}`}>
                      {formatCurrency(item.stock_value)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(item.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Sección colapsable: agotados */}
      {outOfStock.length > 0 && (
        <Collapsible open={outOfStockOpen} onOpenChange={setOutOfStockOpen}>
          <Card className="border-dashed">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-4 h-auto hover:bg-muted/50"
              >
                <span className="text-sm text-muted-foreground">
                  {outOfStock.length} productos agotados
                </span>
                {outOfStockOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {outOfStock.map((item) => (
                    <div
                      key={item.product_id}
                      className="flex items-center gap-2 text-sm text-muted-foreground py-1.5 px-2 rounded-md bg-destructive/5"
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
