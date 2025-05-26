"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import type { AuthUser } from "@/lib/auth"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(false) // Cambiar a false por defecto
  const router = useRouter()
  const pathname = usePathname()

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push("/auth/login")
  }

  // Inicialización simple - solo una vez
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          // Crear usuario simple desde la sesión
          const authUser: AuthUser = {
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.user_metadata?.name || session.user.email || "",
            role: session.user.user_metadata?.role || "enfermera",
            mfa_enabled: false,
          }
          setUser(authUser)
        }
      } catch (error) {
        console.error("Auth error:", error)
      }
    }

    initAuth()

    // Listener simple para cambios de auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.user_metadata?.name || session.user.email || "",
          role: session.user.user_metadata?.role || "enfermera",
          mfa_enabled: false,
        }
        setUser(authUser)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // Redirección simple
  useEffect(() => {
    const isAuthPage = pathname?.startsWith("/auth")

    if (!user && !isAuthPage) {
      router.push("/auth/login")
    } else if (user && isAuthPage && pathname !== "/auth/callback") {
      router.push("/")
    }
  }, [user, pathname, router])

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}
