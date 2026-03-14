"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { AuthService, type AuthUser } from "@/lib/auth"

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
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  const signOut = async () => {
    await AuthService.signOut()
    setUser(null)
    router.push("/auth/login")
  }

  const refreshUser = async () => {
    try {
      setLoading(true)
      const authUser = await AuthService.getCurrentUser()
      setUser(authUser)
    } catch (error) {
      console.error("Error refreshing user:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const initAuth = async () => {
      try {
        const authUser = await AuthService.getCurrentUser()
        setUser(authUser)
      } catch (error) {
        console.error("Auth error:", error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setUser(null)
        setLoading(false)
        return
      }

      window.setTimeout(() => {
        void refreshUser()
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (loading) {
      return
    }

    const isAuthPage = pathname?.startsWith("/auth")
    const isGlobalDashboard = pathname === "/dashboard-global"

    if (!user && !isAuthPage) {
      router.push("/auth/login")
    } else if (user?.role === "gerente" && !isAuthPage && !isGlobalDashboard) {
      router.push("/dashboard-global")
    } else if (user && isAuthPage && pathname !== "/auth/callback") {
      router.push(user.role === "gerente" ? "/dashboard-global" : "/")
    }
  }, [user, pathname, router, loading])

  return <AuthContext.Provider value={{ user, loading, signOut, refreshUser }}>{children}</AuthContext.Provider>
}
