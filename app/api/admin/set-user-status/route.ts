import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ~100 años: bloqueo indefinido en Supabase Auth
const BAN_DURATION = "876000h"

/**
 * Activa o desactiva un usuario.
 * Al desactivar, además de marcar users.is_active = false, se banea la cuenta en
 * Supabase Auth: no puede iniciar sesión ni renovar su token de acceso.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")
    const anonClient = createClient(supabaseUrl, supabaseAnonKey)
    const {
      data: { user: callerAuth },
      error: authError,
    } = await anonClient.auth.getUser(token)

    if (authError || !callerAuth) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: callerUser, error: callerError } = await adminClient
      .from("users")
      .select("role, is_active")
      .eq("auth_id", callerAuth.id)
      .single()

    if (callerError || callerUser?.role !== "administrador" || callerUser?.is_active === false) {
      return NextResponse.json({ error: "Solo administradores pueden cambiar el estado de usuarios" }, { status: 403 })
    }

    const { user_id, is_active } = await request.json()

    if (!user_id || typeof is_active !== "boolean") {
      return NextResponse.json({ error: "user_id e is_active son requeridos" }, { status: 400 })
    }

    const { data: targetUser, error: targetError } = await adminClient
      .from("users")
      .select("id, auth_id")
      .eq("id", user_id)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    if (targetUser.auth_id === callerAuth.id && !is_active) {
      return NextResponse.json({ error: "No puedes desactivar tu propia cuenta" }, { status: 400 })
    }

    if (targetUser.auth_id) {
      const { error: banError } = await adminClient.auth.admin.updateUserById(targetUser.auth_id, {
        ban_duration: is_active ? "none" : BAN_DURATION,
      })

      if (banError) {
        return NextResponse.json({ error: `No se pudo actualizar el acceso: ${banError.message}` }, { status: 500 })
      }
    }

    const { error: updateError } = await adminClient.from("users").update({ is_active }).eq("id", user_id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error in set-user-status API:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
