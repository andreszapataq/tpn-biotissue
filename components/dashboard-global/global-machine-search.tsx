"use client"

import { useCallback, useEffect, useRef } from "react"
import { Search, X, RotateCcw, MonitorSmartphone } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getMachineDisplayName, formatDateForColombia } from "@/lib/utils"
import { MACHINE_MODELS } from "@/lib/constants"

export interface GlobalMachine {
  machine_id: string
  lote: string
  model: string
  reference_code: string
  status: string
  remision: string | null
  observations: string | null
  last_maintenance: string | null
  institution_id: string
  institution_name: string
  institution_code: string
  is_in_use: boolean
  created_at: string
  total_count: number
}

interface InstitutionOption {
  institution_id: string
  institution_name: string
}

interface GlobalMachineSearchProps {
  machines: GlobalMachine[]
  totalCount: number
  loading: boolean
  searchTerm: string
  onSearchChange: (v: string) => void
  institutionFilter: string
  onInstitutionFilterChange: (v: string) => void
  modelFilter: string
  onModelFilterChange: (v: string) => void
  statusFilter: string
  onStatusFilterChange: (v: string) => void
  page: number
  onPageChange: (p: number) => void
  institutions: InstitutionOption[]
}

const PAGE_SIZE = 25

function getEffectiveStatus(status: string, isInUse: boolean): "available" | "in_use" | "maintenance" {
  if (status === "maintenance") return "maintenance"
  return isInUse ? "in_use" : "available"
}

export function GlobalMachineSearch({
  machines,
  totalCount,
  loading,
  searchTerm,
  onSearchChange,
  institutionFilter,
  onInstitutionFilterChange,
  modelFilter,
  onModelFilterChange,
  statusFilter,
  onStatusFilterChange,
  page,
  onPageChange,
  institutions,
}: GlobalMachineSearchProps) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchInput = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onSearchChange(value)
        onPageChange(0)
      }, 500)
    },
    [onSearchChange, onPageChange]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const hasFilters = searchTerm || institutionFilter || modelFilter || statusFilter

  const resetFilters = () => {
    onSearchChange("")
    onInstitutionFilterChange("")
    onModelFilterChange("")
    onStatusFilterChange("")
    onPageChange(0)
  }

  return (
    <section>
      <h2 className="heading-2 mb-4">Listado Global de Equipos</h2>

      {/* Filter toolbar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 mb-4">
        {/* Search */}
        <div className="relative w-full lg:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar lote, modelo..."
            defaultValue={searchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchTerm && (
            <button
              onClick={() => {
                onSearchChange("")
                onPageChange(0)
                const input = document.querySelector<HTMLInputElement>(
                  'input[placeholder="Buscar lote, modelo..."]'
                )
                if (input) input.value = ""
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Institution filter */}
        <Select
          value={institutionFilter || "all"}
          onValueChange={(v) => {
            onInstitutionFilterChange(v === "all" ? "" : v)
            onPageChange(0)
          }}
        >
          <SelectTrigger className="w-full lg:w-52">
            <SelectValue placeholder="Institucion" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las instituciones</SelectItem>
            {institutions.map((inst) => (
              <SelectItem key={inst.institution_id} value={inst.institution_id}>
                {inst.institution_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Model filter */}
        <Select
          value={modelFilter || "all"}
          onValueChange={(v) => {
            onModelFilterChange(v === "all" ? "" : v)
            onPageChange(0)
          }}
        >
          <SelectTrigger className="w-full lg:w-52">
            <SelectValue placeholder="Modelo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los modelos</SelectItem>
            {MACHINE_MODELS.map((m) => (
              <SelectItem key={m.name} value={m.name}>
                {m.shortName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select
          value={statusFilter || "all"}
          onValueChange={(v) => {
            onStatusFilterChange(v === "all" ? "" : v)
            onPageChange(0)
          }}
        >
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="in_use">En uso</SelectItem>
            <SelectItem value="available">Disponibles</SelectItem>
            <SelectItem value="maintenance">Mantenimiento</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-2">
        {totalCount} equipo{totalCount !== 1 ? "s" : ""} encontrado{totalCount !== 1 ? "s" : ""}
      </p>

      {/* Table */}
      <div className="rounded-lg border bg-card/90 backdrop-blur-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead className="hidden md:table-cell">Ref.</TableHead>
              <TableHead>Institucion</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden lg:table-cell">Ult. Mant.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : machines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <MonitorSmartphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No se encontraron equipos con los filtros actuales.</p>
                </TableCell>
              </TableRow>
            ) : (
              machines.map((machine) => {
                const effectiveStatus = getEffectiveStatus(machine.status, machine.is_in_use)
                return (
                  <TableRow key={machine.machine_id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{machine.lote}</TableCell>
                    <TableCell>
                      <span className="text-sm">{getMachineDisplayName(machine.model)}</span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="font-mono text-xs">{machine.reference_code}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm truncate max-w-[200px]" title={machine.institution_name}>
                          {machine.institution_name}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground">{machine.institution_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={effectiveStatus} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {machine.last_maintenance
                        ? formatDateForColombia(machine.last_maintenance)
                        : "—"}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-muted-foreground">
            Pagina {page + 1} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
