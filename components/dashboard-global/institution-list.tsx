"use client"

import { Search, X } from "lucide-react"
import { Accordion } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InstitutionAccordionItem } from "@/components/dashboard-global/institution-accordion-item"

type InstitutionStatus = {
  institution_id: string
  institution_name: string
  institution_code: string
  active_patients: number
  active_procedures: number
  total_machines: number
  connected_machines: number
  available_machines: number
  maintenance_machines: number
  inactive_machines: number
  last_activity_at: string | null
}

type IdleMachine = {
  machine_id: string
  institution_id: string
  institution_name: string
  machine_model: string
  machine_lote: string
  last_activity_at: string | null
  idle_hours: number | null
  never_used: boolean
}

type FilterTab = "todos" | "en_uso" | "disponibles" | "retirables"

interface InstitutionListProps {
  filteredInstitutions: InstitutionStatus[]
  retirablesByInstitution: Map<string, IdleMachine[]>
  searchTerm: string
  onSearchChange: (value: string) => void
  activeFilter: FilterTab
  onFilterChange: (value: FilterTab) => void
  tabCounts: { todos: number; en_uso: number; disponibles: number; retirables: number }
}

export function InstitutionList({
  filteredInstitutions,
  retirablesByInstitution,
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
  tabCounts,
}: InstitutionListProps) {
  return (
    <div className="space-y-4">
      {/* Search + Tabs */}
      <div className="space-y-3">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar equipo, lote o institucion..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-9 h-11 bg-card/90 backdrop-blur-sm"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-target"
              aria-label="Limpiar busqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <Tabs value={activeFilter} onValueChange={(v) => onFilterChange(v as FilterTab)}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="todos" className="gap-1.5 text-xs sm:text-sm">
              Todos
              <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-5 min-w-[1.25rem] justify-center">
                {tabCounts.todos}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="en_uso" className="gap-1.5 text-xs sm:text-sm">
              <span className="hidden sm:inline">En Uso</span>
              <span className="sm:hidden">Uso</span>
              <Badge variant="info" className="ml-1 text-xs px-1.5 py-0 h-5 min-w-[1.25rem] justify-center">
                {tabCounts.en_uso}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="disponibles" className="gap-1.5 text-xs sm:text-sm">
              <span className="hidden sm:inline">Disponibles</span>
              <span className="sm:hidden">Disp.</span>
              <Badge variant="success" className="ml-1 text-xs px-1.5 py-0 h-5 min-w-[1.25rem] justify-center">
                {tabCounts.disponibles}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="retirables" className="gap-1.5 text-xs sm:text-sm">
              <span className="hidden sm:inline">Retirables</span>
              <span className="sm:hidden">Ret.</span>
              <Badge variant="warning" className="ml-1 text-xs px-1.5 py-0 h-5 min-w-[1.25rem] justify-center">
                {tabCounts.retirables}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {filteredInstitutions.length} institucion{filteredInstitutions.length !== 1 ? "es" : ""}
        </span>
      </div>

      {/* Accordion list */}
      {filteredInstitutions.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <p>No se encontraron instituciones con estos criterios.</p>
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="text-primary hover:underline mt-2 text-xs"
            >
              Limpiar busqueda
            </button>
          )}
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-0">
          {filteredInstitutions.map((inst, i) => (
            <InstitutionAccordionItem
              key={inst.institution_id}
              institution={inst}
              retirables={retirablesByInstitution.get(inst.institution_id) || []}
              index={i}
            />
          ))}
        </Accordion>
      )}
    </div>
  )
}
