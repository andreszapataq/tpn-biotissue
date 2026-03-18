import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    // 1. Verify caller is an authenticated admin
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

    // Check caller role in users table
    const { data: callerUser, error: callerError } = await anonClient
      .from("users")
      .select("role")
      .eq("auth_id", callerAuth.id)
      .single()

    if (callerError || callerUser?.role !== "administrador") {
      return NextResponse.json({ error: "Solo administradores pueden crear usuarios" }, { status: 403 })
    }

    // 2. Parse request body
    const body = await request.json()
    const { email, password, name, role, phone, department, license_number, institution_ids, primary_institution_id } =
      body

    if (!email?.trim() || !password || !name?.trim() || !role) {
      return NextResponse.json({ error: "Email, nombre, contraseña y rol son requeridos" }, { status: 400 })
    }

    if (!institution_ids?.length || !primary_institution_id) {
      return NextResponse.json(
        { error: "Debe asignar al menos una institución y seleccionar una primaria" },
        { status: 400 },
      )
    }

    if (!institution_ids.includes(primary_institution_id)) {
      return NextResponse.json(
        { error: "La institución primaria debe estar entre las instituciones asignadas" },
        { status: 400 },
      )
    }

    // 3. Create auth user with service role key
    const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role,
        phone: phone?.trim() || null,
        department: department?.trim() || null,
        license_number: license_number?.trim() || null,
      },
    })

    if (createError) {
      const message =
        createError.message === "A user with this email address has already been registered"
          ? "Este correo ya está registrado"
          : createError.message
      return NextResponse.json({ error: message }, { status: 400 })
    }

    // 4. Wait for trigger to create public.users row, then find it
    let publicUserId: string | null = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const { data: publicUser } = await adminClient
        .from("users")
        .select("id")
        .eq("auth_id", newAuthUser.user.id)
        .single()

      if (publicUser) {
        publicUserId = publicUser.id
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    if (!publicUserId) {
      return NextResponse.json(
        { error: "Usuario creado en auth pero no se pudo encontrar el perfil. Intenta asignar instituciones desde el admin." },
        { status: 207 },
      )
    }

    // 5. Update institution_id on users table
    const { error: updateError } = await adminClient
      .from("users")
      .update({ institution_id: primary_institution_id })
      .eq("id", publicUserId)

    if (updateError) {
      console.error("Error updating user institution_id:", updateError)
    }

    // 6. Create user_institutions memberships
    const memberships = institution_ids.map((institutionId: string) => ({
      user_id: publicUserId,
      institution_id: institutionId,
      role,
      is_primary: institutionId === primary_institution_id,
    }))

    const { error: membershipError } = await adminClient.from("user_institutions").insert(memberships)

    if (membershipError) {
      console.error("Error creating memberships:", membershipError)
      return NextResponse.json(
        { error: "Usuario creado pero hubo un error asignando instituciones. Asígnalas manualmente desde el admin." },
        { status: 207 },
      )
    }

    return NextResponse.json({
      success: true,
      user: { id: publicUserId, email: email.trim(), name: name.trim() },
    })
  } catch (error: any) {
    console.error("Error in create-user API:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
