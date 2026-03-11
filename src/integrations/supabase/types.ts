export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      damage_reports: {
        Row: {
          created_at: string
          generated_at: string | null
          id: string
          monument_id: string
          order_id: string | null
          report_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string | null
          id?: string
          monument_id: string
          order_id?: string | null
          report_data?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string | null
          id?: string
          monument_id?: string
          order_id?: string | null
          report_data?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_reports_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      monuments: {
        Row: {
          approximate_height: string | null
          cemetery_name: string
          condition_chipping: boolean | null
          condition_faded_inscription: boolean | null
          condition_leaning: boolean | null
          condition_moss_algae: boolean | null
          condition_not_cleaned: boolean | null
          created_at: string
          estimated_miles: number | null
          id: string
          known_damage: boolean | null
          lot_number: string | null
          material: Database["public"]["Enums"]["material_type"]
          monument_type: Database["public"]["Enums"]["monument_type"]
          section: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approximate_height?: string | null
          cemetery_name: string
          condition_chipping?: boolean | null
          condition_faded_inscription?: boolean | null
          condition_leaning?: boolean | null
          condition_moss_algae?: boolean | null
          condition_not_cleaned?: boolean | null
          created_at?: string
          estimated_miles?: number | null
          id?: string
          known_damage?: boolean | null
          lot_number?: string | null
          material: Database["public"]["Enums"]["material_type"]
          monument_type: Database["public"]["Enums"]["monument_type"]
          section?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approximate_height?: string | null
          cemetery_name?: string
          condition_chipping?: boolean | null
          condition_faded_inscription?: boolean | null
          condition_leaning?: boolean | null
          condition_moss_algae?: boolean | null
          condition_not_cleaned?: boolean | null
          created_at?: string
          estimated_miles?: number | null
          id?: string
          known_damage?: boolean | null
          lot_number?: string | null
          material?: Database["public"]["Enums"]["material_type"]
          monument_type?: Database["public"]["Enums"]["monument_type"]
          section?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          add_ons: Json | null
          add_ons_total: number | null
          base_price: number
          bundle_id: string | null
          bundle_price: number | null
          consent_authorize: boolean | null
          consent_biological: boolean | null
          consent_photos: boolean | null
          created_at: string
          id: string
          is_veteran: boolean | null
          monument_id: string
          notes: string | null
          offer: Database["public"]["Enums"]["offer_type"]
          scheduled_date: string | null
          status: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id: string | null
          stripe_payment_status: string | null
          total_price: number
          travel_fee: number
          updated_at: string
          user_id: string
        }
        Insert: {
          add_ons?: Json | null
          add_ons_total?: number | null
          base_price: number
          bundle_id?: string | null
          bundle_price?: number | null
          consent_authorize?: boolean | null
          consent_biological?: boolean | null
          consent_photos?: boolean | null
          created_at?: string
          id?: string
          is_veteran?: boolean | null
          monument_id: string
          notes?: string | null
          offer: Database["public"]["Enums"]["offer_type"]
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          total_price: number
          travel_fee?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          add_ons?: Json | null
          add_ons_total?: number | null
          base_price?: number
          bundle_id?: string | null
          bundle_price?: number | null
          consent_authorize?: boolean | null
          consent_biological?: boolean | null
          consent_photos?: boolean | null
          created_at?: string
          id?: string
          is_veteran?: boolean | null
          monument_id?: string
          notes?: string | null
          offer?: Database["public"]["Enums"]["offer_type"]
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          stripe_payment_intent_id?: string | null
          stripe_payment_status?: string | null
          total_price?: number
          travel_fee?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_records: {
        Row: {
          created_at: string
          description: string | null
          gps_lat: number | null
          gps_lng: number | null
          id: string
          monument_id: string
          order_id: string | null
          photo_url: string
          taken_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          monument_id: string
          order_id?: string | null
          photo_url: string
          taken_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          monument_id?: string
          order_id?: string | null
          photo_url?: string
          taken_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_records_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photo_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          state: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      service_logs: {
        Row: {
          created_at: string
          id: string
          monument_id: string
          order_id: string | null
          private_notes: string | null
          public_notes: string | null
          service_date: string
          services_performed: string[]
          time_spent_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          monument_id: string
          order_id?: string | null
          private_notes?: string | null
          public_notes?: string | null
          service_date?: string
          services_performed?: string[]
          time_spent_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          monument_id?: string
          order_id?: string | null
          private_notes?: string | null
          public_notes?: string | null
          service_date?: string
          services_performed?: string[]
          time_spent_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_logs_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          important_dates: string | null
          monument_id: string
          period: string
          plan: Database["public"]["Enums"]["care_plan"]
          price: number
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          important_dates?: string | null
          monument_id: string
          period?: string
          plan: Database["public"]["Enums"]["care_plan"]
          price: number
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          important_dates?: string | null
          monument_id?: string
          period?: string
          plan?: Database["public"]["Enums"]["care_plan"]
          price?: number
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_monument_id_fkey"
            columns: ["monument_id"]
            isOneToOne: false
            referencedRelation: "monuments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
      care_plan: "guardian" | "keeper" | "sentinel" | "legacy"
      material_type: "granite" | "marble" | "bronze" | "mixed"
      monument_type:
        | "single_marker"
        | "double_marker"
        | "single_slant"
        | "single_upright"
        | "double_slant"
        | "double_upright"
        | "grave_ledger"
      offer_type: "A" | "B"
      order_status:
        | "pending"
        | "confirmed"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      subscription_status: "active" | "paused" | "cancelled" | "expired"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "customer"],
      care_plan: ["guardian", "keeper", "sentinel", "legacy"],
      material_type: ["granite", "marble", "bronze", "mixed"],
      monument_type: [
        "single_marker",
        "double_marker",
        "single_slant",
        "single_upright",
        "double_slant",
        "double_upright",
        "grave_ledger",
      ],
      offer_type: ["A", "B"],
      order_status: [
        "pending",
        "confirmed",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      subscription_status: ["active", "paused", "cancelled", "expired"],
    },
  },
} as const
