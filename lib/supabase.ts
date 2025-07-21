import { createClient } from "@supabase/supabase-js"
import { Database } from "./database.types"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 📱 Detectar si estamos en dispositivo móvil
const isMobile = typeof window !== "undefined" && 
  (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))

// 📱 Configuración optimizada para dispositivos móviles  
const mobileConfig = {
  // Timeouts más largos para conexiones móviles lentas
  fetch: {
    timeout: 30000, // 30 segundos en lugar de 10
  },
  // Configuración de reconexión más agresiva
  realtime: {
    heartbeatIntervalMs: 15000, // 15 segundos
    reconnectAfterMs: () => [1000, 2000, 5000, 10000], // Reintentos escalados
  }
}

// Configuración para mejor persistencia de sesión
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
  // 📱 Aplicar configuración móvil si es necesario
  ...(isMobile ? mobileConfig : {}),
  // Configuración adicional para conexiones inestables
  global: {
    headers: {
      'X-Client-Info': isMobile ? 'mobile-app' : 'web-app',
    },
  },
})

// 📱 Función helper para operaciones críticas con reintentos automáticos
export const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      const isNetworkError = error.message?.includes('network') || 
                           error.message?.includes('connection') ||
                           error.message?.includes('timeout') ||
                           error.code === 'PGRST301' ||
                           error.code === 'ECONNABORTED'
      
      if (isNetworkError && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1) // Backoff exponencial
        console.warn(`⚠️ Operación falló (intento ${attempt}/${maxRetries}), reintentando en ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw new Error("Max retries exceeded")
}

// Tipos simplificados
export interface User {
  id: string
  auth_id: string
  email: string
  name: string
  role: "cirujano" | "enfermera" | "administrador" | "financiero" | "soporte"
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


