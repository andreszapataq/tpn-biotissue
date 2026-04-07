"use client"

import { useEffect, useMemo, useState } from "react"
import { Building2, Eye, EyeOff, Loader2, Pencil, UserCog, UserPlus, Users } from "lucide-react"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { PageHeader } from "@/components/ui/page-header"
import { UserMenu } from "@/components/auth/user-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { InstitutionMultiSelect } from "@/components/admin/institution-multi-select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { Separator } from "@/components/ui/separator"
import { APP_ROLES, getRoleBadgeClassName, getRoleLabel, type AppRole } from "@/lib/roles"
import { cn } from "@/lib/utils"

type Institution = {
  id: string
  name: string
  code: string
  city: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  is_active: boolean
  is_warehouse: boolean
}

type AppUser = {
  id: string
  auth_id: string | null
  email: string
  name: string
  role: AppRole
  institution_id: string | null
  is_active: boolean | null
  institution?: {
    id: string
    name: string
    code: string
  } | null
  memberships?: {
    institution_id: string
    role: AppRole
    is_primary: boolean
    institution?: {
      id: string
      name: string
      code: string
    } | null
  }[]
}

type UserDraft = {
  role: AppRole
  institution_id: string
  institution_ids: string[]
  is_active: boolean
}

type InstitutionDraft = {
  name: string
  city: string
  contact_name: string
  contact_email: string
  contact_phone: string
  is_warehouse: boolean
}

const DEFAULT_NEW_INSTITUTION = {
  name: "",
  code: "",
  city: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  is_warehouse: false,
}

