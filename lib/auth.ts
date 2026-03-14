import { supabase } from "./supabase"
import { canSelfRegisterRole, hasGlobalVisibility, normalizeAppRole, type AppRole } from "./roles"

export interface UserInstitutionMembership {
  institution_id: string
  institution_name: string
  institution_code: string
  role: AppRole
  is_primary: boolean
}

export interface AuthUser {
  id: string
  profile_id: string | null
  email: string
  name: string
  role: AppRole
  mfa_enabled: boolean
  is_active: boolean
  institution_id: string | null
  institution_name: string | null
  institution_code: string | null
  has_global_visibility: boolean
  memberships: UserInstitutionMembership[]
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
      role: AppRole
      phone?: string
      department?: string
      license_number?: string
      institution_code?: string
    },
  ) {
    const baseUrl = getBaseUrl()
    const safeRole = canSelfRegisterRole(userData.role) ? normalizeAppRole(userData.role) : "asistente"

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...userData,
          role: safeRole,
          institution_code: userData.institution_code?.trim() || undefined,
        },
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

  private static async fetchUserProfile(authUserId: string) {
    return supabase
      .from("users")
      .select(`
        id,
        auth_id,
        email,
        name,
        role,
        mfa_enabled,
        is_active,
        institution_id,
        institution:institutions!users_institution_id_fkey(id, name, code),
        memberships:user_institutions(
          institution_id,
          role,
          is_primary,
          institution:institutions!user_institutions_institution_id_fkey(id, name, code)
        )
      `)
      .eq("auth_id", authUserId)
      .single()
  }

  private static mapAuthUser(sessionUser: any, profile: any): AuthUser {
    const memberships: UserInstitutionMembership[] = (profile.memberships || [])
      .map((membership: any) => ({
        institution_id: membership.institution_id,
        institution_name: membership.institution?.name || "Institucion",
        institution_code: membership.institution?.code || "",
        role: normalizeAppRole(membership.role),
        is_primary: Boolean(membership.is_primary),
      }))
      .sort((a: UserInstitutionMembership, b: UserInstitutionMembership) => Number(b.is_primary) - Number(a.is_primary))

    const primaryMembership = memberships.find((membership) => membership.is_primary) || memberships[0] || null
    const institution = profile.institution || null

    return {
      id: sessionUser.id,
      profile_id: profile.id ?? null,
      email: profile.email || sessionUser.email || "",
      name: profile.name || sessionUser.user_metadata?.name || sessionUser.email || "",
      role: normalizeAppRole(profile.role),
      mfa_enabled: Boolean(profile.mfa_enabled),
      is_active: profile.is_active !== false,
      institution_id: institution?.id || primaryMembership?.institution_id || null,
      institution_name: institution?.name || primaryMembership?.institution_name || null,
      institution_code: institution?.code || primaryMembership?.institution_code || null,
      has_global_visibility: hasGlobalVisibility(profile.role),
      memberships,
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error("User fetch timeout")), 10000)
      })

      const userPromise = (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          return null
        }

        const { data: profile, error } = await this.fetchUserProfile(user.id)

        if (error || !profile) {
          const fallbackRole = canSelfRegisterRole(user.user_metadata?.role)
            ? normalizeAppRole(user.user_metadata?.role)
            : "asistente"

          const { error: insertError } = await supabase
            .from("users")
            .insert({
              auth_id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || user.email || "",
              role: fallbackRole,
              phone: user.user_metadata?.phone || null,
              department: user.user_metadata?.department || null,
              license_number: user.user_metadata?.license_number || null,
              is_active: true,
              mfa_enabled: false,
            })

          if (insertError) {
            return null
          }

          const { data: refreshedProfile, error: refreshedError } = await this.fetchUserProfile(user.id)
          if (refreshedError || !refreshedProfile) {
            return null
          }

          await this.updateLastLogin(user.id)
          return this.mapAuthUser(user, refreshedProfile)
        }

        await this.updateLastLogin(user.id)
        return this.mapAuthUser(user, profile)
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

  // Métodos privados
  private static async updateLastLogin(authId: string) {
    try {
      await supabase.from("users").update({ last_login: new Date().toISOString() }).eq("auth_id", authId)
    } catch {
      // No bloquear el flujo de login si falla la auditoria del ultimo acceso.
    }
  }
}
