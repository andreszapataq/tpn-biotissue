"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { useAuth } from "@/components/auth/auth-provider"

interface InstitutionContextValue {
  selectedInstitutionId: string | null
  selectedInstitutionName: string | null
  availableInstitutions: { id: string; name: string; code: string }[]
  canSelectInstitution: boolean
  setSelectedInstitutionId: (institutionId: string) => void
}

const InstitutionContext = createContext<InstitutionContextValue | undefined>(undefined)

const STORAGE_KEY = "tpn-active-institution-id"

export function InstitutionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [selectedInstitutionId, setSelectedInstitutionIdState] = useState<string | null>(null)

  const availableInstitutions = useMemo(() => {
    if (!user) {
      return []
    }

    return user.memberships.map((membership) => ({
      id: membership.institution_id,
      name: membership.institution_name,
      code: membership.institution_code,
    }))
  }, [user])

  useEffect(() => {
    if (!user) {
      setSelectedInstitutionIdState(null)
      return
    }

    const storedInstitutionId =
      typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null

    const validInstitutionIds = new Set(availableInstitutions.map((institution) => institution.id))
    const fallbackInstitutionId = user.institution_id || availableInstitutions[0]?.id || null

    if (storedInstitutionId && validInstitutionIds.has(storedInstitutionId)) {
      setSelectedInstitutionIdState(storedInstitutionId)
      return
    }

    setSelectedInstitutionIdState(fallbackInstitutionId)
  }, [user, availableInstitutions])

  const setSelectedInstitutionId = (institutionId: string) => {
    setSelectedInstitutionIdState(institutionId)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, institutionId)
    }
  }

  const selectedInstitution =
    availableInstitutions.find((institution) => institution.id === selectedInstitutionId) || null

  return (
    <InstitutionContext.Provider
      value={{
        selectedInstitutionId,
        selectedInstitutionName: selectedInstitution?.name || null,
        availableInstitutions,
        canSelectInstitution: availableInstitutions.length > 1,
        setSelectedInstitutionId,
      }}
    >
      {children}
    </InstitutionContext.Provider>
  )
}

export function useInstitution() {
  const context = useContext(InstitutionContext)

  if (!context) {
    throw new Error("useInstitution must be used within an InstitutionProvider")
  }

  return context
}
