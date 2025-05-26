export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      active_treatments: {
        Row: {
          created_at: string | null
          current_dressing: string | null
          id: string
          last_change_date: string | null
          machine_id: string | null
          next_change_date: string | null
          patient_id: string | null
          procedure_id: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_dressing?: string | null
          id?: string
          last_change_date?: string | null
          machine_id?: string | null
          next_change_date?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_dressing?: string | null
          id?: string
          last_change_date?: string | null
          machine_id?: string | null
          next_change_date?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_treatments_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_treatments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_treatments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          movement_type: string
          notes: string | null
          product_id: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          product_id?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          product_id?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_products: {
        Row: {
          category: string
          code: string
          created_at: string | null
          id: string
          minimum_stock: number | null
          name: string
          stock: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          id?: string
          minimum_stock?: number | null
          name: string
          stock?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          id?: string
          minimum_stock?: number | null
          name?: string
          stock?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      machines: {
        Row: {
          created_at: string | null
          id: string
          last_maintenance: string | null
          location: string | null
          model: string
          name: string
          purchase_date: string | null
          serial_number: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_maintenance?: string | null
          location?: string | null
          model?: string
          name: string
          purchase_date?: string | null
          serial_number: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_maintenance?: string | null
          location?: string | null
          model?: string
          name?: string
          purchase_date?: string | null
          serial_number?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      patients: {
        Row: {
          age: number
          created_at: string | null
          id: string
          identification: string
          name: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          age: number
          created_at?: string | null
          id?: string
          identification: string
          name: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number
          created_at?: string | null
          id?: string
          identification?: string
          name?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      procedures: {
        Row: {
          assistant_name: string | null
          created_at: string | null
          created_by: string | null
          diagnosis: string
          end_time: string | null
          id: string
          machine_id: string | null
          patient_id: string | null
          procedure_date: string
          start_time: string
          status: string | null
          surgeon_name: string
          updated_at: string | null
        }
        Insert: {
          assistant_name?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnosis: string
          end_time?: string | null
          id?: string
          machine_id?: string | null
          patient_id?: string | null
          procedure_date: string
          start_time: string
          status?: string | null
          surgeon_name: string
          updated_at?: string | null
        }
        Update: {
          assistant_name?: string | null
          created_at?: string | null
          created_by?: string | null
          diagnosis?: string
          end_time?: string | null
          id?: string
          machine_id?: string | null
          patient_id?: string | null
          procedure_date?: string
          start_time?: string
          status?: string | null
          surgeon_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_id: string | null
          created_at: string | null
          department: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          license_number: string | null
          mfa_enabled: boolean | null
          name: string
          phone: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          department?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          license_number?: string | null
          mfa_enabled?: boolean | null
          name: string
          phone?: string | null
          role: string
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          department?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          license_number?: string | null
          mfa_enabled?: boolean | null
          name?: string
          phone?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_low_stock_products: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          name: string
          code: string
          category: string
          stock: number
          minimum_stock: number
          unit_price: number
          created_at: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never 