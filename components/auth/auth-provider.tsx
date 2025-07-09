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

  // 🔄 Función para crear usuario con datos actuales de BD
  const createAuthUser = async (sessionUser: any): Promise<AuthUser | null> => {
    try {
      // 1️⃣ Obtener datos actuales del usuario desde la tabla users
      const { data: userProfile, error } = await supabase
        .from("users")
        .select("role, mfa_enabled, name")
        .eq("auth_id", sessionUser.id)
        .single()

      if (error) {
        console.warn("⚠️ User profile not found, using session data")
        // Fallback a datos de sesión si no hay perfil
        return {
          id: sessionUser.id,
          email: sessionUser.email || "",
          name: sessionUser.user_metadata?.name || sessionUser.email || "",
          role: sessionUser.user_metadata?.role || "soporte",
          mfa_enabled: false,
        }
      }

      // 2️⃣ Crear usuario con datos actuales de BD
      return {
        id: sessionUser.id,
        email: sessionUser.email || "",
        name: userProfile.name || sessionUser.user_metadata?.name || sessionUser.email || "",
        role: userProfile.role, // 🎯 ROL ACTUAL desde BD, no cacheado
        mfa_enabled: userProfile.mfa_enabled || false,
      }
    } catch (error) {
      console.error("❌ Error getting user profile:", error)
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
