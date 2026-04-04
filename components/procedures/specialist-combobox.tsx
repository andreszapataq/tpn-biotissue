"use client"

import { useState, useEffect } from "react"
import { ChevronsUpDown, Check, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
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
} from "@/components/ui/command"

interface SpecialistComboboxProps {
  institutionId: string | null
  value: string
  onChange: (value: string) => void
  field: "surgeon_name" | "assistant_name"
  placeholder?: string
  disabled?: boolean
  required?: boolean
  id?: string
}

export function SpecialistCombobox({
  institutionId,
  value,
  onChange,
  field,
  placeholder = "Buscar especialista...",
  disabled = false,
  required = false,
  id,
}: SpecialistComboboxProps) {
  const [open, setOpen] = useState(false)
  const [names, setNames] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState("")
  const [loaded, setLoaded] = useState(false)

  // Load distinct names when popover opens
  useEffect(() => {
    if (!open || !institutionId || loaded) return

    const fetchNames = async () => {
      const { data } = await supabase
        .from("procedures")
        .select(field)
        .eq("institution_id", institutionId)
        .not(field, "is", null)
        .order(field, { ascending: true })

      if (data) {
        const unique = [...new Set(
          data.map((row) => row[field] as string).filter(Boolean)
        )]
        setNames(unique)
      }
      setLoaded(true)
    }

    fetchNames()
  }, [open, institutionId, field, loaded])

  // Reset cache when institution changes
  useEffect(() => {
    setLoaded(false)
    setNames([])
  }, [institutionId])

  const searchTrimmed = searchValue.trim()
  const exactMatch = names.some(
    (n) => n.toLowerCase() === searchTrimmed.toLowerCase()
  )

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen && searchTrimmed && !value) {
        // If user typed something and closed without selecting, use what they typed
        onChange(searchTrimmed)
      }
      if (isOpen) setSearchValue("")
    }}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal h-10",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {value || placeholder}
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
          <CommandInput
            placeholder={placeholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList className="max-h-60 overflow-y-auto overscroll-contain">
            <CommandEmpty>
              {searchTrimmed ? (
                <button
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                  onClick={() => {
                    onChange(searchTrimmed)
                    setOpen(false)
                  }}
                >
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  Usar: &ldquo;{searchTrimmed}&rdquo;
                </button>
              ) : (
                "No se encontraron especialistas."
              )}
            </CommandEmpty>
            <CommandGroup>
              {/* Show "use typed text" option when there's no exact match */}
              {searchTrimmed && !exactMatch && names.length > 0 && (
                <CommandItem
                  value={`__new__${searchTrimmed}`}
                  onSelect={() => {
                    onChange(searchTrimmed)
                    setOpen(false)
                  }}
                >
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <span>Usar: &ldquo;{searchTrimmed}&rdquo;</span>
                </CommandItem>
              )}
              {names.map((name) => (
                <CommandItem
                  key={name}
                  value={name}
                  onSelect={() => {
                    onChange(name)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
