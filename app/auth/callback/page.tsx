"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Suspense } from "react"

function CallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("🔄 Processing auth callback...")
        console.log("📍 Current URL:", window.location.href)
        console.log("🔍 Search params:", searchParams?.toString())
        console.log("🔗 Hash:", window.location.hash)

        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search)
        const hashParams = new URLSearchParams(window.location.hash.substring(1))

        // Parámetros posibles
        const token_hash = urlParams.get("token_hash") || hashParams.get("token_hash")
        const type = urlParams.get("type") || hashParams.get("type")
        const access_token = hashParams.get("access_token")
        const refresh_token = hashParams.get("refresh_token")
        const error = urlParams.get("error") || hashParams.get("error")
        const error_description = urlParams.get("error_description") || hashParams.get("error_description")

        console.log("📋 Callback params:", {
          token_hash: !!token_hash,
          type,
          access_token: !!access_token,
          refresh_token: !!refresh_token,
          error,
          error_description,
        })

        // Verificar si hay errores
        if (error) {
          console.error("❌ Auth callback error:", error, error_description)
          setStatus("error")
          setMessage(error_description || "Error en la autenticación")
          return
        }

        // Caso 1: Confirmación de email con token_hash
        if (token_hash && type === "signup") {
          console.log("📧 Processing email confirmation...")

          const { data, error: verifyError } = await supabase.auth.verifyOtp({
            token_hash,
            type: "signup",
          })

          if (verifyError) {
            console.error("❌ Email verification error:", verifyError)
            setStatus("error")
            setMessage("Error al confirmar el email: " + verifyError.message)
            return
          }

          if (data.user) {
            console.log("✅ Email confirmed successfully")
            setStatus("success")
            setMessage("Email confirmado exitosamente")

            // Redirigir al dashboard después de un momento
            setTimeout(() => {
              router.push("/")
            }, 2000)
          }
        }
        // Caso 2: Login con tokens (desde magic link o similar)
        else if (access_token && refresh_token) {
          console.log("🔑 Setting session with tokens...")

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          })

          if (sessionError) {
            console.error("❌ Error setting session:", sessionError)
            setStatus("error")
            setMessage("Error al procesar la sesión")
            return
          }

          if (data.session) {
            console.log("✅ Session established successfully")
            setStatus("success")
            setMessage("Autenticación exitosa")

            setTimeout(() => {
              router.push("/")
            }, 1000)
          }
        }
        // Caso 3: Verificar sesión existente
        else {
          console.log("🔍 Checking existing session...")

          const { data, error: getSessionError } = await supabase.auth.getSession()

          if (getSessionError) {
            console.error("❌ Error getting session:", getSessionError)
            setStatus("error")
            setMessage("Error en la autenticación")
            return
          }

          if (data.session) {
            console.log("✅ Existing session found")
            setStatus("success")
            setMessage("Autenticación exitosa")
            setTimeout(() => {
              router.push("/")
            }, 1000)
          } else {
            console.log("❌ No session found")
            setStatus("error")
            setMessage("No se pudo establecer la sesión")
          }
        }
      } catch (error) {
        console.error("❌ Callback error:", error)
        setStatus("error")
        setMessage("Error inesperado en la autenticación")
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  const handleRetry = () => {
    router.push("/auth/login")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Procesando confirmación...</p>
              <p className="text-xs text-gray-400">Verificando tu email</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="h-8 w-8 mx-auto text-green-600" />
              <p className="text-green-600 font-medium">{message}</p>
              <p className="text-sm text-gray-600">Redirigiendo al dashboard...</p>
            </>
          )}

          {status === "error" && (
            <>
              <AlertCircle className="h-8 w-8 mx-auto text-red-600" />
              <Alert variant="destructive">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Ir al Login
              </button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-4 text-gray-600">Cargando...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  )
}