export default function AdminPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingInstitution, setSavingInstitution] = useState(false)
  const [savingInstitutionIds, setSavingInstitutionIds] = useState<string[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [institutionDrafts, setInstitutionDrafts] = useState<Record<string, InstitutionDraft>>({})
  const [users, setUsers] = useState<AppUser[]>([])
  const [userDrafts, setUserDrafts] = useState<Record<string, UserDraft>>({})
  const [newInstitution, setNewInstitution] = useState(DEFAULT_NEW_INSTITUTION)
  const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(null)
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    password: "",
    role: "soporte" as AppRole,
    phone: "",
    department: "",
    license_number: "",
    institution_ids: [] as string[],
    primary_institution_id: "",
  })

  const resetNewUserForm = () => {
    setNewUser({
      email: "",
      name: "",
      password: "",
      role: "soporte",
      phone: "",
      department: "",
      license_number: "",
      institution_ids: [],
      primary_institution_id: "",
    })
    setShowPassword(false)
  }

  const toggleNewUserInstitution = (institutionId: string, checked: boolean) => {
    setNewUser((prev) => {
      const ids = new Set(prev.institution_ids)
      if (checked) {
        ids.add(institutionId)
      } else {
        ids.delete(institutionId)
      }
      const nextIds = Array.from(ids)
      const nextPrimary = nextIds.includes(prev.primary_institution_id)
        ? prev.primary_institution_id
        : nextIds[0] || ""
      return { ...prev, institution_ids: nextIds, primary_institution_id: nextPrimary }
    })
  }

  const createUser = async () => {
    if (!newUser.email.trim() || !newUser.name.trim() || !newUser.password || !newUser.role) {
      toast({
        title: "Datos incompletos",
        description: "Email, nombre, contraseña y rol son requeridos.",
        variant: "destructive",
      })
      return
    }

    if (newUser.password.length < 6) {
      toast({
        title: "Contraseña muy corta",
        description: "La contraseña debe tener al menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    if (!newUser.institution_ids.length || !newUser.primary_institution_id) {
      toast({
        title: "Institución requerida",
        description: "Debes asignar al menos una institución y seleccionar una primaria.",
        variant: "destructive",
      })
      return
    }

    try {
      setCreatingUser(true)

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        toast({
          title: "Sesión expirada",
          description: "Por favor recarga la página e intenta de nuevo.",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newUser),
      })

      const result = await response.json()

      if (!response.ok && response.status !== 207) {
        throw new Error(result.error || "Error al crear usuario")
      }

      if (response.status === 207) {
        toast({
          title: "Usuario creado parcialmente",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Usuario creado",
          description: `${newUser.name} puede iniciar sesión con el correo y contraseña asignados.`,
        })
      }

      setShowCreateUserDialog(false)
      resetNewUserForm()
      await loadData()
    } catch (error: any) {
      console.error("Error creating user:", error)
      toast({
        title: "Error al crear usuario",
        description: error.message || "No se pudo crear el usuario.",
        variant: "destructive",
      })
    } finally {
      setCreatingUser(false)
    }
  }

  const loadData = async () => {
    try {
      setLoading(true)

      const [institutionsResult, usersResult] = await Promise.all([
        supabase.from("institutions").select("*").order("name", { ascending: true }),
        supabase
          .from("users")
          .select(`
            id,
            auth_id,
            email,
            name,
            role,
            institution_id,
            is_active,
            institution:institutions!users_institution_id_fkey(id, name, code),
            memberships:user_institutions(
              institution_id,
              role,
              is_primary,
              institution:institutions!user_institutions_institution_id_fkey(id, name, code)
            )
          `)
          .order("created_at", { ascending: true }),
      ])

      if (institutionsResult.error) {
        throw institutionsResult.error
      }

      if (usersResult.error) {
        throw usersResult.error
      }

      const institutionsData = (institutionsResult.data || []) as Institution[]
      const usersData = ((usersResult.data || []) as AppUser[]).map((user) => ({
        ...user,
        role: user.role as AppRole,
        memberships: (user.memberships || []).map((membership) => ({
          ...membership,
          role: membership.role as AppRole,
        })),
      }))

      setInstitutions(institutionsData)
      setInstitutionDrafts(
        Object.fromEntries(
          institutionsData.map((institution) => [
            institution.id,
            {
              name: institution.name,
              city: institution.city || "",
              contact_name: institution.contact_name || "",
              contact_email: institution.contact_email || "",
              contact_phone: institution.contact_phone || "",
              is_warehouse: institution.is_warehouse,
            },
          ]),
        ),
      )
      setUsers(usersData)
      setUserDrafts(
        Object.fromEntries(
          usersData.map((user) => [
            user.id,
            {
              role: user.role,
              institution_id: user.institution_id || "",
              institution_ids:
                user.memberships?.map((membership) => membership.institution_id) ||
                (user.institution_id ? [user.institution_id] : []),
              is_active: user.is_active !== false,
            },
          ]),
        ),
      )
    } catch (error: any) {
      console.error("Error loading admin data:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información administrativa.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const activeInstitutions = useMemo(() => institutions.filter((institution) => institution.is_active), [institutions])

  const handleInstitutionChange = (field: keyof typeof DEFAULT_NEW_INSTITUTION, value: string) => {
    setNewInstitution((prev) => ({ ...prev, [field]: value }))
  }

  const updateInstitutionDraft = (institutionId: string, patch: Partial<InstitutionDraft>) => {
    setInstitutionDrafts((prev) => ({
      ...prev,
      [institutionId]: {
        ...prev[institutionId],
        ...patch,
      },
    }))
  }

  const cancelEditInstitution = (institutionId: string) => {
    const institution = institutions.find((i) => i.id === institutionId)
    if (institution) {
      setInstitutionDrafts((prev) => ({
        ...prev,
        [institutionId]: {
          name: institution.name,
          city: institution.city || "",
          contact_name: institution.contact_name || "",
          contact_email: institution.contact_email || "",
          contact_phone: institution.contact_phone || "",
          is_warehouse: institution.is_warehouse,
        },
      }))
    }
    setEditingInstitutionId(null)
  }

  const isInstitutionDirty = (institutionId: string) => {
    const institution = institutions.find((i) => i.id === institutionId)
    const draft = institutionDrafts[institutionId]
    if (!institution || !draft) return false
    return (
      draft.name !== institution.name ||
      draft.city !== (institution.city || "") ||
      draft.contact_name !== (institution.contact_name || "") ||
      draft.contact_email !== (institution.contact_email || "") ||
      draft.contact_phone !== (institution.contact_phone || "")
    )
  }

  const isUserDirty = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    const draft = userDrafts[userId]
    if (!user || !draft) return false
    const originalIds = user.memberships?.map((m) => m.institution_id).sort() || []
    const draftIds = [...draft.institution_ids].sort()
    return (
      draft.role !== user.role ||
      draft.institution_id !== (user.institution_id || "") ||
      draft.is_active !== (user.is_active !== false) ||
      JSON.stringify(originalIds) !== JSON.stringify(draftIds)
    )
  }

  const createInstitution = async () => {
    if (!newInstitution.name.trim() || !newInstitution.code.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Debes ingresar al menos nombre y código de institución.",
        variant: "destructive",
      })
      return
    }

    try {
      setSavingInstitution(true)

      const payload = {
        name: newInstitution.name.trim(),
        code: newInstitution.code.trim().toLowerCase(),
        city: newInstitution.city.trim() || null,
        contact_name: newInstitution.contact_name.trim() || null,
        contact_email: newInstitution.contact_email.trim() || null,
        contact_phone: newInstitution.contact_phone.trim() || null,
        is_warehouse: newInstitution.is_warehouse,
      }

      const { error } = await supabase.from("institutions").insert(payload)

      if (error) {
        throw error
      }

      toast({
        title: "Institución creada",
        description: "La institución quedó disponible para asignar usuarios y operación.",
      })

      setNewInstitution(DEFAULT_NEW_INSTITUTION)
      await loadData()
    } catch (error: any) {
      console.error("Error creating institution:", error)
      toast({
        title: "Error al crear institución",
        description: error.message || "No se pudo crear la institución.",
        variant: "destructive",
      })
    } finally {
      setSavingInstitution(false)
    }
  }

  const toggleInstitutionStatus = async (institution: Institution, checked: boolean) => {
    try {
      const { error } = await supabase
        .from("institutions")
        .update({ is_active: checked })
        .eq("id", institution.id)

      if (error) {
        throw error
      }

      setInstitutions((prev) =>
        prev.map((current) => (current.id === institution.id ? { ...current, is_active: checked } : current)),
      )
    } catch (error: any) {
      console.error("Error updating institution:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado de la institución.",
        variant: "destructive",
      })
    }
  }

  const saveInstitution = async (institution: Institution) => {
    const draft = institutionDrafts[institution.id]

    if (!draft?.name.trim()) {
      toast({
        title: "Nombre requerido",
        description: "La institución debe tener un nombre.",
        variant: "destructive",
      })
      return
    }

    try {
      setSavingInstitutionIds((prev) => [...prev, institution.id])

      const { error } = await supabase
        .from("institutions")
        .update({
          name: draft.name.trim(),
          city: draft.city.trim() || null,
          contact_name: draft.contact_name.trim() || null,
          contact_email: draft.contact_email.trim() || null,
          contact_phone: draft.contact_phone.trim() || null,
          is_warehouse: draft.is_warehouse,
        })
        .eq("id", institution.id)

      if (error) {
        throw error
      }

      toast({
        title: "Institución actualizada",
        description: `Se guardaron los cambios de ${draft.name.trim()}.`,
      })

      setEditingInstitutionId(null)
      await loadData()
    } catch (error: any) {
      console.error("Error updating institution:", error)
      toast({
        title: "Error al actualizar institución",
        description: error.message || "No se pudieron guardar los cambios.",
        variant: "destructive",
      })
    } finally {
      setSavingInstitutionIds((prev) => prev.filter((id) => id !== institution.id))
    }
  }

  const updateDraft = (userId: string, patch: Partial<UserDraft>) => {
    setUserDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        ...patch,
      },
    }))
  }

  const toggleUserInstitution = (userId: string, institutionId: string, checked: boolean) => {
    setUserDrafts((prev) => {
      const currentDraft = prev[userId]
      const currentIds = new Set(currentDraft?.institution_ids || [])

      if (checked) {
        currentIds.add(institutionId)
      } else {
        currentIds.delete(institutionId)
      }

      const nextInstitutionIds = Array.from(currentIds)
      const nextPrimaryInstitutionId = nextInstitutionIds.includes(currentDraft?.institution_id || "")
        ? currentDraft.institution_id
        : nextInstitutionIds[0] || ""

      return {
        ...prev,
        [userId]: {
          ...currentDraft,
          institution_ids: nextInstitutionIds,
          institution_id: nextPrimaryInstitutionId,
        },
      }
    })
  }

  const saveUser = async (user: AppUser) => {
    const draft = userDrafts[user.id]
    if (!draft?.institution_ids.length || !draft?.institution_id) {
      toast({
        title: "Institución requerida",
        description: "Cada usuario debe tener al menos una institución y una primaria asignada.",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({
          role: draft.role,
          institution_id: draft.institution_id,
          is_active: draft.is_active,
        })
        .eq("id", user.id)

      if (error) {
        throw error
      }

      const selectedMemberships = draft.institution_ids.map((institutionId) => ({
        user_id: user.id,
        institution_id: institutionId,
        role: draft.role,
        is_primary: institutionId === draft.institution_id,
      }))

      const { error: upsertMembershipError } = await supabase
        .from("user_institutions")
        .upsert(selectedMemberships, { onConflict: "user_id,institution_id" })

      if (upsertMembershipError) {
        throw upsertMembershipError
      }

      const previousInstitutionIds = new Set(user.memberships?.map((membership) => membership.institution_id) || [])
      const removedInstitutionIds = Array.from(previousInstitutionIds).filter(
        (institutionId) => !draft.institution_ids.includes(institutionId),
      )

      if (removedInstitutionIds.length > 0) {
        const { error: deleteMembershipError } = await supabase
          .from("user_institutions")
          .delete()
          .eq("user_id", user.id)
          .in("institution_id", removedInstitutionIds)

        if (deleteMembershipError) {
          throw deleteMembershipError
        }
      }

      toast({
        title: "Usuario actualizado",
        description: `${user.name} ahora tiene el rol ${getRoleLabel(draft.role)}.`,
      })

      await loadData()
    } catch (error: any) {
      console.error("Error updating user:", error)
      toast({
        title: "Error al actualizar usuario",
        description: error.message || "No se pudo guardar el usuario.",
        variant: "destructive",
      })
    }
  }

  return (
    <ProtectedRoute requiredRole={["administrador"]}>
      <div className="page-shell">
        <div className="page-container-medium">
          <PageHeader
            title="Administración"
            subtitle="Gestiona instituciones y convierte usuarios existentes en soporte, asistentes o gerencia."
            backHref="/"
            actions={<UserMenu />}
          />

          {loading ? (
            <Card>
              <CardContent className="pt-6 flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando módulo administrativo...
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="institutions" className="space-y-4">
              <TabsList className="w-full">
                <TabsTrigger value="institutions" className="flex-1 gap-2">
                  <Building2 className="h-4 w-4" />
                  Instituciones
                  <Badge variant="secondary" className="ml-0.5 text-xs px-1.5 py-0">
                    {institutions.length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="users" className="flex-1 gap-2">
                  <Users className="h-4 w-4" />
                  Usuarios
                  <Badge variant="secondary" className="ml-0.5 text-xs px-1.5 py-0">
                    {users.length}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="institutions" className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,1.4fr] gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Nueva Institución</CardTitle>
                      <CardDescription>Crea la institución antes de asignar usuarios u operar pacientes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="institution-name">Nombre</Label>
                        <Input
                          id="institution-name"
                          value={newInstitution.name}
                          onChange={(e) => handleInstitutionChange("name", e.target.value)}
                          placeholder="Clínica Central"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="institution-code">Código</Label>
                        <Input
                          id="institution-code"
                          value={newInstitution.code}
                          onChange={(e) => handleInstitutionChange("code", e.target.value.toLowerCase().trimStart())}
                          placeholder="clinica-central"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="institution-city">Ciudad</Label>
                        <Input
                          id="institution-city"
                          value={newInstitution.city}
                          onChange={(e) => handleInstitutionChange("city", e.target.value)}
                          placeholder="Bogotá"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="institution-contact-name">Contacto</Label>
                        <Input
                          id="institution-contact-name"
                          value={newInstitution.contact_name}
                          onChange={(e) => handleInstitutionChange("contact_name", e.target.value)}
                          placeholder="María Pérez"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="institution-contact-email">Correo</Label>
                          <Input
                            id="institution-contact-email"
                            value={newInstitution.contact_email}
                            onChange={(e) => handleInstitutionChange("contact_email", e.target.value)}
                            placeholder="contacto@clinica.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="institution-contact-phone">Teléfono</Label>
                          <Input
                            id="institution-contact-phone"
                            value={newInstitution.contact_phone}
                            onChange={(e) => handleInstitutionChange("contact_phone", e.target.value)}
                            placeholder="+57 300 1234567"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-md border p-3">
                        <Switch
                          id="institution-is-warehouse"
                          checked={newInstitution.is_warehouse}
                          onCheckedChange={(checked) =>
                            setNewInstitution((prev) => ({ ...prev, is_warehouse: checked }))
                          }
                        />
                        <Label htmlFor="institution-is-warehouse" className="text-sm cursor-pointer">
                          Es bodega operativa
                          <span className="block text-xs text-muted-foreground font-normal">
                            No maneja pacientes ni procedimientos
                          </span>
                        </Label>
                      </div>
                      <Button onClick={createInstitution} disabled={savingInstitution} className="w-full">
                        {savingInstitution ? "Creando..." : "Crear Institución"}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Instituciones Registradas</CardTitle>
                      <CardDescription>Edita nombre, ciudad y contacto; además puedes activar o pausar instituciones.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {institutions.map((institution) => {
                        const isEditing = editingInstitutionId === institution.id
                        const dirty = isInstitutionDirty(institution.id)

                        return (
                          <div
                            key={institution.id}
                            className={cn(
                              "rounded-lg border bg-card p-4 space-y-3 transition-all hover:shadow-sm",
                              !institution.is_active && "opacity-60"
                            )}
                          >
                            {/* Read-only header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-foreground">{institution.name}</p>
                                  {institution.code === "institucion-principal" && (
                                    <Badge variant="outline">Principal</Badge>
                                  )}
                                  {institution.is_warehouse && (
                                    <Badge variant="outline">Bodega</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {institution.code}
                                  {institution.city && ` · ${institution.city}`}
                                </p>
                                {institution.contact_name || institution.contact_email ? (
                                  <p className="text-xs text-muted-foreground">
                                    {institution.contact_name}
                                    {institution.contact_name && institution.contact_email && " · "}
                                    {institution.contact_email}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">Sin contacto asignado</p>
                                )}
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-2">
                                  <Switch
                                    id={`active-${institution.id}`}
                                    checked={institution.is_active}
                                    onCheckedChange={(checked) => void toggleInstitutionStatus(institution, checked)}
                                  />
                                  <Label
                                    htmlFor={`active-${institution.id}`}
                                    className={cn(
                                      "text-sm font-medium cursor-pointer",
                                      institution.is_active ? "text-green-700" : "text-muted-foreground"
                                    )}
                                  >
                                    {institution.is_active ? "Activa" : "Inactiva"}
                                  </Label>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() =>
                                    setEditingInstitutionId(isEditing ? null : institution.id)
                                  }
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  {isEditing ? "Cerrar" : "Editar"}
                                </Button>
                              </div>
                            </div>

                            {/* Edit panel (conditional) */}
                            {isEditing && (
                              <>
                                <Separator />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <Label htmlFor={`institution-name-${institution.id}`}>Nombre</Label>
                                    <Input
                                      id={`institution-name-${institution.id}`}
                                      value={institutionDrafts[institution.id]?.name || ""}
                                      onChange={(e) => updateInstitutionDraft(institution.id, { name: e.target.value })}
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`institution-city-${institution.id}`}>Ciudad</Label>
                                    <Input
                                      id={`institution-city-${institution.id}`}
                                      value={institutionDrafts[institution.id]?.city || ""}
                                      onChange={(e) => updateInstitutionDraft(institution.id, { city: e.target.value })}
                                      placeholder="Bogotá"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`institution-contact-name-${institution.id}`}>Contacto</Label>
                                    <Input
                                      id={`institution-contact-name-${institution.id}`}
                                      value={institutionDrafts[institution.id]?.contact_name || ""}
                                      onChange={(e) => updateInstitutionDraft(institution.id, { contact_name: e.target.value })}
                                      placeholder="María Pérez"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label htmlFor={`institution-contact-phone-${institution.id}`}>Teléfono</Label>
                                    <Input
                                      id={`institution-contact-phone-${institution.id}`}
                                      value={institutionDrafts[institution.id]?.contact_phone || ""}
                                      onChange={(e) => updateInstitutionDraft(institution.id, { contact_phone: e.target.value })}
                                      placeholder="+57 300 000 0000"
                                    />
                                  </div>
                                  <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor={`institution-contact-email-${institution.id}`}>Correo</Label>
                                    <Input
                                      id={`institution-contact-email-${institution.id}`}
                                      value={institutionDrafts[institution.id]?.contact_email || ""}
                                      onChange={(e) => updateInstitutionDraft(institution.id, { contact_email: e.target.value })}
                                      placeholder="contacto@clinica.com"
                                    />
                                  </div>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  {dirty && (
                                    <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 mr-auto">
                                      Sin guardar
                                    </Badge>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => cancelEditInstitution(institution.id)}
                                  >
                                    Cancelar
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => void saveInstitution(institution)}
                                    disabled={savingInstitutionIds.includes(institution.id)}
                                  >
                                    {savingInstitutionIds.includes(institution.id) ? "Guardando..." : "Guardar cambios"}
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="flex items-center gap-2">
                        <UserCog className="h-5 w-5" />
                        Gestión de Usuarios
                      </CardTitle>
                      <Button onClick={() => setShowCreateUserDialog(true)} className="gap-2">
                        <UserPlus className="h-4 w-4" />
                        Crear Usuario
                      </Button>
                    </div>
                    <CardDescription>
                      Crea usuarios nuevos o edita rol, instituciones y estado de los existentes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {users.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Todavía no hay usuarios registrados.</p>
                    ) : (
                      users.map((user) => {
                        const draft = userDrafts[user.id]
                        const dirty = isUserDirty(user.id)

                        return (
                          <div
                            key={user.id}
                            className={cn(
                              "rounded-lg border bg-card p-5 space-y-4 transition-all hover:shadow-sm",
                              draft?.is_active === false && "opacity-60"
                            )}
                          >
                            {/* Identity section */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-foreground">{user.name}</p>
                                  <Badge variant="outline" className={getRoleBadgeClassName(user.role)}>
                                    {getRoleLabel(user.role)}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                                <p className="text-xs text-muted-foreground">
                                  {user.institution?.name || "Sin institución primaria"}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Switch
                                  id={`user-active-${user.id}`}
                                  checked={draft?.is_active ?? false}
                                  onCheckedChange={(checked) => updateDraft(user.id, { is_active: checked })}
                                />
                                <Label
                                  htmlFor={`user-active-${user.id}`}
                                  className={cn(
                                    "text-sm font-medium cursor-pointer",
                                    draft?.is_active ? "text-green-700" : "text-muted-foreground"
                                  )}
                                >
                                  {draft?.is_active ? "Activo" : "Inactivo"}
                                </Label>
                              </div>
                            </div>

                            <Separator />

                            {/* Editable fields */}
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Rol</Label>
                                  <Select
                                    value={draft?.role}
                                    onValueChange={(value) => updateDraft(user.id, { role: value as AppRole })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {APP_ROLES.map((role) => (
                                        <SelectItem key={role} value={role}>
                                          {getRoleLabel(role)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Institución primaria</Label>
                                  <Select
                                    value={draft?.institution_id || ""}
                                    onValueChange={(value) => updateDraft(user.id, { institution_id: value })}
                                    disabled={!draft?.institution_ids.length}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar institución primaria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {activeInstitutions
                                        .filter((institution) => draft?.institution_ids.includes(institution.id))
                                        .map((institution) => (
                                          <SelectItem key={institution.id} value={institution.id}>
                                            {institution.name}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Instituciones asignadas</Label>
                                <InstitutionMultiSelect
                                  institutions={activeInstitutions}
                                  selectedIds={draft?.institution_ids ?? []}
                                  onToggle={(institutionId, checked) =>
                                    toggleUserInstitution(user.id, institutionId, checked)
                                  }
                                />
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                {dirty && (
                                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50 mr-auto">
                                    Sin guardar
                                  </Badge>
                                )}
                                <Button onClick={() => void saveUser(user)}>Guardar cambios</Button>
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>

        <Dialog
          open={showCreateUserDialog}
          onOpenChange={(open) => {
            setShowCreateUserDialog(open)
            if (!open) resetNewUserForm()
          }}
        >
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                El usuario podrá iniciar sesión inmediatamente con la contraseña asignada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-user-name">Nombre completo *</Label>
                <Input
                  id="new-user-name"
                  value={newUser.name}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="María Pérez"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-email">Correo electrónico *</Label>
                <Input
                  id="new-user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="maria@clinica.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-password">Contraseña temporal *</Label>
                <div className="relative">
                  <Input
                    id="new-user-password"
                    type={showPassword ? "text" : "password"}
                    value={newUser.password}
                    onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(value) => setNewUser((prev) => ({ ...prev, role: value as AppRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APP_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleLabel(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-phone">Teléfono</Label>
                <Input
                  id="new-user-phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="+57 300 000 0000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-department">Departamento / Área</Label>
                <Input
                  id="new-user-department"
                  value={newUser.department}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="Cirugía"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-user-license">Número de licencia</Label>
                <Input
                  id="new-user-license"
                  value={newUser.license_number}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, license_number: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-2">
                <Label>Instituciones *</Label>
                <InstitutionMultiSelect
                  institutions={activeInstitutions}
                  selectedIds={newUser.institution_ids}
                  onToggle={toggleNewUserInstitution}
                />
              </div>

              {newUser.institution_ids.length > 0 && (
                <div className="space-y-2">
                  <Label>Institución primaria *</Label>
                  <Select
                    value={newUser.primary_institution_id}
                    onValueChange={(value) => setNewUser((prev) => ({ ...prev, primary_institution_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar institución primaria" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeInstitutions
                        .filter((institution) => newUser.institution_ids.includes(institution.id))
                        .map((institution) => (
                          <SelectItem key={institution.id} value={institution.id}>
                            {institution.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateUserDialog(false)
                  resetNewUserForm()
                }}
              >
                Cancelar
              </Button>
              <Button onClick={() => void createUser()} disabled={creatingUser}>
                {creatingUser ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Usuario"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
