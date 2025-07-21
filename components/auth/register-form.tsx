"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, UserPlus, Mail, User, Phone, Building, FileText, AlertCircle, CheckCircle } from "lucide-react"
import { AuthService } from "@/lib/auth"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabase"

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "" as "cirujano" | "soporte" | "administrador" | "financiero" | "",
    phone: "",
    department: "",
    license_number: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8
    const hasUpper = /[A-Z]/.test(password)
    const hasLower = /[a-z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)

    return {
      minLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      isValid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
    }
  }

  const passwordValidation = validatePassword(formData.password)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Validaciones
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden")
      setIsLoading(false)
      return
    }

    if (!passwordValidation.isValid) {
      setError("La contraseña no cumple con los requisitos de seguridad")
      setIsLoading(false)
      return
    }

    if (!formData.role) {
      setError("Debe seleccionar un rol")
      setIsLoading(false)
      return
    }

    try {
      console.log("Starting registration process...")

      const { data, error } = await AuthService.signUp(formData.email, formData.password, {
        name: formData.name,
        role: formData.role,
        phone: formData.phone || undefined,
        department: formData.department || undefined,
        license_number: formData.license_number || undefined,
      })

      if (error) {
        console.error("Registration failed:", error)

        // 🔧 NUEVO: Si el error es de base de datos y es por el rol financiero, intentar método alternativo
        if (error.message?.includes("Database error") && formData.role === "financiero") {
          console.log("🔄 Trying alternative registration method for Financiero role...")
          
          try {
            // Intentar registro básico sin trigger automático problemático
            const { data: altData, error: altError } = await supabase.auth.signUp({
              email: formData.email,
              password: formData.password,
              options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
              },
            })

            if (altError) {
              throw altError
            }

            if (altData.user) {
              // Crear perfil manualmente usando AuthService
              const { profile, error: profileError } = await AuthService.createUserProfile(altData.user, {
                name: formData.name,
                role: formData.role,
                phone: formData.phone,
                department: formData.department,
                license_number: formData.license_number,
              })

              if (profileError) {
                console.error("Error creating profile manually:", profileError)
                toast({
                  title: "Registro Parcial",
                  description: "Usuario creado pero requiere configuración manual del perfil. Contacte al administrador.",
                  variant: "destructive",
                })
              } else {
                console.log("✅ Complete registration successful with manual profile")
                toast({
                  title: "Registro Exitoso",
                  description: "Usuario Financiero creado correctamente con todos los permisos.",
                  variant: "default",
                })
              }
              
              setSuccess(true)
              return
            }
          } catch (altErr: any) {
            console.error("Alternative registration also failed:", altErr)
            setError("Error crítico en el registro. Contacte al administrador para crear usuarios Financieros.")
            return
          }
        }

        // Manejar diferentes tipos de errores
        if (error.message?.includes("already registered")) {
          setError("Este correo electrónico ya está registrado")
        } else if (error.message?.includes("invalid email")) {
          setError("El formato del correo electrónico no es válido")
        } else if (error.message?.includes("weak password")) {
          setError("La contraseña es muy débil")
        } else if (error.message?.includes("Database error")) {
          setError("Error en la base de datos. Por favor contacte al administrador para crear el rol Financiero.")
        } else {
          setError(error.message || "Error al crear la cuenta")
        }
        return
      }

      if (data?.user) {
        console.log("Registration successful for:", data.user.email)
        setSuccess(true)
      } else {
        setError("Error inesperado durante el registro")
      }
    } catch (err: any) {
      console.error("Registration exception:", err)
      setError("Error inesperado. Por favor, intenta nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>¡Registro Exitoso!</CardTitle>
            <CardDescription>
              {formData.role === "financiero" 
                ? "Usuario Financiero creado con acceso a informes" 
                : "Tu cuenta ha sido creada correctamente"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Se ha enviado un correo de confirmación a <strong>{formData.email}</strong>. Por favor, revisa tu
                bandeja de entrada y haz clic en el enlace para activar tu cuenta.
                {formData.role === "financiero" && (
                  <div className="mt-2 p-2 bg-orange-50 rounded-md border border-orange-200">
                    <span className="text-orange-800 text-sm">
                      ✅ <strong>Rol Financiero:</strong> Tendrás acceso a informes financieros una vez confirmado el email.
                    </span>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Una vez que confirmes tu email, podrás iniciar sesión con tus credenciales.
              </p>
              <Button onClick={() => router.push("/auth/login")} className="w-full">
                Ir al Login
              </Button>
            </div>

            <div className="text-xs text-gray-500 mt-4">
              <p>¿No recibiste el correo? Revisa tu carpeta de spam o intenta registrarte nuevamente.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Crear Cuenta</CardTitle>
          <CardDescription>Registro para personal médico autorizado</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Dr. Juan Pérez"
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: any) => setFormData((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cirujano">Cirujano</SelectItem>
                    <SelectItem value="soporte">Soporte</SelectItem>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="financiero">Financiero</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="usuario@hospital.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Teléfono</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+57 300 123 4567"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="department">Departamento</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value }))}
                    placeholder="Cirugía General"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="license_number">Número de Licencia</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="license_number"
                  type="text"
                  value={formData.license_number}
                  onChange={(e) => setFormData((prev) => ({ ...prev, license_number: e.target.value }))}
                  placeholder="Número de licencia médica"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className="text-xs space-y-1">
                    <div
                      className={`flex items-center gap-1 ${passwordValidation.minLength ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-1 h-1 rounded-full ${passwordValidation.minLength ? "bg-green-600" : "bg-red-600"}`}
                      />
                      Mínimo 8 caracteres
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordValidation.hasUpper ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-1 h-1 rounded-full ${passwordValidation.hasUpper ? "bg-green-600" : "bg-red-600"}`}
                      />
                      Una mayúscula
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordValidation.hasLower ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-1 h-1 rounded-full ${passwordValidation.hasLower ? "bg-green-600" : "bg-red-600"}`}
                      />
                      Una minúscula
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordValidation.hasNumber ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-1 h-1 rounded-full ${passwordValidation.hasNumber ? "bg-green-600" : "bg-red-600"}`}
                      />
                      Un número
                    </div>
                    <div
                      className={`flex items-center gap-1 ${passwordValidation.hasSpecial ? "text-green-600" : "text-red-600"}`}
                    >
                      <div
                        className={`w-1 h-1 rounded-full ${passwordValidation.hasSpecial ? "bg-green-600" : "bg-red-600"}`}
                      />
                      Un carácter especial
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-600 mt-1">Las contraseñas no coinciden</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !passwordValidation.isValid || formData.password !== formData.confirmPassword}
            >
              {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{" "}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
