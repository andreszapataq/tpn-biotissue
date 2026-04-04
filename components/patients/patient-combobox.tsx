"use client"

import { useState, useEffect } from "react"
import { ChevronsUpDown, Check, UserPlus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"

interface PatientData {
  patientName: string
  patientId: string
  patientAge: string
}

interface PatientRow {
  id: string
  name: string
  identification: string
  age: number
}

interface PatientComboboxProps {
  institutionId: string | null
  patientName: string
  patientId: string
  patientAge: string
  onPatientChange: (data: PatientData) => void
  disabled?: boolean
  nameInputRef?: React.RefObject<HTMLInputElement | null>
}

export function PatientCombobox({
  institutionId,
  patientName,
  patientId,
  patientAge,
  onPatientChange,
  disabled = false,
  nameInputRef,
}: PatientComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [patients, setPatients] = useState<PatientRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(searchValue, 300)

  // Fetch patients when popover opens or search changes
  useEffect(() => {
    if (!open || !institutionId) return

    const fetchPatients = async () => {
      setLoading(true)
      const term = debouncedSearch.trim()

      let query = supabase
        .from("patients")
        .select("id, name, identification, age")
        .eq("institution_id", institutionId)

      if (term) {
        query = query.or(
          `name.ilike.%${term}%,identification.ilike.%${term}%`
        )
        query = query.order("name", { ascending: true })
      } else {
        query = query.order("updated_at", { ascending: false })
      }

      query = query.limit(10)

      const { data } = await query
      setPatients((data as PatientRow[]) || [])
      setLoading(false)
    }

    fetchPatients()
  }, [open, institutionId, debouncedSearch])

  const handleSelect = (patient: PatientRow) => {
    setSelectedPatientId(patient.id)
    onPatientChange({
      patientName: patient.name,
      patientId: patient.identification,
      patientAge: String(patient.age),
    })
    setOpen(false)
  }

  const handleNewPatient = () => {
    setSelectedPatientId(null)
    onPatientChange({
      patientName: "",
      patientId: "",
      patientAge: "",
    })
    setOpen(false)
    // Focus the name input after the popover closes
    setTimeout(() => nameInputRef?.current?.focus(), 100)
  }

  const displayValue = patientName
    ? patientId
      ? `${patientName} — ${patientId}`
      : patientName
    : null

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (isOpen) setSearchValue("")
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !displayValue && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {displayValue || "Buscar paciente por nombre o ID..."}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre o identificación..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-60 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
              </div>
            ) : (
              <>
                {patients.length === 0 && (
                  <CommandEmpty>
                    {debouncedSearch.trim()
                      ? "No se encontraron pacientes."
                      : "No hay pacientes registrados."}
                  </CommandEmpty>
                )}
                {patients.length > 0 && (
                  <CommandGroup heading={debouncedSearch.trim() ? "Resultados" : "Pacientes recientes"}>
                    {patients.map((patient) => (
                      <CommandItem
                        key={patient.id}
                        value={patient.id}
                        onSelect={() => handleSelect(patient)}
                        className="py-2.5"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedPatientId === patient.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{patient.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {patient.identification} · {patient.age} años
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleNewPatient}
                    className="py-2.5"
                  >
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <span>Nuevo paciente</span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
