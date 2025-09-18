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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cases: {
        Row: {
          created_at: string
          id: string
          raw_text: string
          structured_json: Json | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_text: string
          structured_json?: Json | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_text?: string
          structured_json?: Json | null
          title?: string
        }
        Relationships: []
      }
      codes: {
        Row: {
          created_at: string
          id: string
          target_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id: string
          target_id: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          target_id?: string
          type?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          case_id: string
          created_at: string
          focus_hint: string | null
          id: string
          protocols: Json
          title: string
          toggles: Json
        }
        Insert: {
          case_id: string
          created_at?: string
          focus_hint?: string | null
          id: string
          protocols?: Json
          title: string
          toggles?: Json
        }
        Update: {
          case_id?: string
          created_at?: string
          focus_hint?: string | null
          id?: string
          protocols?: Json
          title?: string
          toggles?: Json
        }
        Relationships: []
      }
      lessons: {
        Row: {
          created_at: string
          exercise_order: Json
          id: string
          objectives: Json
          title: string
        }
        Insert: {
          created_at?: string
          exercise_order?: Json
          id: string
          objectives?: Json
          title: string
        }
        Update: {
          created_at?: string
          exercise_order?: Json
          id?: string
          objectives?: Json
          title?: string
        }
        Relationships: []
      }
      protocols: {
        Row: {
          created_at: string
          id: string
          name: string
          raw_text: string
          structured_json: Json | null
          type: Database["public"]["Enums"]["protocol_type"]
          version: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          raw_text: string
          structured_json?: Json | null
          type: Database["public"]["Enums"]["protocol_type"]
          version?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          raw_text?: string
          structured_json?: Json | null
          type?: Database["public"]["Enums"]["protocol_type"]
          version?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          exercise_id: string | null
          id: string
          last_activity_at: string
          lesson_id: string | null
          mode: string
          started_at: string
          state: Json
          student_id: string | null
        }
        Insert: {
          exercise_id?: string | null
          id?: string
          last_activity_at?: string
          lesson_id?: string | null
          mode: string
          started_at?: string
          state?: Json
          student_id?: string | null
        }
        Update: {
          exercise_id?: string | null
          id?: string
          last_activity_at?: string
          lesson_id?: string | null
          mode?: string
          started_at?: string
          state?: Json
          student_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      protocol_type: "base" | "content" | "process"
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
      protocol_type: ["base", "content", "process"],
    },
  },
} as const
