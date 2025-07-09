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
  refreshUser: () => Promise<void>
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

  const refreshUser = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        console.log("🔄 Refrescando datos del usuario...")
        const authUser = await createAuthUser(session.user)
        if (authUser) {
          console.log("✅ Usuario actualizado:", authUser.name, "- Rol:", authUser.role)
          setUser(authUser)
        }
      }
    } catch (error) {
      console.error("❌ Error refreshing user:", error)
    }
  }

  // 🔄 Función SIMPLIFICADA para login (temporal)
  const createAuthUser = async (sessionUser: any): Promise<AuthUser | null> => {
    try {
      console.log("🔍 Login simple para:", sessionUser.email)
      
      // Usar datos conocidos de la base de datos
      if (sessionUser.email === "admin@biotissue.com.co") {
        return {
          id: sessionUser.id,
          email: sessionUser.email,
          name: "Andres Zapata",
          role: "administrador",
          mfa_enabled: false,
        }
      }
      
      if (sessionUser.email === "danelly8712@hotmail.com") {
        return {
          id: sessionUser.id,
          email: sessionUser.email,
          name: "Leydy Gil",
          role: "soporte",
          mfa_enabled: false,
        }
      }

      if (sessionUser.email === "contacto@biotissue.com.co") {
        return {
          id: sessionUser.id,
          email: sessionUser.email,
          name: "Carlos Rojas",
          role: "soporte",
          mfa_enabled: false,
        }
      }

      // Para otros usuarios, usar datos de sesión
      return {
        id: sessionUser.id,
        email: sessionUser.email || "",
        name: sessionUser.user_metadata?.name || sessionUser.email || "",
        role: "soporte",
        mfa_enabled: false,
      }
    } catch (error) {
      console.error("❌ Error:", error)
      return null
    }
  }

  // Inicialización - obtener datos actuales
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          console.log("🔄 Inicializando auth con datos actuales de BD...")
          const authUser = await createAuthUser(session.user)
          if (authUser) {
            console.log("✅ Usuario cargado:", authUser.name, "- Rol:", authUser.role)
            setUser(authUser)
          }
        }
      } catch (error) {
        console.error("Auth error:", error)
      }
    }

    initAuth()

    // Listener para cambios de auth - usar datos actuales de BD
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        console.log("🔄 Login detectado, obteniendo datos actuales...")
        const authUser = await createAuthUser(session.user)
        if (authUser) {
          console.log("✅ Usuario autenticado:", authUser.name, "- Rol:", authUser.role)
          setUser(authUser)
        }
      } else if (event === "SIGNED_OUT") {
        console.log("👋 Usuario desconectado")
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

  return <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>{children}</AuthContext.Provider>
}
