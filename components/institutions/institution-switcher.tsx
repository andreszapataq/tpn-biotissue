"use client"

import { Building2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useInstitution } from "@/components/institutions/institution-provider"

export function InstitutionSwitcher() {
  const { availableInstitutions, canSelectInstitution, selectedInstitutionId, selectedInstitutionName, setSelectedInstitutionId } =
    useInstitution()

  if (availableInstitutions.length === 0) {
    return null
  }

  if (!canSelectInstitution) {
    return (
      <div className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm text-gray-700">
        <Building2 className="h-4 w-4 text-gray-500" />
        <span>{selectedInstitutionName}</span>
      </div>
    )
  }

  return (
    <div className="w-full sm:w-72">
      <Select value={selectedInstitutionId || ""} onValueChange={setSelectedInstitutionId}>
        <SelectTrigger>
          <SelectValue placeholder="Seleccionar institución" />
        </SelectTrigger>
        <SelectContent>
          {availableInstitutions.map((institution) => (
            <SelectItem key={institution.id} value={institution.id}>
              {institution.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
