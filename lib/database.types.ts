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
          lote: string | null
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
          lote?: string | null
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
          lote?: string | null
          minimum_stock?: number | null
          name?: string
          stock?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          failure_reason: string | null
          id: string
          ip_address: unknown | null
          success: boolean
        }
        Insert: {
          attempted_at?: string | null
          email: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success: boolean
        }
        Update: {
          attempted_at?: string | null
          email?: string
          failure_reason?: string | null
          id?: string
          ip_address?: unknown | null
          success?: boolean
        }
        Relationships: []
      }
      machines: {
        Row: {
          created_at: string | null
          id: string
          last_maintenance: string | null
          lote: string
          model: string
          observations: string | null
          reference_code: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_maintenance?: string | null
          lote: string
          model?: string
          observations?: string | null
          reference_code?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_maintenance?: string | null
          lote?: string
          model?: string
          observations?: string | null
          reference_code?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      password_reset_tokens: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          token: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          token: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          token?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
      procedure_products: {
        Row: {
          created_at: string | null
          id: string
          procedure_id: string | null
          product_id: string | null
          quantity_used: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          procedure_id?: string | null
          product_id?: string | null
          quantity_used: number
        }
        Update: {
          created_at?: string | null
          id?: string
          procedure_id?: string | null
          product_id?: string | null
          quantity_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "procedure_products_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_products"
            referencedColumns: ["id"]
          },
        ]
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
      user_sessions: {
        Row: {
          created_at: string | null
          device_info: string | null
          expires_at: string
          id: string
          ip_address: unknown | null
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          device_info?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown | null
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          device_info?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown | null
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
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

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const 