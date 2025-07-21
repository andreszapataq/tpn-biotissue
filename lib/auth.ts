import { supabase } from "./supabase"

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
  mfa_enabled: boolean
}

function getBaseUrl() {
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXT_PUBLIC_SITE_URL || "https://tpn-biotissue.vercel.app"
  }
  return typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
}

export class AuthService {
  static async signUp(
    email: string,
    password: string,
    userData: {
      name: string
      role: "cirujano" | "soporte" | "administrador" | "financiero"
      phone?: string
      department?: string
      license_number?: string
    },
  ) {
    const baseUrl = getBaseUrl()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
        emailRedirectTo: `${baseUrl}/auth/callback`,
      },
    })

    return { data, error }
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    return { data, error }
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      console.log("👤 Getting current user...")

      // Timeout para evitar esperas infinitas
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("User fetch timeout")), 10000)
      })

      const userPromise = (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          console.log("❌ No authenticated user found")
          return null
        }

        console.log("✅ Found authenticated user:", user.email)

        // Intentar obtener el perfil
        const { data: profile, error } = await supabase.from("users").select("*").eq("auth_id", user.id).single()

        if (error || !profile) {
          console.warn("⚠️ Profile not found, creating...")

          // Determinar el rol correcto (migrar 'enfermera' a 'soporte')
          let userRole = user.user_metadata?.role || "soporte"
          if (userRole === "enfermera") {
            userRole = "soporte"
          }

          // Crear perfil si no existe
          const { data: newProfile, error: insertError } = await supabase
            .from("users")
            .insert({
              auth_id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || user.email || "",
              role: userRole,
              phone: user.user_metadata?.phone || null,
              department: user.user_metadata?.department || null,
              license_number: user.user_metadata?.license_number || null,
              is_active: true,
              mfa_enabled: false,
            })
            .select()
            .single()

          if (insertError) {
            console.error("❌ Error creating profile:", insertError)
            return null
          }

          if (newProfile) {
            console.log("✅ Profile created:", newProfile.name)
            return {
              id: newProfile.id,
              email: newProfile.email,
              name: newProfile.name,
              role: newProfile.role,
              mfa_enabled: newProfile.mfa_enabled || false,
            }
          }
        }

        if (profile) {
          // Migrar rol 'enfermera' a 'soporte' si es necesario
          if (profile.role === "enfermera") {
            console.log("🔄 Migrating role from 'enfermera' to 'soporte'")
            const { data: updatedProfile, error: updateError } = await supabase
              .from("users")
              .update({ role: "soporte", updated_at: new Date().toISOString() })
              .eq("id", profile.id)
              .select()
              .single()

            if (updateError) {
              console.error("❌ Error updating role:", updateError)
            } else {
              profile.role = "soporte"
              console.log("✅ Role updated to 'soporte'")
            }
          }

          console.log("✅ Profile loaded:", profile.name)
          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            mfa_enabled: profile.mfa_enabled || false,
          }
        }

        return null
      })()

      return await Promise.race([userPromise, timeoutPromise])
    } catch (error) {
      console.error("❌ Error getting current user:", error)
      return null
    }
  }

  static async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })
    return { error }
  }

  static async resetPassword(email: string) {
    const baseUrl = getBaseUrl()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback`,
    })
    return { error }
  }

  // 🔧 NUEVO: Crear perfil manualmente cuando el trigger automático falla
  static async createUserProfile(authUser: any, userData: {
    name: string
    role: "cirujano" | "soporte" | "administrador" | "financiero"
    phone?: string
    department?: string
    license_number?: string
  }) {
    try {
      console.log("👤 Creating user profile manually...")
      
      const { data: profile, error } = await supabase
        .from("users")
        .insert({
          auth_id: authUser.id,
          email: authUser.email || userData.name + "@placeholder.com",
          name: userData.name,
          role: userData.role,
          phone: userData.phone || null,
          department: userData.department || null,
          license_number: userData.license_number || null,
          is_active: true,
          mfa_enabled: false,
        })
        .select()
        .single()

      if (error) {
        console.error("❌ Error creating user profile:", error)
        return { profile: null, error }
      }

      console.log("✅ User profile created manually:", profile.id)
      return { profile, error: null }
    } catch (err) {
      console.error("❌ Exception creating user profile:", err)
      return { profile: null, error: err }
    }
  }

  // Métodos privados
  private static async updateLastLogin(authId: string) {
    try {
      await supabase.from("users").update({ last_login: new Date().toISOString() }).eq("auth_id", authId)
    } catch (error) {
      console.error("❌ Error updating last login:", error)
    }
  }

  private static async logLoginAttempt(email: string, success: boolean, failureReason?: string) {
    try {
      await supabase.from("login_attempts").insert({
        email,
        success,
        failure_reason: failureReason,
        attempted_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("❌ Error logging login attempt:", error)
    }
  }
}
