export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      anonymous_users: {
        Row: {
          id: string
          session_id: string
          interests: string[] | null
          is_active: boolean
          connected_at: string
          last_seen: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          interests?: string[] | null
          is_active?: boolean
          connected_at?: string
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          interests?: string[] | null
          is_active?: boolean
          connected_at?: string
          last_seen?: string
          created_at?: string
          updated_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user1_id: string
          user2_id: string | null
          status: 'waiting' | 'active' | 'ended'
          started_at: string | null
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user1_id: string
          user2_id?: string | null
          status?: 'waiting' | 'active' | 'ended'
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user1_id?: string
          user2_id?: string | null
          status?: 'waiting' | 'active' | 'ended'
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          session_id: string
          sender_id: string
          content: string
          encrypted_content: string
          message_type: 'text' | 'system'
          is_flagged: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          session_id: string
          sender_id: string
          content: string
          encrypted_content: string
          message_type?: 'text' | 'system'
          is_flagged?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          sender_id?: string
          content?: string
          encrypted_content?: string
          message_type?: 'text' | 'system'
          is_flagged?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      message_reactions: {
        Row: {
          id: string
          message_id: string
          user_id: string
          reaction: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          reaction: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          reaction?: string
          created_at?: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string
          session_id: string
          reason: string
          description: string | null
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id: string
          session_id: string
          reason: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string
          session_id?: string
          reason?: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      banned_users: {
        Row: {
          id: string
          user_id: string
          banned_by: string
          reason: string
          expires_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          banned_by: string
          reason: string
          expires_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          banned_by?: string
          reason?: string
          expires_at?: string | null
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: 'admin' | 'moderator'
          assigned_by: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: 'admin' | 'moderator'
          assigned_by: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: 'admin' | 'moderator'
          assigned_by?: string
          created_at?: string
        }
      }
      system_stats: {
        Row: {
          id: string
          active_users: number
          total_sessions: number
          total_messages: number
          recorded_at: string
        }
        Insert: {
          id?: string
          active_users: number
          total_sessions: number
          total_messages: number
          recorded_at?: string
        }
        Update: {
          id?: string
          active_users?: number
          total_sessions?: number
          total_messages?: number
          recorded_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_users_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      cleanup_old_sessions: {
        Args: Record<PropertyKey, never>
        Returns: void
      }
      match_users_by_interests: {
        Args: {
          user_id: string
        }
        Returns: {
          id: string
          interests: string[]
        }[]
      }
    }
    Enums: {
      chat_status: 'waiting' | 'active' | 'ended'
      message_type: 'text' | 'system'
      report_status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
      user_role: 'admin' | 'moderator'
    }
  }
}
