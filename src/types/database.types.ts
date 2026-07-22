// Generated from the Supabase schema (migrations 0001–0007). Regenerate after any migration:
//   supabase gen types typescript --project-id <ref> > src/types/database.types.ts
// Only the `public` schema is exposed via the API; the `app` (staff/admin) schema is
// intentionally absent here because it is never reachable from client/anon/authenticated roles.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          billing_status: Database["public"]["Enums"]["billing_status"]
          created_at: string
          id: string
          name: string | null
          onboarded_at: string | null
          owner_id: string
          report_brand_name: string | null
          report_logo_url: string | null
          seats: number
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["account_tier"]
          updated_at: string
        }
        Insert: {
          billing_status?: Database["public"]["Enums"]["billing_status"]
          created_at?: string
          id?: string
          name?: string | null
          onboarded_at?: string | null
          owner_id: string
          report_brand_name?: string | null
          report_logo_url?: string | null
          seats?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["account_tier"]
          updated_at?: string
        }
        Update: {
          billing_status?: Database["public"]["Enums"]["billing_status"]
          created_at?: string
          id?: string
          name?: string | null
          onboarded_at?: string | null
          owner_id?: string
          report_brand_name?: string | null
          report_logo_url?: string | null
          seats?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["account_tier"]
          updated_at?: string
        }
        Relationships: []
      }
      audit_reports: {
        Row: {
          aeo_findings: Json
          created_at: string
          geo_findings: Json
          id: string
          overall_score: number | null
          page_url: string
          project_id: string
          recommendations: Json
          seo_findings: Json
          updated_at: string
        }
        Insert: {
          aeo_findings?: Json
          created_at?: string
          geo_findings?: Json
          id?: string
          overall_score?: number | null
          page_url: string
          project_id: string
          recommendations?: Json
          seo_findings?: Json
          updated_at?: string
        }
        Update: {
          aeo_findings?: Json
          created_at?: string
          geo_findings?: Json
          id?: string
          overall_score?: number | null
          page_url?: string
          project_id?: string
          recommendations?: Json
          seo_findings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      citations: {
        Row: {
          cited_domain: string
          created_at: string
          id: string
          position: number | null
          project_id: string
          snippet: string | null
          source_url: string | null
          tracking_run_id: string
        }
        Insert: {
          cited_domain: string
          created_at?: string
          id?: string
          position?: number | null
          project_id: string
          snippet?: string | null
          source_url?: string | null
          tracking_run_id: string
        }
        Update: {
          cited_domain?: string
          created_at?: string
          id?: string
          position?: number | null
          project_id?: string
          snippet?: string | null
          source_url?: string | null
          tracking_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "citations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "citations_tracking_run_id_fkey"
            columns: ["tracking_run_id"]
            isOneToOne: false
            referencedRelation: "tracking_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string
          domain: string
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      content_briefs: {
        Row: {
          created_at: string
          draft_content: string | null
          gap_summary: string | null
          id: string
          project_id: string
          status: Database["public"]["Enums"]["content_brief_status"]
          topic_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft_content?: string | null
          gap_summary?: string | null
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["content_brief_status"]
          topic_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft_content?: string | null
          gap_summary?: string | null
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["content_brief_status"]
          topic_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_briefs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_briefs_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          account_id: string
          created_at: string
          domain: string
          id: string
          label: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          domain: string
          id?: string
          label?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          domain?: string
          id?: string
          label?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          created_at: string
          id: string
          project_id: string
          text: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          text: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          text?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prompts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prompts_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          created_at: string
          id: string
          project_id: string
          text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_runs: {
        Row: {
          attempts: number
          claimed_at: string | null
          created_at: string
          engine: Database["public"]["Enums"]["tracking_engine"]
          error: string | null
          id: string
          project_id: string
          prompt_id: string
          raw_response: Json | null
          run_at: string | null
          status: Database["public"]["Enums"]["tracking_run_status"]
        }
        Insert: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          engine: Database["public"]["Enums"]["tracking_engine"]
          error?: string | null
          id?: string
          project_id: string
          prompt_id: string
          raw_response?: Json | null
          run_at?: string | null
          status?: Database["public"]["Enums"]["tracking_run_status"]
        }
        Update: {
          attempts?: number
          claimed_at?: string | null
          created_at?: string
          engine?: Database["public"]["Enums"]["tracking_engine"]
          error?: string | null
          id?: string
          project_id?: string
          prompt_id?: string
          raw_response?: Json | null
          run_at?: string | null
          status?: Database["public"]["Enums"]["tracking_run_status"]
        }
        Relationships: [
          {
            foreignKeyName: "tracking_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracking_runs_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      visibility_scores: {
        Row: {
          aeo_score: number | null
          blended_index: number | null
          created_at: string
          date: string
          geo_score: number | null
          id: string
          project_id: string
          seo_score: number | null
        }
        Insert: {
          aeo_score?: number | null
          blended_index?: number | null
          created_at?: string
          date: string
          geo_score?: number | null
          id?: string
          project_id: string
          seo_score?: number | null
        }
        Update: {
          aeo_score?: number | null
          blended_index?: number | null
          created_at?: string
          date?: string
          geo_score?: number | null
          id?: string
          project_id?: string
          seo_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "visibility_scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_access_log: {
        Args: Record<PropertyKey, never>
        Returns: {
          started_at: string
          ended_at: string | null
          reason: string
          staff_email: string
          access_mode: string
        }[]
      }
      admin_account_detail: {
        Args: { p_session: string }
        Returns: Json
      }
      admin_active_impersonation: {
        Args: { p_session: string }
        Returns: {
          account_id: string
          account_name: string | null
          account_domain: string | null
          expires_at: string
        }[]
      }
      admin_audit_log: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          staff_email: string
          account_name: string | null
          reason: string
          access_mode: string
          started_at: string
          ended_at: string | null
          expires_at: string
        }[]
      }
      admin_end_impersonation: {
        Args: { p_session: string }
        Returns: undefined
      }
      admin_search_accounts: {
        Args: { p_query: string }
        Returns: {
          id: string
          name: string | null
          tier: string
          billing_status: string
          owner_email: string
          projects: number
        }[]
      }
      admin_staff_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      admin_start_impersonation: {
        Args: { p_target: string; p_reason: string }
        Returns: string
      }
      enqueue_due_tracking_runs: {
        Args: { p_interval?: string }
        Returns: number
      }
    }
    Enums: {
      account_tier: "free" | "starter" | "consultant" | "agency" | "enterprise"
      billing_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "unpaid"
      content_brief_status: "draft" | "approved" | "archived"
      tracking_engine: "openai" | "perplexity" | "gemini"
      tracking_run_status: "pending" | "running" | "succeeded" | "failed"
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
      account_tier: ["free", "starter", "consultant", "agency", "enterprise"],
      billing_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "incomplete_expired",
        "unpaid",
      ],
      content_brief_status: ["draft", "approved", "archived"],
      tracking_engine: ["openai", "perplexity", "gemini"],
      tracking_run_status: ["pending", "running", "succeeded", "failed"],
    },
  },
} as const
