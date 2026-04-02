"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { InstitutionCard } from "./institution-card"

type InstitutionStatus = {
  institution_id: string
  institution_name: string
  institution_code: string
  is_warehouse: boolean
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

interface InstitutionCardsSectionProps {
  filteredInstitutions: InstitutionStatus[]
  retirablesByInstitution: Map<string, IdleMachine[]>
  searchTerm: string
  onSearchChange: (value: string) => void
  activeFilter: FilterTab
  onFilterChange: (value: FilterTab) => void
  tabCounts: Record<FilterTab, number>
}

export function InstitutionCardsSection({
  filteredInstitutions,
  retirablesByInstitution,
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
  tabCounts,
}: InstitutionCardsSectionProps) {
  return (
    <section>
      <h2 className="heading-2 mb-4">Vista por Institucion</h2>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar institucion, equipo, lote..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Tabs value={activeFilter} onValueChange={(v) => onFilterChange(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="todos" className="gap-1.5">
              Todos
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tabCounts.todos}</Badge>
            </TabsTrigger>
            <TabsTrigger value="en_uso" className="gap-1.5">
              En uso
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tabCounts.en_uso}</Badge>
            </TabsTrigger>
            <TabsTrigger value="disponibles" className="gap-1.5">
              Disponibles
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tabCounts.disponibles}</Badge>
            </TabsTrigger>
            <TabsTrigger value="retirables" className="gap-1.5">
              Retirables
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tabCounts.retirables}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground mb-3">
        {filteredInstitutions.length} institucion{filteredInstitutions.length !== 1 ? "es" : ""}
      </p>

      {/* Cards grid */}
      {filteredInstitutions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No se encontraron instituciones con los filtros actuales.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredInstitutions.map((institution, index) => (
            <InstitutionCard
              key={institution.institution_id}
              institution={institution}
              retirables={retirablesByInstitution.get(institution.institution_id) || []}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  )
}
