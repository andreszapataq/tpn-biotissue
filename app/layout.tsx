import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/auth/auth-provider"
import { InstitutionProvider } from "@/components/institutions/institution-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: "NPWT Control - Sistema de Terapia de Presión Negativa",
  description: "Aplicación para registro y control de terapia de presión negativa",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AuthProvider>
          <InstitutionProvider>{children}</InstitutionProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
