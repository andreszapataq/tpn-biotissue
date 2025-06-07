import { createClient } from "@supabase/supabase-js"
import { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Configuración para mejor persistencia de sesión
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
})

// Tipos simplificados
export interface User {
  id: string
  auth_id: string
  email: string
  name: string
  role: "cirujano" | "enfermera" | "administrador"
  phone?: string
  department?: string
  license_number?: string
  is_active: boolean
  last_login?: string
  mfa_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  name: string
  identification: string
  age: number
  status: "active" | "completed" | "inactive"
  created_at: string
  updated_at: string
}

export interface Procedure {
  id: string
  patient_id: string
  machine_id: string
  surgeon_name: string
  assistant_name?: string
  procedure_date: string
  start_time: string
  end_time?: string
  diagnosis: string
  location?: string
  status: "active" | "completed" | "cancelled"
  created_by: string
  created_at: string
  updated_at: string
}

export interface InventoryProduct {
  id: string
  name: string
  code: string
  category: string
  stock: number
  minimum_stock: number
  unit_price: number
  created_at: string
  updated_at: string
}

export interface Machine {
  id: string
  name: string
  serial_number: string
  model: string
  status: "active" | "maintenance" | "inactive"
  location?: string
  purchase_date?: string
  last_maintenance?: string
  created_at: string
  updated_at: string
}


