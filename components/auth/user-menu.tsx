"use client"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Settings, Shield, LogOut, Key, RefreshCw, Building2, Globe } from "lucide-react"
import { useAuth } from "./auth-provider"
import { getRoleBadgeClassName, getRoleLabel } from "@/lib/roles"

export function UserMenu() {
  const { user, signOut, refreshUser } = useAuth()

  if (!user) return null

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-blue-100 text-blue-600">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              {user.mfa_enabled && <Shield className="h-3 w-3 text-success" />}
            </div>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            <Badge className={getRoleBadgeClassName(user.role)} variant="secondary">
              {getRoleLabel(user.role)}
            </Badge>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {user.has_global_visibility ? <Globe className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
              <span>{user.institution_name || "Sin institucion asignada"}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configuración</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Key className="mr-2 h-4 w-4" />
          <span>Cambiar Contraseña</span>
        </DropdownMenuItem>
        {!user.mfa_enabled && (
          <DropdownMenuItem>
            <Shield className="mr-2 h-4 w-4" />
            <span>Habilitar MFA</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={refreshUser}>
          <RefreshCw className="mr-2 h-4 w-4" />
          <span>Actualizar Permisos</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Cerrar Sesión</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
