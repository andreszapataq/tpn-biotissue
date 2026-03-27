"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar, FileText, Loader2 } from "lucide-react"
import type { DateRangeType } from "@/lib/informes/types"

interface ReportFiltersProps {
  dateRange: DateRangeType
  onDateRangeChange: (value: DateRangeType) => void
  startDate: string
  endDate: string
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onGenerate: () => void
  loading: boolean
  rangeLabel: string
  exportButton?: React.ReactNode
}

export function ReportFilters({
  dateRange,
  onDateRangeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onGenerate,
  loading,
  rangeLabel,
  exportButton,
}: ReportFiltersProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4 text-blue-600" />
          Período del Reporte
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <Label className="text-xs text-muted-foreground">Período</Label>
            <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as DateRangeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoy</SelectItem>
                <SelectItem value="this_week">Últimos 7 días</SelectItem>
                <SelectItem value="this_month">Este mes</SelectItem>
                <SelectItem value="this_year">Este año</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <>
              <div>
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex items-end gap-2">
            <Button onClick={onGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generar
            </Button>
            {exportButton}
          </div>

          {rangeLabel && (
            <div className="flex items-end">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{rangeLabel}</span>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
