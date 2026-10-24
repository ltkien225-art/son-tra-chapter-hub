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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          message: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          message?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_users: {
        Row: {
          active: boolean
          email: string
          note: string
          office_role: string | null
          sensitive_access: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          email: string
          note?: string
          office_role?: string | null
          sensitive_access?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          email?: string
          note?: string
          office_role?: string | null
          sensitive_access?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      attachments: {
        Row: {
          created_at: string
          created_by: string
          filename: string
          id: string
          mime: string
          owner_id: string
          owner_type: string
          path: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          created_by: string
          filename: string
          id?: string
          mime: string
          owner_id: string
          owner_type: string
          path: string
          size_bytes: number
        }
        Update: {
          created_at?: string
          created_by?: string
          filename?: string
          id?: string
          mime?: string
          owner_id?: string
          owner_type?: string
          path?: string
          size_bytes?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string
          at: string
          chapter_id: string | null
          id: number
          resource_id: string
          resource_type: string
        }
        Insert: {
          action: string
          actor: string
          at?: string
          chapter_id?: string | null
          id?: number
          resource_id: string
          resource_type: string
        }
        Update: {
          action?: string
          actor?: string
          at?: string
          chapter_id?: string | null
          id?: number
          resource_id?: string
          resource_type?: string
        }
        Relationships: []
      }
      chapter_access: {
        Row: {
          chapter_id: string
          email: string
        }
        Insert: {
          chapter_id: string
          email: string
        }
        Update: {
          chapter_id?: string
          email?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_access_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_access_email_fkey"
            columns: ["email"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["email"]
          },
        ]
      }
      chapters: {
        Row: {
          created_at: string
          households: number | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          households?: number | null
          id: string
          name: string
        }
        Update: {
          created_at?: string
          households?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      document_recipients: {
        Row: {
          chapter_id: string
          document_id: string
          read_at: string | null
        }
        Insert: {
          chapter_id: string
          document_id: string
          read_at?: string | null
        }
        Update: {
          chapter_id?: string
          document_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_recipients_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_recipients_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          archived: boolean
          body: string
          code: string
          created_at: string
          created_by: string
          direction: string
          doc_date: string | null
          id: string
          is_test: boolean
          issuer: string
          scope: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          body?: string
          code?: string
          created_at?: string
          created_by: string
          direction: string
          doc_date?: string | null
          id?: string
          is_test?: boolean
          issuer?: string
          scope?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          body?: string
          code?: string
          created_at?: string
          created_by?: string
          direction?: string
          doc_date?: string | null
          id?: string
          is_test?: boolean
          issuer?: string
          scope?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_counts: {
        Row: {
          chapter_id: string
          members_left: number
          members_new: number
          members_total: number
          period: string
          updated_at: string
          updated_by: string
        }
        Insert: {
          chapter_id: string
          members_left?: number
          members_new?: number
          members_total: number
          period: string
          updated_at?: string
          updated_by?: string
        }
        Update: {
          chapter_id?: string
          members_left?: number
          members_new?: number
          members_total?: number
          period?: string
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_counts_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      sensitive_cases: {
        Row: {
          category: string
          chapter_id: string
          created_at: string
          created_by: string
          details: string
          id: string
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          category: string
          chapter_id: string
          created_at?: string
          created_by: string
          details?: string
          id?: string
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          category?: string
          chapter_id?: string
          created_at?: string
          created_by?: string
          details?: string
          id?: string
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensitive_cases_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          body: string
          chapter_id: string
          created_at: string
          created_by: string
          id: string
          is_test: boolean
          kind: string
          period: string | null
          status: string
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          chapter_id: string
          created_at?: string
          created_by: string
          id?: string
          is_test?: boolean
          kind: string
          period?: string | null
          status?: string
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          chapter_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_test?: boolean
          kind?: string
          period?: string | null
          status?: string
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignments: {
        Row: {
          chapter_id: string
          note: string
          progress: number
          status: string
          task_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          chapter_id: string
          note?: string
          progress?: number
          status?: string
          task_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          chapter_id?: string
          note?: string
          progress?: number
          status?: string
          task_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          created_by: string
          description: string
          due_at: string | null
          id: string
          is_test: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          due_at?: string | null
          id?: string
          is_test?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          due_at?: string | null
          id?: string
          is_test?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_chapter: { Args: { _ch: string }; Returns: boolean }
      can_read_owner: { Args: { _id: string; _type: string }; Returns: boolean }
      can_write_owner: {
        Args: { _id: string; _type: string }
        Returns: boolean
      }
      current_email: { Args: never; Returns: string }
      doc_addressed_to_me: { Args: { _doc: string }; Returns: boolean }
      export_backup: { Args: never; Returns: Json }
      has_any_chapter: { Args: never; Returns: boolean }
      has_sensitive: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_office: { Args: never; Returns: boolean }
      list_submissions: {
        Args: {
          _chapter?: string
          _kind?: string
          _limit?: number
          _offset?: number
          _status?: string
        }
        Returns: {
          body: string
          chapter_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          period: string
          status: string
          title: string
          total: number
          updated_at: string
        }[]
      }
      mark_document_read: {
        Args: { _chapter: string; _doc: string }
        Returns: undefined
      }
      my_access: { Args: never; Returns: Json }
      office_summary: {
        Args: { _period?: string }
        Returns: {
          chapter_id: string
          households: number
          members_left: number
          members_new: number
          members_total: number
          name: string
          open_tasks: number
          overdue_tasks: number
          period: string
          submissions_count: number
        }[]
      }
      restore_backup: { Args: { _b: Json; _dry_run?: boolean }; Returns: Json }
      revoke_user_access: { Args: { _email: string }; Returns: undefined }
      set_user_access: {
        Args: {
          _chapters: string[]
          _email: string
          _note?: string
          _office_role: string
          _sensitive: boolean
        }
        Returns: undefined
      }
      task_assigned_to_me: { Args: { _task: string }; Returns: boolean }
      task_is_active: { Args: { _task: string }; Returns: boolean }
      update_assignment: {
        Args: {
          _chapter: string
          _note: string
          _progress: number
          _status: string
          _task: string
        }
        Returns: undefined
      }
      withdraw_submission: { Args: { _id: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
