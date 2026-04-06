"use client"

import { useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
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
} from "@/components/ui/command"

interface InstitutionMultiSelectProps {
  institutions: { id: string; name: string }[]
  selectedIds: string[]
  onToggle: (institutionId: string, checked: boolean) => void
}

export function InstitutionMultiSelect({
  institutions,
  selectedIds,
  onToggle,
}: InstitutionMultiSelectProps) {
  const [open, setOpen] = useState(false)

  const selectedCount = selectedIds.length

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal h-10",
              selectedCount === 0 && "text-muted-foreground"
            )}
          >
            <span className="truncate">
              {selectedCount === 0
                ? "Seleccionar instituciones..."
                : selectedCount === 1
                  ? "1 institución seleccionada"
                  : `${selectedCount} instituciones seleccionadas`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
          onWheel={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder="Buscar institución..." />
            <CommandList className="max-h-60 overflow-y-auto overscroll-contain">
              <CommandEmpty>No se encontraron instituciones.</CommandEmpty>
              <CommandGroup>
                {institutions.map((institution) => {
                  const isSelected = selectedIds.includes(institution.id)
                  return (
                    <CommandItem
                      key={institution.id}
                      value={institution.name}
                      onSelect={() => onToggle(institution.id, !isSelected)}
                      className="py-2.5"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span>{institution.name}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {institutions
            .filter((inst) => selectedIds.includes(inst.id))
            .map((inst) => (
              <Badge key={inst.id} variant="secondary" className="gap-1 pr-1">
                {inst.name}
                <button
                  type="button"
                  onClick={() => onToggle(inst.id, false)}
                  className="ml-0.5 rounded-sm hover:bg-muted-foreground/20 p-0.5"
                  aria-label={`Quitar ${inst.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
        </div>
      )}
    </div>
  )
}
