"use client"

import { useState, useEffect } from "react"
import { ChevronsUpDown, Check, UserPlus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useDebounce } from "@/hooks/use-debounce"
import { Button } from "@/components/ui/button"
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

interface SpecialistData {
  specialistName: string
  specialistSpecialty: string
  specialistId?: string
}

interface SpecialistRow {
  id: string
  name: string
  specialty: string
}

interface SpecialistComboboxProps {
  institutionId: string | null
  specialistName: string
  specialistSpecialty: string
  onSpecialistChange: (data: SpecialistData) => void
  disabled?: boolean
  nameInputRef?: React.RefObject<HTMLInputElement | null>
}

export function SpecialistCombobox({
  institutionId,
  specialistName,
  specialistSpecialty,
  onSpecialistChange,
  disabled = false,
  nameInputRef,
}: SpecialistComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [specialists, setSpecialists] = useState<SpecialistRow[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const debouncedSearch = useDebounce(searchValue, 300)

  useEffect(() => {
    if (!open || !institutionId) return

    const fetchSpecialists = async () => {
      setLoading(true)
      const term = debouncedSearch.trim()

      let query = supabase
        .from("specialists")
        .select("id, name, specialty")
        .eq("institution_id", institutionId)

      if (term) {
        query = query.or(
          `name.ilike.%${term}%,specialty.ilike.%${term}%`
        )
        query = query.order("name", { ascending: true })
      } else {
        query = query.order("updated_at", { ascending: false })
      }

      query = query.limit(10)

      const { data } = await query
      setSpecialists((data as SpecialistRow[]) || [])
      setLoading(false)
    }

    fetchSpecialists()
  }, [open, institutionId, debouncedSearch])

  const handleSelect = (specialist: SpecialistRow) => {
    setSelectedId(specialist.id)
    onSpecialistChange({
      specialistName: specialist.name,
      specialistSpecialty: specialist.specialty,
      specialistId: specialist.id,
    })
    setOpen(false)
  }

  const handleNewSpecialist = () => {
    setSelectedId(null)
    onSpecialistChange({
      specialistName: "",
      specialistSpecialty: "",
      specialistId: undefined,
    })
    setOpen(false)
    setTimeout(() => nameInputRef?.current?.focus(), 100)
  }

  const displayValue = specialistName
    ? specialistSpecialty
      ? `${specialistName} — ${specialistSpecialty}`
      : specialistName
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
            {displayValue || "Buscar especialista por nombre o especialidad..."}
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
            placeholder="Buscar por nombre o especialidad..."
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
                {specialists.length === 0 && (
                  <CommandEmpty>
                    {debouncedSearch.trim()
                      ? "No se encontraron especialistas."
                      : "No hay especialistas registrados."}
                  </CommandEmpty>
                )}
                {specialists.length > 0 && (
                  <CommandGroup heading={debouncedSearch.trim() ? "Resultados" : "Especialistas recientes"}>
                    {specialists.map((specialist) => (
                      <CommandItem
                        key={specialist.id}
                        value={specialist.id}
                        onSelect={() => handleSelect(specialist)}
                        className="py-2.5"
                      >
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedId === specialist.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium truncate">{specialist.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {specialist.specialty}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleNewSpecialist}
                    className="py-2.5"
                  >
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                    <span>Nuevo especialista</span>
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
