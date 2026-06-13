"use client"

import { Fragment, useCallback, useEffect, useRef, useState } from "react"
import {
  Search,
  X,
  RotateCcw,
  MonitorSmartphone,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  BatteryCharging,
  Loader2,
  ArrowRight,
} from "lucide-react"
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
import { cn, getMachineDisplayName, formatDateForColombia } from "@/lib/utils"
import { MACHINE_MODELS } from "@/lib/constants"
import { supabase } from "@/lib/supabase"

export interface GlobalMachine {
  machine_id: string
  lote: string
  model: string
  reference_code: string
  status: string
  remision: string | null
  observations: string | null
  last_maintenance: string | null
  battery_replaced_at: string | null
  institution_id: string
  institution_name: string
  institution_code: string
  is_in_use: boolean
  created_at: string
  total_count: number
}

type TransferEntry = {
  id: string
  transfer_date: string | null
  remision: string | null
  notes: string | null
  from_institution: { name: string } | null
  to_institution: { name: string } | null
}

interface InstitutionOption {
  institution_id: string
  institution_name: string
}

type SortDir = "asc" | "desc"

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
  sortField: string
  sortDir: SortDir
  onSortChange: (field: string, dir: SortDir) => void
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
  sortField,
  sortDir,
  onSortChange,
  page,
  onPageChange,
  institutions,
}: GlobalMachineSearchProps) {
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [transfersByMachine, setTransfersByMachine] = useState<Record<string, TransferEntry[]>>({})
  const [loadingTransfers, setLoadingTransfers] = useState<Record<string, boolean>>({})

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

  const loadTransfers = useCallback(
    async (machineId: string) => {
      if (transfersByMachine[machineId] || loadingTransfers[machineId]) return
      setLoadingTransfers((prev) => ({ ...prev, [machineId]: true }))
      try {
        const { data, error } = await supabase
          .from("machine_transfers")
          .select(
            `id, transfer_date, remision, notes,
             from_institution:institutions!machine_transfers_from_institution_id_fkey(name),
             to_institution:institutions!machine_transfers_to_institution_id_fkey(name)`
          )
          .eq("machine_id", machineId)
          .order("transfer_date", { ascending: false })
        if (error) throw error
        setTransfersByMachine((prev) => ({ ...prev, [machineId]: (data as unknown as TransferEntry[]) || [] }))
      } catch (err) {
        console.error("Error loading machine transfers:", err)
        setTransfersByMachine((prev) => ({ ...prev, [machineId]: [] }))
      } finally {
        setLoadingTransfers((prev) => ({ ...prev, [machineId]: false }))
      }
    },
    [transfersByMachine, loadingTransfers]
  )

  const toggleExpand = (machineId: string) => {
    if (expandedId === machineId) {
      setExpandedId(null)
    } else {
      setExpandedId(machineId)
      void loadTransfers(machineId)
    }
  }

  const toggleSort = (field: string) => {
    if (sortField === field) {
      onSortChange(field, sortDir === "asc" ? "desc" : "asc")
    } else {
      onSortChange(field, "asc")
    }
  }

  const hasFilters = searchTerm || institutionFilter || modelFilter || statusFilter

  const resetFilters = () => {
    onSearchChange("")
    onInstitutionFilterChange("")
    onModelFilterChange("")
    onStatusFilterChange("")
    onPageChange(0)
  }

  const SortHeader = ({
    field,
    label,
    className,
  }: {
    field: string
    label: string
    className?: string
  }) => {
    const active = sortField === field
    const Icon = active ? (sortDir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className={cn(
            "inline-flex items-center gap-1 hover:text-foreground transition-colors",
            active ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          {label}
          <Icon className={cn("h-3.5 w-3.5", active ? "opacity-100" : "opacity-40")} />
        </button>
      </TableHead>
    )
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
      <div className="rounded-lg border bg-card/90 backdrop-blur-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <SortHeader field="lote" label="Lote" />
              <SortHeader field="model" label="Modelo" />
              <SortHeader field="reference_code" label="Ref." className="hidden md:table-cell" />
              <SortHeader field="institution_name" label="Institucion" />
              <SortHeader field="status" label="Estado" />
              <SortHeader field="last_maintenance" label="Ult. Mant." className="hidden lg:table-cell" />
              <SortHeader field="battery_replaced_at" label="Bateria" className="hidden lg:table-cell" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
                </TableRow>
              ))
            ) : machines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <MonitorSmartphone className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground">No se encontraron equipos con los filtros actuales.</p>
                </TableCell>
              </TableRow>
            ) : (
              machines.map((machine) => {
                const effectiveStatus = getEffectiveStatus(machine.status, machine.is_in_use)
                const isExpanded = expandedId === machine.machine_id
                return (
                  <Fragment key={machine.machine_id}>
                    <TableRow
                      onClick={() => toggleExpand(machine.machine_id)}
                      className={cn("cursor-pointer hover:bg-muted/50", isExpanded && "bg-muted/40")}
                    >
                      <TableCell className="text-muted-foreground">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </TableCell>
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
                      <TableCell className="hidden lg:table-cell text-sm">
                        {machine.battery_replaced_at ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <BatteryCharging className="h-3.5 w-3.5" />
                            {formatDateForColombia(machine.battery_replaced_at)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${machine.machine_id}-detail`} className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={8} className="py-4">
                          <div className="grid gap-4 sm:grid-cols-2 px-2">
                            {/* Machine details */}
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <BatteryCharging className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Bateria instalada:</span>
                                <span className="font-medium">
                                  {machine.battery_replaced_at
                                    ? formatDateForColombia(machine.battery_replaced_at)
                                    : "No registrada"}
                                </span>
                              </div>
                              <div className="lg:hidden flex items-center gap-2">
                                <span className="text-muted-foreground">Ult. mantenimiento:</span>
                                <span className="font-medium">
                                  {machine.last_maintenance
                                    ? formatDateForColombia(machine.last_maintenance)
                                    : "No registrado"}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Observaciones: </span>
                                <span className="font-medium">{machine.observations || "Ninguna"}</span>
                              </div>
                            </div>

                            {/* Transfer history */}
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Historial de traslados
                              </p>
                              {loadingTransfers[machine.machine_id] ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Cargando...
                                </div>
                              ) : (transfersByMachine[machine.machine_id]?.length ?? 0) === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin traslados registrados.</p>
                              ) : (
                                <ul className="space-y-1.5">
                                  {transfersByMachine[machine.machine_id]?.map((t) => (
                                    <li key={t.id} className="text-sm flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-mono text-muted-foreground">
                                        {t.transfer_date ? formatDateForColombia(t.transfer_date.split("T")[0]) : "—"}
                                      </span>
                                      <span>{t.from_institution?.name || "—"}</span>
                                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-medium">{t.to_institution?.name || "—"}</span>
                                      {t.remision && (
                                        <Badge variant="outline" className="font-mono text-[10px]">
                                          {t.remision}
                                        </Badge>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
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
