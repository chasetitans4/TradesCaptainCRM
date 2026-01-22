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
      ab_test_variants: {
        Row: {
          booked: number | null
          booking_rate: number | null
          content: string
          content_type: string | null
          conversion_rate: number | null
          converted: number | null
          created_at: string | null
          id: string
          impressions: number | null
          is_control: boolean | null
          qualification_rate: number | null
          qualified: number | null
          replies: number | null
          reply_rate: number | null
          test_id: string
          traffic_percent: number | null
          variant_name: string
        }
        Insert: {
          booked?: number | null
          booking_rate?: number | null
          content: string
          content_type?: string | null
          conversion_rate?: number | null
          converted?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          is_control?: boolean | null
          qualification_rate?: number | null
          qualified?: number | null
          replies?: number | null
          reply_rate?: number | null
          test_id: string
          traffic_percent?: number | null
          variant_name: string
        }
        Update: {
          booked?: number | null
          booking_rate?: number | null
          content?: string
          content_type?: string | null
          conversion_rate?: number | null
          converted?: number | null
          created_at?: string | null
          id?: string
          impressions?: number | null
          is_control?: boolean | null
          qualification_rate?: number | null
          qualified?: number | null
          replies?: number | null
          reply_rate?: number | null
          test_id?: string
          traffic_percent?: number | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_test_variants_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      ab_tests: {
        Row: {
          campaign_id: string | null
          confidence_threshold: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          sample_size_target: number | null
          start_date: string | null
          status: string | null
          test_type: string
          updated_at: string | null
          winner_variant_id: string | null
          winning_metric: string | null
        }
        Insert: {
          campaign_id?: string | null
          confidence_threshold?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          sample_size_target?: number | null
          start_date?: string | null
          status?: string | null
          test_type: string
          updated_at?: string | null
          winner_variant_id?: string | null
          winning_metric?: string | null
        }
        Update: {
          campaign_id?: string | null
          confidence_threshold?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          sample_size_target?: number | null
          start_date?: string | null
          status?: string | null
          test_type?: string
          updated_at?: string | null
          winner_variant_id?: string | null
          winning_metric?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ab_tests_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ab_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          action: string
          business_id: string | null
          created_at: string | null
          description: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      addon_subscriptions: {
        Row: {
          addon_type: string
          business_id: string
          canceled_at: string | null
          created_at: string | null
          id: string
          quantity: number | null
          status: string | null
          stripe_price_id: string | null
          stripe_subscription_item_id: string | null
          updated_at: string | null
        }
        Insert: {
          addon_type: string
          business_id: string
          canceled_at?: string | null
          created_at?: string | null
          id?: string
          quantity?: number | null
          status?: string | null
          stripe_price_id?: string | null
          stripe_subscription_item_id?: string | null
          updated_at?: string | null
        }
        Update: {
          addon_type?: string
          business_id?: string
          canceled_at?: string | null
          created_at?: string | null
          id?: string
          quantity?: number | null
          status?: string | null
          stripe_price_id?: string | null
          stripe_subscription_item_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "addon_subscriptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_activity_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_log_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_invoices: {
        Row: {
          agent_id: string | null
          amount: number
          billing_interval: string | null
          created_at: string | null
          crm_account_id: string | null
          crm_coupon_code: string | null
          crm_coupon_included: boolean | null
          due_date: string | null
          id: string
          paid_at: string | null
          status: string | null
          stripe_invoice_id: string | null
          stripe_invoice_number: string | null
          stripe_invoice_pdf: string | null
          stripe_invoice_url: string | null
          updated_at: string | null
          web_customer_id: string | null
        }
        Insert: {
          agent_id?: string | null
          amount: number
          billing_interval?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          crm_coupon_code?: string | null
          crm_coupon_included?: boolean | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_invoice_number?: string | null
          stripe_invoice_pdf?: string | null
          stripe_invoice_url?: string | null
          updated_at?: string | null
          web_customer_id?: string | null
        }
        Update: {
          agent_id?: string | null
          amount?: number
          billing_interval?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          crm_coupon_code?: string | null
          crm_coupon_included?: boolean | null
          due_date?: string | null
          id?: string
          paid_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_invoice_number?: string | null
          stripe_invoice_pdf?: string | null
          stripe_invoice_url?: string | null
          updated_at?: string | null
          web_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_invoices_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invoices_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_invoices_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_sessions: {
        Row: {
          admin_user_id: string
          created_at: string | null
          expires_at: string
          id: string
          ip_address: string | null
          refresh_expires_at: string | null
          refresh_token_hash: string | null
          revoked_at: string | null
          token_hash: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          refresh_expires_at?: string | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          token_hash: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          refresh_expires_at?: string | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          token_hash?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_sessions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          commission_rate: number | null
          created_at: string | null
          email: string
          full_name: string
          hire_date: string | null
          id: string
          last_login_at: string | null
          password_hash: string
          phone: string | null
          role: string
          status: string | null
          timezone: string | null
          timezone_offset_minutes: number | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          updated_at: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string | null
          email: string
          full_name: string
          hire_date?: string | null
          id?: string
          last_login_at?: string | null
          password_hash: string
          phone?: string | null
          role?: string
          status?: string | null
          timezone?: string | null
          timezone_offset_minutes?: number | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string | null
          email?: string
          full_name?: string
          hire_date?: string | null
          id?: string
          last_login_at?: string | null
          password_hash?: string
          phone?: string | null
          role?: string
          status?: string | null
          timezone?: string | null
          timezone_offset_minutes?: number | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      agent_achievements: {
        Row: {
          achievement_description: string | null
          achievement_name: string | null
          achievement_type: string
          agent_id: string
          earned_at: string | null
          expires_at: string | null
          id: string
          notified: boolean | null
          tier: string | null
          value: number | null
        }
        Insert: {
          achievement_description?: string | null
          achievement_name?: string | null
          achievement_type: string
          agent_id: string
          earned_at?: string | null
          expires_at?: string | null
          id?: string
          notified?: boolean | null
          tier?: string | null
          value?: number | null
        }
        Update: {
          achievement_description?: string | null
          achievement_name?: string | null
          achievement_type?: string
          agent_id?: string
          earned_at?: string | null
          expires_at?: string | null
          id?: string
          notified?: boolean | null
          tier?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_achievements_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_availability: {
        Row: {
          agent_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          shift_number: number | null
          start_time: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          shift_number?: number | null
          start_time: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          shift_number?: number | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_availability_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_blackout_days: {
        Row: {
          agent_id: string
          blackout_date: string | null
          blackout_end_date: string | null
          blackout_type: string
          created_at: string | null
          day_of_week: number | null
          id: string
          is_active: boolean | null
          reason: string | null
        }
        Insert: {
          agent_id: string
          blackout_date?: string | null
          blackout_end_date?: string | null
          blackout_type: string
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
        }
        Update: {
          agent_id?: string
          blackout_date?: string | null
          blackout_end_date?: string | null
          blackout_type?: string
          created_at?: string | null
          day_of_week?: number | null
          id?: string
          is_active?: boolean | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_blackout_days_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_break_times: {
        Row: {
          agent_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_active: boolean | null
          reason: string | null
          recurring: boolean | null
          start_time: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_active?: boolean | null
          reason?: string | null
          recurring?: boolean | null
          start_time: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          reason?: string | null
          recurring?: boolean | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_break_times_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_commissions: {
        Row: {
          agent_id: string
          amount_cents: number
          clawback_eligible_until: string | null
          clawback_reason: string | null
          commission_type: string
          created_at: string | null
          customer_id: string
          earned_date: string
          eligible_date: string | null
          id: string
          notes: string | null
          paid_date: string | null
          plan_price_cents: number | null
          plan_type: string | null
          rate_applied: number | null
          status: string
          subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          amount_cents: number
          clawback_eligible_until?: string | null
          clawback_reason?: string | null
          commission_type: string
          created_at?: string | null
          customer_id: string
          earned_date: string
          eligible_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          plan_price_cents?: number | null
          plan_type?: string | null
          rate_applied?: number | null
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          amount_cents?: number
          clawback_eligible_until?: string | null
          clawback_reason?: string | null
          commission_type?: string
          created_at?: string | null
          customer_id?: string
          earned_date?: string
          eligible_date?: string | null
          id?: string
          notes?: string | null
          paid_date?: string | null
          plan_price_cents?: number | null
          plan_type?: string | null
          rate_applied?: number | null
          status?: string
          subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_daily_performance: {
        Row: {
          active_customers: number | null
          agent_id: string
          avg_deal_size: number | null
          avg_response_time_minutes: number | null
          churned_customers: number | null
          close_rate: number | null
          commission_earned: number | null
          contacted_leads: number | null
          created_at: string | null
          date: string
          deals_closed: number | null
          id: string
          new_leads: number | null
          retention_rate: number | null
          revenue_generated: number | null
          total_leads: number | null
        }
        Insert: {
          active_customers?: number | null
          agent_id: string
          avg_deal_size?: number | null
          avg_response_time_minutes?: number | null
          churned_customers?: number | null
          close_rate?: number | null
          commission_earned?: number | null
          contacted_leads?: number | null
          created_at?: string | null
          date: string
          deals_closed?: number | null
          id?: string
          new_leads?: number | null
          retention_rate?: number | null
          revenue_generated?: number | null
          total_leads?: number | null
        }
        Update: {
          active_customers?: number | null
          agent_id?: string
          avg_deal_size?: number | null
          avg_response_time_minutes?: number | null
          churned_customers?: number | null
          close_rate?: number | null
          commission_earned?: number | null
          contacted_leads?: number | null
          created_at?: string | null
          date?: string
          deals_closed?: number | null
          id?: string
          new_leads?: number | null
          retention_rate?: number | null
          revenue_generated?: number | null
          total_leads?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_daily_performance_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_distribution_weights: {
        Row: {
          agent_id: string
          created_at: string | null
          current_daily_calls: number | null
          id: string
          is_active: boolean | null
          last_assigned_at: string | null
          max_daily_calls: number | null
          weight_percent: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          current_daily_calls?: number | null
          id?: string
          is_active?: boolean | null
          last_assigned_at?: string | null
          max_daily_calls?: number | null
          weight_percent?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          current_daily_calls?: number | null
          id?: string
          is_active?: boolean | null
          last_assigned_at?: string | null
          max_daily_calls?: number | null
          weight_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_distribution_weights_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_goals: {
        Row: {
          agent_id: string
          created_at: string | null
          deal_actual: number | null
          deal_goal: number | null
          id: string
          period_end: string
          period_start: string
          period_type: string
          response_time_actual: number | null
          response_time_goal: number | null
          retention_actual: number | null
          retention_goal: number | null
          revenue_actual: number | null
          revenue_goal: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          deal_actual?: number | null
          deal_goal?: number | null
          id?: string
          period_end: string
          period_start: string
          period_type: string
          response_time_actual?: number | null
          response_time_goal?: number | null
          retention_actual?: number | null
          retention_goal?: number | null
          revenue_actual?: number | null
          revenue_goal?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          deal_actual?: number | null
          deal_goal?: number | null
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          response_time_actual?: number | null
          response_time_goal?: number | null
          retention_actual?: number | null
          retention_goal?: number | null
          revenue_actual?: number | null
          revenue_goal?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_goals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_submissions: {
        Row: {
          agent_id: string
          agent_name: string
          client_company_name: string
          client_email: string
          client_phone: string | null
          created_at: string | null
          crm_plan_selected: string
          id: string
          invite_email_sent_at: string | null
          invite_expires_at: string | null
          invite_token: string | null
          invoice_validated: boolean | null
          rejection_reason: string | null
          status: string | null
          submission_type: string
          updated_at: string | null
          validation_error: string | null
          web_invoice_number: string
          web_plan_type: string
        }
        Insert: {
          agent_id: string
          agent_name: string
          client_company_name: string
          client_email: string
          client_phone?: string | null
          created_at?: string | null
          crm_plan_selected: string
          id?: string
          invite_email_sent_at?: string | null
          invite_expires_at?: string | null
          invite_token?: string | null
          invoice_validated?: boolean | null
          rejection_reason?: string | null
          status?: string | null
          submission_type: string
          updated_at?: string | null
          validation_error?: string | null
          web_invoice_number: string
          web_plan_type: string
        }
        Update: {
          agent_id?: string
          agent_name?: string
          client_company_name?: string
          client_email?: string
          client_phone?: string | null
          created_at?: string | null
          crm_plan_selected?: string
          id?: string
          invite_email_sent_at?: string | null
          invite_expires_at?: string | null
          invite_token?: string | null
          invoice_validated?: boolean | null
          rejection_reason?: string | null
          status?: string | null
          submission_type?: string
          updated_at?: string | null
          validation_error?: string | null
          web_invoice_number?: string
          web_plan_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_submissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_time_blocks: {
        Row: {
          agent_id: string
          block_type: string
          created_at: string | null
          end_datetime: string
          id: string
          reason: string | null
          start_datetime: string
        }
        Insert: {
          agent_id: string
          block_type: string
          created_at?: string | null
          end_datetime: string
          id?: string
          reason?: string | null
          start_datetime: string
        }
        Update: {
          agent_id?: string
          block_type?: string
          created_at?: string | null
          end_datetime?: string
          id?: string
          reason?: string | null
          start_datetime?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_time_blocks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      agreement_equipment: {
        Row: {
          equipment_id: string
          id: string
          service_agreement_id: string
        }
        Insert: {
          equipment_id: string
          id?: string
          service_agreement_id: string
        }
        Update: {
          equipment_id?: string
          id?: string
          service_agreement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agreement_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "customer_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agreement_equipment_service_agreement_id_fkey"
            columns: ["service_agreement_id"]
            isOneToOne: false
            referencedRelation: "service_agreements"
            referencedColumns: ["id"]
          },
        ]
      }
      area_code_timezones: {
        Row: {
          area_code: string
          region: string | null
          state: string | null
          timezone: string
        }
        Insert: {
          area_code: string
          region?: string | null
          state?: string | null
          timezone: string
        }
        Update: {
          area_code?: string
          region?: string | null
          state?: string | null
          timezone?: string
        }
        Relationships: []
      }
      arrival_pings: {
        Row: {
          address: string | null
          arrived_at: string | null
          business_id: string
          created_at: string | null
          id: string
          job_id: string
          latitude: number
          longitude: number
          sms_message_id: string | null
          sms_sent: boolean | null
          sms_sent_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          arrived_at?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          job_id: string
          latitude: number
          longitude: number
          sms_message_id?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          arrived_at?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          job_id?: string
          latitude?: number
          longitude?: number
          sms_message_id?: string | null
          sms_sent?: boolean | null
          sms_sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_pings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_pings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_pings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_touchpoints: {
        Row: {
          contact_id: string
          conversion_value_cents: number | null
          converted: boolean | null
          created_at: string | null
          first_touch_credit: number | null
          id: string
          last_touch_credit: number | null
          linear_credit: number | null
          position_credit: number | null
          time_decay_credit: number | null
          touchpoint_at: string
          touchpoint_details: Json | null
          touchpoint_type: string
        }
        Insert: {
          contact_id: string
          conversion_value_cents?: number | null
          converted?: boolean | null
          created_at?: string | null
          first_touch_credit?: number | null
          id?: string
          last_touch_credit?: number | null
          linear_credit?: number | null
          position_credit?: number | null
          time_decay_credit?: number | null
          touchpoint_at: string
          touchpoint_details?: Json | null
          touchpoint_type: string
        }
        Update: {
          contact_id?: string
          conversion_value_cents?: number | null
          converted?: boolean | null
          created_at?: string | null
          first_touch_credit?: number | null
          id?: string
          last_touch_credit?: number | null
          linear_credit?: number | null
          position_credit?: number | null
          time_decay_credit?: number | null
          touchpoint_at?: string
          touchpoint_details?: Json | null
          touchpoint_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribution_touchpoints_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_events: {
        Row: {
          business_id: string | null
          customer_id: string | null
          executed_at: string | null
          id: string
          job_id: string | null
          lead_id: string | null
          quote_id: string | null
          scheduled_for: string
          skip_reason: string | null
          status: string | null
          type: string
        }
        Insert: {
          business_id?: string | null
          customer_id?: string | null
          executed_at?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          quote_id?: string | null
          scheduled_for: string
          skip_reason?: string | null
          status?: string | null
          type: string
        }
        Update: {
          business_id?: string | null
          customer_id?: string | null
          executed_at?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          quote_id?: string | null
          scheduled_for?: string
          skip_reason?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_events_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_requests: {
        Row: {
          address: string
          alternate_date: string | null
          alternate_time_slot: string | null
          business_id: string
          city: string | null
          confirmed_by: string | null
          confirmed_date: string | null
          confirmed_time: string | null
          created_at: string | null
          customer_email: string
          customer_id: string | null
          customer_name: string
          customer_phone: string
          decline_reason: string | null
          description: string | null
          id: string
          internal_notes: string | null
          job_id: string | null
          preferred_date: string
          preferred_time_slot: string | null
          service_type: string
          source: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          urgency: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          zip: string | null
        }
        Insert: {
          address: string
          alternate_date?: string | null
          alternate_time_slot?: string | null
          business_id: string
          city?: string | null
          confirmed_by?: string | null
          confirmed_date?: string | null
          confirmed_time?: string | null
          created_at?: string | null
          customer_email: string
          customer_id?: string | null
          customer_name: string
          customer_phone: string
          decline_reason?: string | null
          description?: string | null
          id?: string
          internal_notes?: string | null
          job_id?: string | null
          preferred_date: string
          preferred_time_slot?: string | null
          service_type: string
          source?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          zip?: string | null
        }
        Update: {
          address?: string
          alternate_date?: string | null
          alternate_time_slot?: string | null
          business_id?: string
          city?: string | null
          confirmed_by?: string | null
          confirmed_date?: string | null
          confirmed_time?: string | null
          created_at?: string | null
          customer_email?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string
          decline_reason?: string | null
          description?: string | null
          id?: string
          internal_notes?: string | null
          job_id?: string | null
          preferred_date?: string
          preferred_time_slot?: string | null
          service_type?: string
          source?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_settings: {
        Row: {
          auto_confirm: boolean | null
          available_days: number[] | null
          booking_url_slug: string | null
          buffer_minutes: number | null
          business_id: string
          calendar_integration: boolean | null
          confirmation_message: string | null
          created_at: string | null
          day_end_time: string | null
          day_start_time: string | null
          enabled_services: string[] | null
          id: string
          is_enabled: boolean | null
          lead_time_hours: number | null
          logo_url: string | null
          max_days_ahead: number | null
          notify_email: string | null
          primary_color: string | null
          slot_duration_minutes: number | null
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          auto_confirm?: boolean | null
          available_days?: number[] | null
          booking_url_slug?: string | null
          buffer_minutes?: number | null
          business_id: string
          calendar_integration?: boolean | null
          confirmation_message?: string | null
          created_at?: string | null
          day_end_time?: string | null
          day_start_time?: string | null
          enabled_services?: string[] | null
          id?: string
          is_enabled?: boolean | null
          lead_time_hours?: number | null
          logo_url?: string | null
          max_days_ahead?: number | null
          notify_email?: string | null
          primary_color?: string | null
          slot_duration_minutes?: number | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          auto_confirm?: boolean | null
          available_days?: number[] | null
          booking_url_slug?: string | null
          buffer_minutes?: number | null
          business_id?: string
          calendar_integration?: boolean | null
          confirmation_message?: string | null
          created_at?: string | null
          day_end_time?: string | null
          day_start_time?: string | null
          enabled_services?: string[] | null
          id?: string
          is_enabled?: boolean | null
          lead_time_hours?: number | null
          logo_url?: string | null
          max_days_ahead?: number | null
          notify_email?: string | null
          primary_color?: string | null
          slot_duration_minutes?: number | null
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_inventory: {
        Row: {
          assigned_to: string | null
          assigned_vehicle: string | null
          brand: string | null
          business_id: string
          category_id: string | null
          condition: string | null
          created_at: string | null
          current_value: number | null
          description: string | null
          id: string
          last_maintenance: string | null
          location: string | null
          min_quantity: number | null
          model: string | null
          name: string
          next_maintenance: string | null
          notes: string | null
          photo_urls: string[] | null
          purchase_date: string | null
          purchase_price: number | null
          quantity: number | null
          serial_number: string | null
          specifications: Json | null
          status: string | null
          updated_at: string | null
          warranty_expires: string | null
        }
        Insert: {
          assigned_to?: string | null
          assigned_vehicle?: string | null
          brand?: string | null
          business_id: string
          category_id?: string | null
          condition?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          last_maintenance?: string | null
          location?: string | null
          min_quantity?: number | null
          model?: string | null
          name: string
          next_maintenance?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          updated_at?: string | null
          warranty_expires?: string | null
        }
        Update: {
          assigned_to?: string | null
          assigned_vehicle?: string | null
          brand?: string | null
          business_id?: string
          category_id?: string | null
          condition?: string | null
          created_at?: string | null
          current_value?: number | null
          description?: string | null
          id?: string
          last_maintenance?: string | null
          location?: string | null
          min_quantity?: number | null
          model?: string | null
          name?: string
          next_maintenance?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          purchase_date?: string | null
          purchase_price?: number | null
          quantity?: number | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          updated_at?: string | null
          warranty_expires?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_inventory_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_inventory_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_inventory_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      business_locations: {
        Row: {
          address_line1: string | null
          business_id: string
          city: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          postal_code: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          address_line1?: string | null
          business_id: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          address_line1?: string | null
          business_id?: string
          city?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_locations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          additional_locations_count: number | null
          after_hours_minimum: number | null
          after_hours_rate_multiplier: number | null
          ai_late_night_acknowledgment: boolean | null
          ai_sms_disabled_until: string | null
          ai_sms_enabled: boolean | null
          ai_sms_knowledge_base: string | null
          ai_sms_quiet_end: string | null
          ai_sms_quiet_start: string | null
          ai_sms_tone: string | null
          auto_review_request_enabled: boolean | null
          auto_send_survey: boolean | null
          billable_user_count: number | null
          billing_cycle_anchor: string | null
          business_hours: Json | null
          call_after_hours_mode: string | null
          call_business_hours_only: boolean | null
          call_forward_numbers: string[] | null
          call_forwarding_mode: string | null
          call_ring_timeout: number | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          default_tax_rate: number | null
          drive_time_default_minutes: number | null
          drive_time_enabled: boolean | null
          email: string
          emergency_contact_email: string | null
          emergency_contact_phone: string | null
          free_user_limit: number | null
          google_place_id: string | null
          google_review_threshold: number | null
          guides_completed: string[] | null
          has_leads_captain_addon: boolean | null
          has_multi_location_addon: boolean | null
          id: string
          invoice_due_days: number | null
          invoice_terms: string | null
          leads_limit: number | null
          leads_month_reset_at: string | null
          leads_reset_date: string | null
          leads_this_month: number | null
          leads_used: number | null
          logo_url: string | null
          name: string
          next_invoice_number: number | null
          next_quote_number: number | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          owner_name: string
          owner_phone: string | null
          per_user_price: number | null
          phone: string
          phone_number_strategy: string | null
          plan_start_date: string | null
          plan_tier: string
          portal_features_enabled: Json | null
          primary_color: string | null
          questionnaire_completed: boolean | null
          questionnaire_completed_at: string | null
          quote_terms: string | null
          quote_validity_days: number | null
          rate_lock_date: string | null
          rate_locked_at_15: boolean | null
          reply_to_email: string | null
          review_link_facebook: string | null
          review_link_google: string | null
          review_link_primary: string | null
          review_link_yelp: string | null
          review_request_delay_hours: number | null
          review_request_message: string | null
          service_area: Json | null
          settings_notifications: Json | null
          slack_webhook_url: string | null
          stripe_account_id: string | null
          stripe_customer_id: string | null
          stripe_onboarding_complete: boolean | null
          stripe_subscription_id: string | null
          stripe_subscription_status: string | null
          survey_delay_hours: number | null
          survey_enabled: boolean | null
          tax_rate: number | null
          team_size: string | null
          timezone: string | null
          tips_seen: string[] | null
          trade_type: string | null
          twilio_phone_number: string | null
          twilio_phone_sid: string | null
          updated_at: string | null
          voicemail_greeting_url: string | null
          walkthrough_completed: boolean | null
          walkthrough_completed_at: string | null
          whatsapp_enabled: boolean | null
        }
        Insert: {
          additional_locations_count?: number | null
          after_hours_minimum?: number | null
          after_hours_rate_multiplier?: number | null
          ai_late_night_acknowledgment?: boolean | null
          ai_sms_disabled_until?: string | null
          ai_sms_enabled?: boolean | null
          ai_sms_knowledge_base?: string | null
          ai_sms_quiet_end?: string | null
          ai_sms_quiet_start?: string | null
          ai_sms_tone?: string | null
          auto_review_request_enabled?: boolean | null
          auto_send_survey?: boolean | null
          billable_user_count?: number | null
          billing_cycle_anchor?: string | null
          business_hours?: Json | null
          call_after_hours_mode?: string | null
          call_business_hours_only?: boolean | null
          call_forward_numbers?: string[] | null
          call_forwarding_mode?: string | null
          call_ring_timeout?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          default_tax_rate?: number | null
          drive_time_default_minutes?: number | null
          drive_time_enabled?: boolean | null
          email: string
          emergency_contact_email?: string | null
          emergency_contact_phone?: string | null
          free_user_limit?: number | null
          google_place_id?: string | null
          google_review_threshold?: number | null
          guides_completed?: string[] | null
          has_leads_captain_addon?: boolean | null
          has_multi_location_addon?: boolean | null
          id?: string
          invoice_due_days?: number | null
          invoice_terms?: string | null
          leads_limit?: number | null
          leads_month_reset_at?: string | null
          leads_reset_date?: string | null
          leads_this_month?: number | null
          leads_used?: number | null
          logo_url?: string | null
          name: string
          next_invoice_number?: number | null
          next_quote_number?: number | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          owner_name: string
          owner_phone?: string | null
          per_user_price?: number | null
          phone: string
          phone_number_strategy?: string | null
          plan_start_date?: string | null
          plan_tier?: string
          portal_features_enabled?: Json | null
          primary_color?: string | null
          questionnaire_completed?: boolean | null
          questionnaire_completed_at?: string | null
          quote_terms?: string | null
          quote_validity_days?: number | null
          rate_lock_date?: string | null
          rate_locked_at_15?: boolean | null
          reply_to_email?: string | null
          review_link_facebook?: string | null
          review_link_google?: string | null
          review_link_primary?: string | null
          review_link_yelp?: string | null
          review_request_delay_hours?: number | null
          review_request_message?: string | null
          service_area?: Json | null
          settings_notifications?: Json | null
          slack_webhook_url?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          survey_delay_hours?: number | null
          survey_enabled?: boolean | null
          tax_rate?: number | null
          team_size?: string | null
          timezone?: string | null
          tips_seen?: string[] | null
          trade_type?: string | null
          twilio_phone_number?: string | null
          twilio_phone_sid?: string | null
          updated_at?: string | null
          voicemail_greeting_url?: string | null
          walkthrough_completed?: boolean | null
          walkthrough_completed_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Update: {
          additional_locations_count?: number | null
          after_hours_minimum?: number | null
          after_hours_rate_multiplier?: number | null
          ai_late_night_acknowledgment?: boolean | null
          ai_sms_disabled_until?: string | null
          ai_sms_enabled?: boolean | null
          ai_sms_knowledge_base?: string | null
          ai_sms_quiet_end?: string | null
          ai_sms_quiet_start?: string | null
          ai_sms_tone?: string | null
          auto_review_request_enabled?: boolean | null
          auto_send_survey?: boolean | null
          billable_user_count?: number | null
          billing_cycle_anchor?: string | null
          business_hours?: Json | null
          call_after_hours_mode?: string | null
          call_business_hours_only?: boolean | null
          call_forward_numbers?: string[] | null
          call_forwarding_mode?: string | null
          call_ring_timeout?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          default_tax_rate?: number | null
          drive_time_default_minutes?: number | null
          drive_time_enabled?: boolean | null
          email?: string
          emergency_contact_email?: string | null
          emergency_contact_phone?: string | null
          free_user_limit?: number | null
          google_place_id?: string | null
          google_review_threshold?: number | null
          guides_completed?: string[] | null
          has_leads_captain_addon?: boolean | null
          has_multi_location_addon?: boolean | null
          id?: string
          invoice_due_days?: number | null
          invoice_terms?: string | null
          leads_limit?: number | null
          leads_month_reset_at?: string | null
          leads_reset_date?: string | null
          leads_this_month?: number | null
          leads_used?: number | null
          logo_url?: string | null
          name?: string
          next_invoice_number?: number | null
          next_quote_number?: number | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          owner_name?: string
          owner_phone?: string | null
          per_user_price?: number | null
          phone?: string
          phone_number_strategy?: string | null
          plan_start_date?: string | null
          plan_tier?: string
          portal_features_enabled?: Json | null
          primary_color?: string | null
          questionnaire_completed?: boolean | null
          questionnaire_completed_at?: string | null
          quote_terms?: string | null
          quote_validity_days?: number | null
          rate_lock_date?: string | null
          rate_locked_at_15?: boolean | null
          reply_to_email?: string | null
          review_link_facebook?: string | null
          review_link_google?: string | null
          review_link_primary?: string | null
          review_link_yelp?: string | null
          review_request_delay_hours?: number | null
          review_request_message?: string | null
          service_area?: Json | null
          settings_notifications?: Json | null
          slack_webhook_url?: string | null
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_onboarding_complete?: boolean | null
          stripe_subscription_id?: string | null
          stripe_subscription_status?: string | null
          survey_delay_hours?: number | null
          survey_enabled?: boolean | null
          tax_rate?: number | null
          team_size?: string | null
          timezone?: string | null
          tips_seen?: string[] | null
          trade_type?: string | null
          twilio_phone_number?: string | null
          twilio_phone_sid?: string | null
          updated_at?: string | null
          voicemail_greeting_url?: string | null
          walkthrough_completed?: boolean | null
          walkthrough_completed_at?: string | null
          whatsapp_enabled?: boolean | null
        }
        Relationships: []
      }
      calendar_connections: {
        Row: {
          calendar_id: string | null
          created_at: string | null
          email: string
          id: string
          last_sync_at: string | null
          nylas_grant_id: string
          provider: string
          sync_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calendar_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          last_sync_at?: string | null
          nylas_grant_id: string
          provider: string
          sync_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calendar_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          last_sync_at?: string | null
          nylas_grant_id?: string
          provider?: string
          sync_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_slot_holds: {
        Row: {
          business_id: string | null
          confirmed_at: string | null
          conversation_id: string | null
          created_at: string | null
          expires_at: string
          held_at: string | null
          id: string
          metadata: Json | null
          released_at: string | null
          slot_end: string
          slot_start: string
          status: string
        }
        Insert: {
          business_id?: string | null
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          expires_at: string
          held_at?: string | null
          id?: string
          metadata?: Json | null
          released_at?: string | null
          slot_end: string
          slot_start: string
          status?: string
        }
        Update: {
          business_id?: string | null
          confirmed_at?: string | null
          conversation_id?: string | null
          created_at?: string | null
          expires_at?: string
          held_at?: string | null
          id?: string
          metadata?: Json | null
          released_at?: string | null
          slot_end?: string
          slot_start?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_slot_holds_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      call_distribution_log: {
        Row: {
          agents_considered: Json | null
          contact_id: string | null
          created_at: string | null
          distribution_method: string | null
          id: string
          scheduled_call_id: string | null
          selected_agent_id: string | null
          selection_reason: string | null
        }
        Insert: {
          agents_considered?: Json | null
          contact_id?: string | null
          created_at?: string | null
          distribution_method?: string | null
          id?: string
          scheduled_call_id?: string | null
          selected_agent_id?: string | null
          selection_reason?: string | null
        }
        Update: {
          agents_considered?: Json | null
          contact_id?: string | null
          created_at?: string | null
          distribution_method?: string | null
          id?: string
          scheduled_call_id?: string | null
          selected_agent_id?: string | null
          selection_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_distribution_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_distribution_log_scheduled_call_id_fkey"
            columns: ["scheduled_call_id"]
            isOneToOne: false
            referencedRelation: "scheduled_calls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_distribution_log_selected_agent_id_fkey"
            columns: ["selected_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      call_distribution_settings: {
        Row: {
          blackout_saturday: boolean | null
          blackout_sunday: boolean | null
          buffer_minutes: number | null
          call_duration_minutes: number | null
          created_at: string | null
          distribution_method: string | null
          id: string
          max_advance_business_days: number | null
          min_notice_hours: number | null
          overflow_ai_message: string | null
          overflow_auto_assign_on_availability: boolean | null
          overflow_auto_assign_time: string | null
          overflow_distribution_mode: string | null
          overflow_notification: string | null
          overflow_to_admin: boolean | null
          prioritize_hot_leads: boolean | null
          skip_at_capacity: boolean | null
          updated_at: string | null
          weekend_request_ai_message: string | null
        }
        Insert: {
          blackout_saturday?: boolean | null
          blackout_sunday?: boolean | null
          buffer_minutes?: number | null
          call_duration_minutes?: number | null
          created_at?: string | null
          distribution_method?: string | null
          id?: string
          max_advance_business_days?: number | null
          min_notice_hours?: number | null
          overflow_ai_message?: string | null
          overflow_auto_assign_on_availability?: boolean | null
          overflow_auto_assign_time?: string | null
          overflow_distribution_mode?: string | null
          overflow_notification?: string | null
          overflow_to_admin?: boolean | null
          prioritize_hot_leads?: boolean | null
          skip_at_capacity?: boolean | null
          updated_at?: string | null
          weekend_request_ai_message?: string | null
        }
        Update: {
          blackout_saturday?: boolean | null
          blackout_sunday?: boolean | null
          buffer_minutes?: number | null
          call_duration_minutes?: number | null
          created_at?: string | null
          distribution_method?: string | null
          id?: string
          max_advance_business_days?: number | null
          min_notice_hours?: number | null
          overflow_ai_message?: string | null
          overflow_auto_assign_on_availability?: boolean | null
          overflow_auto_assign_time?: string | null
          overflow_distribution_mode?: string | null
          overflow_notification?: string | null
          overflow_to_admin?: boolean | null
          prioritize_hot_leads?: boolean | null
          skip_at_capacity?: boolean | null
          updated_at?: string | null
          weekend_request_ai_message?: string | null
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          direction: string
          duration_seconds: number | null
          id: string
          lead_id: string | null
          notes: string | null
          outcome: string | null
          phone: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          phone: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          outcome?: string | null
          phone?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          business_id: string
          checklist_type: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          items: Json
          job_types: string[] | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          checklist_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          job_types?: string[] | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          checklist_type?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json
          job_types?: string[] | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      client_checklist_status: {
        Row: {
          checklist_type: string
          client_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          items: Json
          overall_progress: number | null
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          checklist_type: string
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          overall_progress?: number | null
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          checklist_type?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          overall_progress?: number | null
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_checklist_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      client_locations: {
        Row: {
          added_at: string | null
          addon_price_cents: number | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          client_id: string
          created_at: string | null
          email: string | null
          gbp_listing_url: string | null
          gbp_verified: boolean | null
          id: string
          is_addon: boolean | null
          is_primary: boolean | null
          location_name: string | null
          nevermiss_phone: string | null
          phone: string | null
          shares_nevermiss_with: string | null
          state: string | null
          status: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          added_at?: string | null
          addon_price_cents?: number | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          client_id: string
          created_at?: string | null
          email?: string | null
          gbp_listing_url?: string | null
          gbp_verified?: boolean | null
          id?: string
          is_addon?: boolean | null
          is_primary?: boolean | null
          location_name?: string | null
          nevermiss_phone?: string | null
          phone?: string | null
          shares_nevermiss_with?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          added_at?: string | null
          addon_price_cents?: number | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          client_id?: string
          created_at?: string | null
          email?: string | null
          gbp_listing_url?: string | null
          gbp_verified?: boolean | null
          id?: string
          is_addon?: boolean | null
          is_primary?: boolean | null
          location_name?: string | null
          nevermiss_phone?: string | null
          phone?: string | null
          shares_nevermiss_with?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_locations_shares_nevermiss_with_fkey"
            columns: ["shares_nevermiss_with"]
            isOneToOne: false
            referencedRelation: "client_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      client_onboarding: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          progress_percent: number | null
          started_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          progress_percent?: number | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_onboarding_tasks: {
        Row: {
          assigned_to: string | null
          blocked_reason: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          due_date: string | null
          id: string
          notes: string | null
          onboarding_id: string
          phase_name: string | null
          phase_number: number | null
          status: string
          task_name: string
          template_task_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          onboarding_id: string
          phase_name?: string | null
          phase_number?: number | null
          status?: string
          task_name: string
          template_task_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          onboarding_id?: string
          phase_name?: string | null
          phase_number?: number | null
          status?: string
          task_name?: string
          template_task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_onboarding_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_onboarding_tasks_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "client_onboarding"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_onboarding_tasks_template_task_id_fkey"
            columns: ["template_task_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          avg_ltv: number | null
          cohort_month: string
          created_at: string | null
          current_count: number | null
          id: string
          month_1_count: number | null
          month_12_count: number | null
          month_2_count: number | null
          month_3_count: number | null
          month_6_count: number | null
          starting_count: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          avg_ltv?: number | null
          cohort_month: string
          created_at?: string | null
          current_count?: number | null
          id?: string
          month_1_count?: number | null
          month_12_count?: number | null
          month_2_count?: number | null
          month_3_count?: number | null
          month_6_count?: number | null
          starting_count?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_ltv?: number | null
          cohort_month?: string
          created_at?: string | null
          current_count?: number | null
          id?: string
          month_1_count?: number | null
          month_12_count?: number | null
          month_2_count?: number | null
          month_3_count?: number | null
          month_6_count?: number | null
          starting_count?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      commission_payout_batches: {
        Row: {
          commissions_failed: number | null
          commissions_processed: number | null
          created_at: string | null
          error_details: Json | null
          id: string
          notes: string | null
          payout_date: string
          processed_at: string | null
          processed_by: string | null
          status: string | null
          total_amount_cents: number | null
          total_commissions: number | null
          updated_at: string | null
        }
        Insert: {
          commissions_failed?: number | null
          commissions_processed?: number | null
          created_at?: string | null
          error_details?: Json | null
          id?: string
          notes?: string | null
          payout_date: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          total_amount_cents?: number | null
          total_commissions?: number | null
          updated_at?: string | null
        }
        Update: {
          commissions_failed?: number | null
          commissions_processed?: number | null
          created_at?: string | null
          error_details?: Json | null
          id?: string
          notes?: string | null
          payout_date?: string
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          total_amount_cents?: number | null
          total_commissions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payout_batches_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_payouts: {
        Row: {
          agent_id: string
          commission_ids: string[]
          created_at: string | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          payout_date: string
          status: string | null
          total_amount_cents: number
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          commission_ids: string[]
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_date: string
          status?: string | null
          total_amount_cents: number
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          commission_ids?: string[]
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_date?: string
          status?: string | null
          total_amount_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rates: {
        Row: {
          created_at: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          notes: string | null
          rate_percentage: number
          rate_type: string
        }
        Insert: {
          created_at?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          rate_percentage: number
          rate_type: string
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          rate_percentage?: number
          rate_type?: string
        }
        Relationships: []
      }
      commission_rules: {
        Row: {
          annual_rate: number | null
          annual_renewal_commission: boolean | null
          billing_interval: string
          created_at: string | null
          custom_rate: number | null
          effective_from: string | null
          effective_until: string | null
          id: string
          is_active: boolean | null
          month_12_bonus: number | null
          month_3_call_bonus: number | null
          month_4_bonus: number | null
          month_6_bonus: number | null
          plan_tier: string
          plan_type: string
          recurring_end_payment: number | null
          recurring_rate: number | null
          recurring_start_payment: number | null
          retention_enabled: boolean | null
          updated_at: string | null
          upfront_amount: number | null
          upfront_delay_payments: number | null
          version: string | null
        }
        Insert: {
          annual_rate?: number | null
          annual_renewal_commission?: boolean | null
          billing_interval: string
          created_at?: string | null
          custom_rate?: number | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          month_12_bonus?: number | null
          month_3_call_bonus?: number | null
          month_4_bonus?: number | null
          month_6_bonus?: number | null
          plan_tier: string
          plan_type: string
          recurring_end_payment?: number | null
          recurring_rate?: number | null
          recurring_start_payment?: number | null
          retention_enabled?: boolean | null
          updated_at?: string | null
          upfront_amount?: number | null
          upfront_delay_payments?: number | null
          version?: string | null
        }
        Update: {
          annual_rate?: number | null
          annual_renewal_commission?: boolean | null
          billing_interval?: string
          created_at?: string | null
          custom_rate?: number | null
          effective_from?: string | null
          effective_until?: string | null
          id?: string
          is_active?: boolean | null
          month_12_bonus?: number | null
          month_3_call_bonus?: number | null
          month_4_bonus?: number | null
          month_6_bonus?: number | null
          plan_tier?: string
          plan_type?: string
          recurring_end_payment?: number | null
          recurring_rate?: number | null
          recurring_start_payment?: number | null
          retention_enabled?: boolean | null
          updated_at?: string | null
          upfront_amount?: number | null
          upfront_delay_payments?: number | null
          version?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          agent_id: string
          approved_at: string | null
          approved_by: string | null
          billing_interval: string
          commission_amount: number
          commission_rate: number | null
          commission_type: string
          company_sale: boolean | null
          created_at: string | null
          crm_account_id: string | null
          eligible_at: string | null
          forfeited_at: string | null
          forfeiture_reason: string | null
          id: string
          paid_at: string | null
          paid_via: string | null
          payment_number: number | null
          payment_reference: string | null
          plan_tier: string | null
          plan_type: string
          retention_milestone: string | null
          sale_amount: number
          sale_date: string
          sale_type: string
          scheduled_payout_date: string | null
          status: string | null
          stripe_subscription_id: string | null
          trigger_payment_date: string | null
          updated_at: string | null
          web_customer_id: string | null
        }
        Insert: {
          agent_id: string
          approved_at?: string | null
          approved_by?: string | null
          billing_interval: string
          commission_amount: number
          commission_rate?: number | null
          commission_type: string
          company_sale?: boolean | null
          created_at?: string | null
          crm_account_id?: string | null
          eligible_at?: string | null
          forfeited_at?: string | null
          forfeiture_reason?: string | null
          id?: string
          paid_at?: string | null
          paid_via?: string | null
          payment_number?: number | null
          payment_reference?: string | null
          plan_tier?: string | null
          plan_type: string
          retention_milestone?: string | null
          sale_amount: number
          sale_date: string
          sale_type: string
          scheduled_payout_date?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          trigger_payment_date?: string | null
          updated_at?: string | null
          web_customer_id?: string | null
        }
        Update: {
          agent_id?: string
          approved_at?: string | null
          approved_by?: string | null
          billing_interval?: string
          commission_amount?: number
          commission_rate?: number | null
          commission_type?: string
          company_sale?: boolean | null
          created_at?: string | null
          crm_account_id?: string | null
          eligible_at?: string | null
          forfeited_at?: string | null
          forfeiture_reason?: string | null
          id?: string
          paid_at?: string | null
          paid_via?: string | null
          payment_number?: number | null
          payment_reference?: string | null
          plan_tier?: string | null
          plan_type?: string
          retention_milestone?: string | null
          sale_amount?: number
          sale_date?: string
          sale_type?: string
          scheduled_payout_date?: string | null
          status?: string | null
          stripe_subscription_id?: string | null
          trigger_payment_date?: string | null
          updated_at?: string | null
          web_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_mentions: {
        Row: {
          competitor_name: string | null
          contact_id: string
          contract_end_date: string | null
          detected_at: string | null
          dislikes: string | null
          id: string
          likes: string | null
          mention_type: string | null
          message_id: string | null
          switching_reason: string | null
        }
        Insert: {
          competitor_name?: string | null
          contact_id: string
          contract_end_date?: string | null
          detected_at?: string | null
          dislikes?: string | null
          id?: string
          likes?: string | null
          mention_type?: string | null
          message_id?: string | null
          switching_reason?: string | null
        }
        Update: {
          competitor_name?: string | null
          contact_id?: string
          contract_end_date?: string | null
          detected_at?: string | null
          dislikes?: string | null
          id?: string
          likes?: string | null
          mention_type?: string | null
          message_id?: string | null
          switching_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_mentions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitor_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "outreach_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          business_id: string
          created_at: string | null
          customer_id: string
          description: string | null
          id: string
          invoice_id: string | null
          referral_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          business_id: string
          created_at?: string | null
          customer_id: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          referral_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          business_id?: string
          created_at?: string | null
          customer_id?: string
          description?: string | null
          id?: string
          invoice_id?: string | null
          referral_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_accounts: {
        Row: {
          address: string | null
          agent_id: string | null
          billing_interval: string
          business_id: string | null
          business_name: string
          cancelled_at: string | null
          city: string | null
          company_sale: boolean | null
          contact_name: string
          coupon_id: string | null
          created_at: string | null
          deleted_at: string | null
          email: string
          id: string
          is_trial: boolean | null
          lead_id: string | null
          monthly_amount: number
          phone: string | null
          plan_tier: string
          plan_type: string
          plan_version: string | null
          promo_ends_at: string | null
          promo_type: string | null
          signup_source: string | null
          sms_soft_cap: number | null
          state: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_limit: number | null
          web_customer_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          billing_interval?: string
          business_id?: string | null
          business_name: string
          cancelled_at?: string | null
          city?: string | null
          company_sale?: boolean | null
          contact_name: string
          coupon_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email: string
          id?: string
          is_trial?: boolean | null
          lead_id?: string | null
          monthly_amount: number
          phone?: string | null
          plan_tier?: string
          plan_type: string
          plan_version?: string | null
          promo_ends_at?: string | null
          promo_type?: string | null
          signup_source?: string | null
          sms_soft_cap?: number | null
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_limit?: number | null
          web_customer_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          billing_interval?: string
          business_id?: string | null
          business_name?: string
          cancelled_at?: string | null
          city?: string | null
          company_sale?: boolean | null
          contact_name?: string
          coupon_id?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string
          id?: string
          is_trial?: boolean | null
          lead_id?: string | null
          monthly_amount?: number
          phone?: string | null
          plan_tier?: string
          plan_type?: string
          plan_version?: string | null
          promo_ends_at?: string | null
          promo_type?: string | null
          signup_source?: string | null
          sms_soft_cap?: number | null
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_limit?: number | null
          web_customer_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_accounts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_accounts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crm_accounts_coupon"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "crm_coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crm_accounts_lead"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tc_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_crm_accounts_web_customer"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_coupons: {
        Row: {
          code: string
          created_at: string | null
          created_by_agent_id: string | null
          crm_plan: string | null
          expires_at: string | null
          free_months: number | null
          id: string
          redeemed_at: string | null
          redeemed_by_account_id: string | null
          status: string | null
          web_customer_id: string
          web_plan_type: string
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by_agent_id?: string | null
          crm_plan?: string | null
          expires_at?: string | null
          free_months?: number | null
          id?: string
          redeemed_at?: string | null
          redeemed_by_account_id?: string | null
          status?: string | null
          web_customer_id: string
          web_plan_type: string
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by_agent_id?: string | null
          crm_plan?: string | null
          expires_at?: string | null
          free_months?: number | null
          id?: string
          redeemed_at?: string | null
          redeemed_by_account_id?: string | null
          status?: string | null
          web_customer_id?: string
          web_plan_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_coupons_created_by_agent_id_fkey"
            columns: ["created_by_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_coupons_redeemed_by_account_id_fkey"
            columns: ["redeemed_by_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_coupons_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_email_log: {
        Row: {
          crm_account_id: string | null
          email_type: string
          id: string
          metadata: Json | null
          sent_at: string | null
          sent_to: string
          status: string | null
        }
        Insert: {
          crm_account_id?: string | null
          email_type: string
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          sent_to: string
          status?: string | null
        }
        Update: {
          crm_account_id?: string | null
          email_type?: string
          id?: string
          metadata?: Json | null
          sent_at?: string | null
          sent_to?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_email_log_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_definitions: {
        Row: {
          business_id: string
          created_at: string | null
          default_value: string | null
          display_order: number | null
          entity_type: string
          field_key: string
          field_label: string
          field_type: string
          help_text: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          options: Json | null
          placeholder: string | null
          show_in_card: boolean | null
          show_in_list: boolean | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          default_value?: string | null
          display_order?: number | null
          entity_type: string
          field_key: string
          field_label: string
          field_type: string
          help_text?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          show_in_card?: boolean | null
          show_in_list?: boolean | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          default_value?: string | null
          display_order?: number | null
          entity_type?: string
          field_key?: string
          field_label?: string
          field_type?: string
          help_text?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          options?: Json | null
          placeholder?: string | null
          show_in_card?: boolean | null
          show_in_list?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_field_values: {
        Row: {
          business_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          field_definition_id: string
          id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          field_definition_id: string
          id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          field_definition_id?: string
          id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_values_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_field_values_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "custom_field_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_activity: {
        Row: {
          activity_type: string
          business_id: string
          created_at: string | null
          created_by: string | null
          created_by_system: boolean | null
          customer_id: string
          description: string | null
          id: string
          metadata: Json | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
        }
        Insert: {
          activity_type: string
          business_id: string
          created_at?: string | null
          created_by?: string | null
          created_by_system?: boolean | null
          customer_id: string
          description?: string | null
          id?: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          created_by_system?: boolean | null
          customer_id?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_activity_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_activity_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_commission_status: {
        Row: {
          agent_id: string
          billing_period: string | null
          created_at: string | null
          current_month: number
          customer_id: string
          customer_name: string
          has_open_support_ticket: boolean | null
          id: string
          last_login: string | null
          m11_renewal_completed: boolean | null
          m11_renewal_date: string | null
          m3_checkin_completed: boolean | null
          m3_checkin_date: string | null
          m6_review_completed: boolean | null
          m6_review_date: string | null
          m9_growth_completed: boolean | null
          m9_growth_date: string | null
          paused_reason: string | null
          paused_since: string | null
          plan_name: string
          plan_price_cents: number
          plan_type: string
          rate_lock_date: string | null
          rate_locked_at_15: boolean | null
          recurring_paused: boolean | null
          risk_reasons: string[] | null
          risk_score: number | null
          start_date: string
          subscription_id: string | null
          total_earned_cents: number | null
          total_paid_cents: number | null
          total_pending_cents: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          billing_period?: string | null
          created_at?: string | null
          current_month?: number
          customer_id: string
          customer_name: string
          has_open_support_ticket?: boolean | null
          id?: string
          last_login?: string | null
          m11_renewal_completed?: boolean | null
          m11_renewal_date?: string | null
          m3_checkin_completed?: boolean | null
          m3_checkin_date?: string | null
          m6_review_completed?: boolean | null
          m6_review_date?: string | null
          m9_growth_completed?: boolean | null
          m9_growth_date?: string | null
          paused_reason?: string | null
          paused_since?: string | null
          plan_name: string
          plan_price_cents: number
          plan_type: string
          rate_lock_date?: string | null
          rate_locked_at_15?: boolean | null
          recurring_paused?: boolean | null
          risk_reasons?: string[] | null
          risk_score?: number | null
          start_date: string
          subscription_id?: string | null
          total_earned_cents?: number | null
          total_paid_cents?: number | null
          total_pending_cents?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          billing_period?: string | null
          created_at?: string | null
          current_month?: number
          customer_id?: string
          customer_name?: string
          has_open_support_ticket?: boolean | null
          id?: string
          last_login?: string | null
          m11_renewal_completed?: boolean | null
          m11_renewal_date?: string | null
          m3_checkin_completed?: boolean | null
          m3_checkin_date?: string | null
          m6_review_completed?: boolean | null
          m6_review_date?: string | null
          m9_growth_completed?: boolean | null
          m9_growth_date?: string | null
          paused_reason?: string | null
          paused_since?: string | null
          plan_name?: string
          plan_price_cents?: number
          plan_type?: string
          rate_lock_date?: string | null
          rate_locked_at_15?: boolean | null
          recurring_paused?: boolean | null
          risk_reasons?: string[] | null
          risk_score?: number | null
          start_date?: string
          subscription_id?: string | null
          total_earned_cents?: number | null
          total_paid_cents?: number | null
          total_pending_cents?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_commission_status_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_credits: {
        Row: {
          balance: number | null
          business_id: string
          created_at: string | null
          customer_id: string
          id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number | null
          business_id: string
          created_at?: string | null
          customer_id: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          balance?: number | null
          business_id?: string
          created_at?: string | null
          customer_id?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_equipment: {
        Row: {
          brand: string | null
          business_id: string
          condition: string | null
          created_at: string | null
          customer_id: string
          equipment_type: string
          id: string
          install_date: string | null
          last_service_date: string | null
          location_in_property: string | null
          manufacture_date: string | null
          model: string | null
          name: string | null
          next_service_due: string | null
          notes: string | null
          photo_urls: string[] | null
          portal_visible: boolean | null
          serial_number: string | null
          specifications: Json | null
          status: string | null
          updated_at: string | null
          warranty_details: string | null
          warranty_expires: string | null
          warranty_provider: string | null
        }
        Insert: {
          brand?: string | null
          business_id: string
          condition?: string | null
          created_at?: string | null
          customer_id: string
          equipment_type: string
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          location_in_property?: string | null
          manufacture_date?: string | null
          model?: string | null
          name?: string | null
          next_service_due?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          portal_visible?: boolean | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          updated_at?: string | null
          warranty_details?: string | null
          warranty_expires?: string | null
          warranty_provider?: string | null
        }
        Update: {
          brand?: string | null
          business_id?: string
          condition?: string | null
          created_at?: string | null
          customer_id?: string
          equipment_type?: string
          id?: string
          install_date?: string | null
          last_service_date?: string | null
          location_in_property?: string | null
          manufacture_date?: string | null
          model?: string | null
          name?: string | null
          next_service_due?: string | null
          notes?: string | null
          photo_urls?: string[] | null
          portal_visible?: boolean | null
          serial_number?: string | null
          specifications?: Json | null
          status?: string | null
          updated_at?: string | null
          warranty_details?: string | null
          warranty_expires?: string | null
          warranty_provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_equipment_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_equipment_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_feedback: {
        Row: {
          business_id: string
          comment: string | null
          created_at: string | null
          customer_id: string
          id: string
          job_id: string | null
          rating: number
          source: string | null
          status: string | null
          updated_at: string | null
          would_recommend: boolean | null
        }
        Insert: {
          business_id: string
          comment?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          job_id?: string | null
          rating: number
          source?: string | null
          status?: string | null
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          business_id?: string
          comment?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          job_id?: string | null
          rating?: number
          source?: string | null
          status?: string | null
          updated_at?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_feedback_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_feedback_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_memberships: {
        Row: {
          business_id: string
          cancel_at_period_end: boolean | null
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_id: string
          emergency_calls_used: number | null
          id: string
          inspections_used: number | null
          notes: string | null
          plan_id: string
          started_at: string
          status: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id: string
          emergency_calls_used?: number | null
          id?: string
          inspections_used?: number | null
          notes?: string | null
          plan_id: string
          started_at?: string
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          cancel_at_period_end?: boolean | null
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_id?: string
          emergency_calls_used?: number | null
          id?: string
          inspections_used?: number | null
          notes?: string | null
          plan_id?: string
          started_at?: string
          status?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_memberships_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_access: {
        Row: {
          ai_paused: boolean | null
          ai_paused_at: string | null
          ai_paused_reason: string | null
          business_id: string
          created_at: string | null
          customer_id: string
          email: string
          email_verified: boolean | null
          failed_login_attempts: number | null
          id: string
          is_active: boolean | null
          last_failed_login_at: string | null
          last_login_at: string | null
          locked_until: string | null
          magic_link_expires_at: string | null
          magic_link_token: string | null
          notification_preferences: Json | null
          password_changed_at: string | null
          password_hash: string | null
          password_reset_expires_at: string | null
          password_reset_token: string | null
          pending_email: string | null
          pending_email_token: string | null
          pending_email_token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          ai_paused?: boolean | null
          ai_paused_at?: string | null
          ai_paused_reason?: string | null
          business_id: string
          created_at?: string | null
          customer_id: string
          email: string
          email_verified?: boolean | null
          failed_login_attempts?: number | null
          id?: string
          is_active?: boolean | null
          last_failed_login_at?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          magic_link_expires_at?: string | null
          magic_link_token?: string | null
          notification_preferences?: Json | null
          password_changed_at?: string | null
          password_hash?: string | null
          password_reset_expires_at?: string | null
          password_reset_token?: string | null
          pending_email?: string | null
          pending_email_token?: string | null
          pending_email_token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_paused?: boolean | null
          ai_paused_at?: string | null
          ai_paused_reason?: string | null
          business_id?: string
          created_at?: string | null
          customer_id?: string
          email?: string
          email_verified?: boolean | null
          failed_login_attempts?: number | null
          id?: string
          is_active?: boolean | null
          last_failed_login_at?: string | null
          last_login_at?: string | null
          locked_until?: string | null
          magic_link_expires_at?: string | null
          magic_link_token?: string | null
          notification_preferences?: Json | null
          password_changed_at?: string | null
          password_hash?: string | null
          password_reset_expires_at?: string | null
          password_reset_token?: string | null
          pending_email?: string | null
          pending_email_token?: string | null
          pending_email_token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_access_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_portal_access_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_pre_job_items: {
        Row: {
          business_id: string
          created_at: string | null
          customer_id: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          item_type: string
          label: string
          quantity: number | null
          sku: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_id: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          item_type: string
          label: string
          quantity?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_id?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          item_type?: string
          label?: string
          quantity?: number | null
          sku?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_pre_job_items_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_pre_job_items_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_referrals: {
        Row: {
          business_id: string
          completed_at: string | null
          completed_job_id: string | null
          contacted_at: string | null
          created_at: string | null
          id: string
          job_value: number | null
          notes: string | null
          program_id: string
          quoted_at: string | null
          referee_reward_issued_at: string | null
          referee_reward_status: string | null
          referral_code: string | null
          referred_address: string | null
          referred_customer_id: string | null
          referred_email: string | null
          referred_name: string | null
          referred_phone: string | null
          referrer_id: string
          referrer_reward_issued_at: string | null
          referrer_reward_notes: string | null
          referrer_reward_redeemed_at: string | null
          referrer_reward_status: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          completed_at?: string | null
          completed_job_id?: string | null
          contacted_at?: string | null
          created_at?: string | null
          id?: string
          job_value?: number | null
          notes?: string | null
          program_id: string
          quoted_at?: string | null
          referee_reward_issued_at?: string | null
          referee_reward_status?: string | null
          referral_code?: string | null
          referred_address?: string | null
          referred_customer_id?: string | null
          referred_email?: string | null
          referred_name?: string | null
          referred_phone?: string | null
          referrer_id: string
          referrer_reward_issued_at?: string | null
          referrer_reward_notes?: string | null
          referrer_reward_redeemed_at?: string | null
          referrer_reward_status?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          completed_at?: string | null
          completed_job_id?: string | null
          contacted_at?: string | null
          created_at?: string | null
          id?: string
          job_value?: number | null
          notes?: string | null
          program_id?: string
          quoted_at?: string | null
          referee_reward_issued_at?: string | null
          referee_reward_status?: string | null
          referral_code?: string | null
          referred_address?: string | null
          referred_customer_id?: string | null
          referred_email?: string | null
          referred_name?: string | null
          referred_phone?: string | null
          referrer_id?: string
          referrer_reward_issued_at?: string | null
          referrer_reward_notes?: string | null
          referrer_reward_redeemed_at?: string | null
          referrer_reward_status?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_referrals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referrals_completed_job_id_fkey"
            columns: ["completed_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referrals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "referral_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referrals_referred_customer_id_fkey"
            columns: ["referred_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_reminder_events: {
        Row: {
          business_id: string | null
          customer_id: string | null
          customer_response: string | null
          customer_response_at: string | null
          id: string
          job_id: string | null
          scheduled_for: string
          sent_at: string | null
          skip_reason: string | null
          status: string | null
          type: string
        }
        Insert: {
          business_id?: string | null
          customer_id?: string | null
          customer_response?: string | null
          customer_response_at?: string | null
          id?: string
          job_id?: string | null
          scheduled_for: string
          sent_at?: string | null
          skip_reason?: string | null
          status?: string | null
          type: string
        }
        Update: {
          business_id?: string | null
          customer_id?: string | null
          customer_response?: string | null
          customer_response_at?: string | null
          id?: string
          job_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          skip_reason?: string | null
          status?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_reminder_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reminder_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_reminder_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_touchpoints: {
        Row: {
          agent_id: string | null
          bonus_amount: number | null
          business_id: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          next_action: string | null
          notes: string | null
          outcome: string | null
          scheduled_for: string | null
          status: string | null
          touchpoint_type: string
          triggers_bonus: boolean | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          bonus_amount?: number | null
          business_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          next_action?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_for?: string | null
          status?: string | null
          touchpoint_type: string
          triggers_bonus?: boolean | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          bonus_amount?: number | null
          business_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          next_action?: string | null
          notes?: string | null
          outcome?: string | null
          scheduled_for?: string | null
          status?: string | null
          touchpoint_type?: string
          triggers_bonus?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_touchpoints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          access_notes: string | null
          address_line1: string | null
          address_line2: string | null
          average_job_value: number | null
          best_time_to_contact: string | null
          business_id: string | null
          city: string | null
          clv_segment: string | null
          created_at: string | null
          deleted_at: string | null
          dog_info: string | null
          email: string | null
          first_job_date: string | null
          gate_code: string | null
          geocoded_at: string | null
          has_dog: boolean | null
          id: string
          last_job_date: string | null
          latitude: number | null
          lifetime_value: number | null
          longitude: number | null
          name: string
          notes: string | null
          parking_notes: string | null
          phone: string
          predicted_clv: number | null
          preferred_contact_method: string | null
          source: string | null
          state: string | null
          stripe_customer_id: string | null
          tags: string[] | null
          timezone: string | null
          total_jobs: number | null
          total_revenue: number | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          access_notes?: string | null
          address_line1?: string | null
          address_line2?: string | null
          average_job_value?: number | null
          best_time_to_contact?: string | null
          business_id?: string | null
          city?: string | null
          clv_segment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dog_info?: string | null
          email?: string | null
          first_job_date?: string | null
          gate_code?: string | null
          geocoded_at?: string | null
          has_dog?: boolean | null
          id?: string
          last_job_date?: string | null
          latitude?: number | null
          lifetime_value?: number | null
          longitude?: number | null
          name: string
          notes?: string | null
          parking_notes?: string | null
          phone: string
          predicted_clv?: number | null
          preferred_contact_method?: string | null
          source?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          tags?: string[] | null
          timezone?: string | null
          total_jobs?: number | null
          total_revenue?: number | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          access_notes?: string | null
          address_line1?: string | null
          address_line2?: string | null
          average_job_value?: number | null
          best_time_to_contact?: string | null
          business_id?: string | null
          city?: string | null
          clv_segment?: string | null
          created_at?: string | null
          deleted_at?: string | null
          dog_info?: string | null
          email?: string | null
          first_job_date?: string | null
          gate_code?: string | null
          geocoded_at?: string | null
          has_dog?: boolean | null
          id?: string
          last_job_date?: string | null
          latitude?: number | null
          lifetime_value?: number | null
          longitude?: number | null
          name?: string
          notes?: string | null
          parking_notes?: string | null
          phone?: string
          predicted_clv?: number | null
          preferred_contact_method?: string | null
          source?: string | null
          state?: string | null
          stripe_customer_id?: string | null
          tags?: string[] | null
          timezone?: string | null
          total_jobs?: number | null
          total_revenue?: number | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          active_trials: number | null
          arr: number | null
          churned_customers: number | null
          commissions_eligible: number | null
          commissions_paid: number | null
          commissions_pending: number | null
          converted_leads: number | null
          created_at: string | null
          date: string
          downgrades: number | null
          id: string
          mrr: number | null
          new_customers: number | null
          new_leads: number | null
          total_crm_accounts: number | null
          total_gold_customers: number | null
          total_leads: number | null
          total_web_customers: number | null
          upgrades: number | null
        }
        Insert: {
          active_trials?: number | null
          arr?: number | null
          churned_customers?: number | null
          commissions_eligible?: number | null
          commissions_paid?: number | null
          commissions_pending?: number | null
          converted_leads?: number | null
          created_at?: string | null
          date: string
          downgrades?: number | null
          id?: string
          mrr?: number | null
          new_customers?: number | null
          new_leads?: number | null
          total_crm_accounts?: number | null
          total_gold_customers?: number | null
          total_leads?: number | null
          total_web_customers?: number | null
          upgrades?: number | null
        }
        Update: {
          active_trials?: number | null
          arr?: number | null
          churned_customers?: number | null
          commissions_eligible?: number | null
          commissions_paid?: number | null
          commissions_pending?: number | null
          converted_leads?: number | null
          created_at?: string | null
          date?: string
          downgrades?: number | null
          id?: string
          mrr?: number | null
          new_customers?: number | null
          new_leads?: number | null
          total_crm_accounts?: number | null
          total_gold_customers?: number | null
          total_leads?: number | null
          total_web_customers?: number | null
          upgrades?: number | null
        }
        Relationships: []
      }
      daily_route_summaries: {
        Row: {
          arrival_pings_count: number | null
          business_id: string
          created_at: string | null
          first_stop_address: string | null
          first_stop_time: string | null
          id: string
          jobs_completed: number | null
          last_stop_address: string | null
          last_stop_time: string | null
          status: string | null
          stops_visited: Json | null
          summary_date: string
          total_drive_minutes: number | null
          total_miles: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          arrival_pings_count?: number | null
          business_id: string
          created_at?: string | null
          first_stop_address?: string | null
          first_stop_time?: string | null
          id?: string
          jobs_completed?: number | null
          last_stop_address?: string | null
          last_stop_time?: string | null
          status?: string | null
          stops_visited?: Json | null
          summary_date: string
          total_drive_minutes?: number | null
          total_miles?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          arrival_pings_count?: number | null
          business_id?: string
          created_at?: string | null
          first_stop_address?: string | null
          first_stop_time?: string | null
          id?: string
          jobs_completed?: number | null
          last_stop_address?: string | null
          last_stop_time?: string | null
          status?: string | null
          stops_visited?: Json | null
          summary_date?: string
          total_drive_minutes?: number | null
          total_miles?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_route_summaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_route_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_routes: {
        Row: {
          business_id: string
          created_at: string | null
          estimated_end_time: string | null
          estimated_start_time: string | null
          id: string
          job_order: string[]
          optimization_score: number | null
          optimized_at: string | null
          route_date: string
          total_distance_miles: number | null
          total_drive_time_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          created_at?: string | null
          estimated_end_time?: string | null
          estimated_start_time?: string | null
          id?: string
          job_order: string[]
          optimization_score?: number | null
          optimized_at?: string | null
          route_date: string
          total_distance_miles?: number | null
          total_drive_time_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          created_at?: string | null
          estimated_end_time?: string | null
          estimated_start_time?: string | null
          id?: string
          job_order?: string[]
          optimization_score?: number | null
          optimized_at?: string | null
          route_date?: string
          total_distance_miles?: number | null
          total_drive_time_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_routes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_history: {
        Row: {
          action: string
          created_at: string | null
          dispatched_by: string | null
          from_user_id: string | null
          id: string
          job_id: string
          reason: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          to_user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          dispatched_by?: string | null
          from_user_id?: string | null
          id?: string
          job_id: string
          reason?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          to_user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          dispatched_by?: string | null
          from_user_id?: string | null
          id?: string
          job_id?: string
          reason?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_history_dispatched_by_fkey"
            columns: ["dispatched_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_history_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_history_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_history_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dnc_checks: {
        Row: {
          checked_at: string | null
          contact_id: string | null
          dnc_status: string
          expires_at: string | null
          id: string
          phone: string
          response_data: Json | null
          safe_to_contact: boolean
        }
        Insert: {
          checked_at?: string | null
          contact_id?: string | null
          dnc_status: string
          expires_at?: string | null
          id?: string
          phone: string
          response_data?: Json | null
          safe_to_contact: boolean
        }
        Update: {
          checked_at?: string | null
          contact_id?: string | null
          dnc_status?: string
          expires_at?: string | null
          id?: string
          phone?: string
          response_data?: Json | null
          safe_to_contact?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "dnc_checks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      dnc_settings: {
        Row: {
          api_key: string | null
          cache_days: number | null
          check_federal: boolean | null
          check_litigator: boolean | null
          check_on_create: boolean | null
          check_state: boolean | null
          created_at: string | null
          id: string
          recheck_after_days: number | null
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          cache_days?: number | null
          check_federal?: boolean | null
          check_litigator?: boolean | null
          check_on_create?: boolean | null
          check_state?: boolean | null
          created_at?: string | null
          id?: string
          recheck_after_days?: number | null
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          cache_days?: number | null
          check_federal?: boolean | null
          check_litigator?: boolean | null
          check_on_create?: boolean | null
          check_state?: boolean | null
          created_at?: string | null
          id?: string
          recheck_after_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          business_id: string
          category: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          equipment_id: string | null
          expiration_reminder_sent: boolean | null
          expires_at: string | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          job_id: string | null
          name: string
          storage_path: string
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string
          visibility: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          equipment_id?: string | null
          expiration_reminder_sent?: boolean | null
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          job_id?: string | null
          name: string
          storage_path: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by: string
          visibility?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          equipment_id?: string | null
          expiration_reminder_sent?: boolean | null
          expires_at?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          job_id?: string | null
          name?: string
          storage_path?: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "customer_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          business_id: string | null
          created_at: string | null
          email_type: string
          error_message: string | null
          id: string
          job_id: string | null
          lead_id: string | null
          recipient_email: string
          recipient_id: string | null
          recipient_name: string | null
          status: string | null
          subject: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          recipient_email: string
          recipient_id?: string | null
          recipient_name?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          recipient_email?: string
          recipient_id?: string | null
          recipient_name?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "email_recipients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preferences: {
        Row: {
          agent_id: string
          call_reminder: boolean | null
          call_reminder_minutes: number | null
          created_at: string | null
          daily_summary: boolean | null
          daily_summary_time: string | null
          email: string
          escalation_alerts: boolean | null
          hot_lead_alert: boolean | null
          id: string
          is_active: boolean | null
          new_lead_assigned: boolean | null
          overflow_alerts: boolean | null
          speed_alerts: boolean | null
          updated_at: string | null
          weekly_performance: boolean | null
        }
        Insert: {
          agent_id: string
          call_reminder?: boolean | null
          call_reminder_minutes?: number | null
          created_at?: string | null
          daily_summary?: boolean | null
          daily_summary_time?: string | null
          email: string
          escalation_alerts?: boolean | null
          hot_lead_alert?: boolean | null
          id?: string
          is_active?: boolean | null
          new_lead_assigned?: boolean | null
          overflow_alerts?: boolean | null
          speed_alerts?: boolean | null
          updated_at?: string | null
          weekly_performance?: boolean | null
        }
        Update: {
          agent_id?: string
          call_reminder?: boolean | null
          call_reminder_minutes?: number | null
          created_at?: string | null
          daily_summary?: boolean | null
          daily_summary_time?: string | null
          email?: string
          escalation_alerts?: boolean | null
          hot_lead_alert?: boolean | null
          id?: string
          is_active?: boolean | null
          new_lead_assigned?: boolean | null
          overflow_alerts?: boolean | null
          speed_alerts?: boolean | null
          updated_at?: string | null
          weekly_performance?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_preferences_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_recipients: {
        Row: {
          business_id: string | null
          created_at: string | null
          email: string
          id: string
          is_verified: boolean | null
          name: string | null
          notify_customer_confirms: boolean | null
          notify_customer_reschedules: boolean | null
          notify_daily_summary: boolean | null
          notify_lead_limit: boolean | null
          notify_new_leads: boolean | null
          notify_weekly_summary: boolean | null
          role_label: string | null
          updated_at: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          email: string
          id?: string
          is_verified?: boolean | null
          name?: string | null
          notify_customer_confirms?: boolean | null
          notify_customer_reschedules?: boolean | null
          notify_daily_summary?: boolean | null
          notify_lead_limit?: boolean | null
          notify_new_leads?: boolean | null
          notify_weekly_summary?: boolean | null
          role_label?: string | null
          updated_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          email?: string
          id?: string
          is_verified?: boolean | null
          name?: string | null
          notify_customer_confirms?: boolean | null
          notify_customer_reschedules?: boolean | null
          notify_daily_summary?: boolean | null
          notify_lead_limit?: boolean | null
          notify_new_leads?: boolean | null
          notify_weekly_summary?: boolean | null
          role_label?: string | null
          updated_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_recipients_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body_html: string
          body_text: string | null
          business_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string
          template_type: string | null
          updated_at: string | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          template_type?: string | null
          updated_at?: string | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          template_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      emails: {
        Row: {
          attachments: Json | null
          bcc_emails: string[] | null
          body_html: string | null
          body_text: string | null
          business_id: string
          cc_emails: string[] | null
          clicked_at: string | null
          created_at: string | null
          customer_id: string | null
          direction: string
          from_email: string
          from_name: string | null
          id: string
          message_id: string | null
          opened_at: string | null
          received_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          reply_to: string | null
          sent_at: string | null
          status: string | null
          subject: string | null
          thread_id: string | null
          to_emails: string[]
        }
        Insert: {
          attachments?: Json | null
          bcc_emails?: string[] | null
          body_html?: string | null
          body_text?: string | null
          business_id: string
          cc_emails?: string[] | null
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction: string
          from_email: string
          from_name?: string | null
          id?: string
          message_id?: string | null
          opened_at?: string | null
          received_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          thread_id?: string | null
          to_emails: string[]
        }
        Update: {
          attachments?: Json | null
          bcc_emails?: string[] | null
          body_html?: string | null
          body_text?: string | null
          business_id?: string
          cc_emails?: string[] | null
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          direction?: string
          from_email?: string
          from_name?: string | null
          id?: string
          message_id?: string | null
          opened_at?: string | null
          received_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reply_to?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string | null
          thread_id?: string | null
          to_emails?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "emails_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emails_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_requests: {
        Row: {
          acknowledged_after_hours_rate: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          after_hours_rate_amount: number | null
          business_id: string
          contact_method: string | null
          contact_phone: string
          created_at: string | null
          customer_id: string
          dispatched_job_id: string | null
          equipment_id: string | null
          id: string
          is_flooding: boolean | null
          is_gas_leak: boolean | null
          is_no_cooling: boolean | null
          is_no_heat: boolean | null
          issue_category: string | null
          issue_description: string
          photos: string[] | null
          request_type: string
          resolution_notes: string | null
          resolved_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          acknowledged_after_hours_rate?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          after_hours_rate_amount?: number | null
          business_id: string
          contact_method?: string | null
          contact_phone: string
          created_at?: string | null
          customer_id: string
          dispatched_job_id?: string | null
          equipment_id?: string | null
          id?: string
          is_flooding?: boolean | null
          is_gas_leak?: boolean | null
          is_no_cooling?: boolean | null
          is_no_heat?: boolean | null
          issue_category?: string | null
          issue_description: string
          photos?: string[] | null
          request_type: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          acknowledged_after_hours_rate?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          after_hours_rate_amount?: number | null
          business_id?: string
          contact_method?: string | null
          contact_phone?: string
          created_at?: string | null
          customer_id?: string
          dispatched_job_id?: string | null
          equipment_id?: string | null
          id?: string
          is_flooding?: boolean | null
          is_gas_leak?: boolean | null
          is_no_cooling?: boolean | null
          is_no_heat?: boolean | null
          issue_category?: string | null
          issue_description?: string
          photos?: string[] | null
          request_type?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_requests_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_dispatched_job_id_fkey"
            columns: ["dispatched_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "customer_equipment"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          business_id: string | null
          default_specs: Json | null
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          business_id?: string | null
          default_specs?: Json | null
          icon?: string | null
          id?: string
          name: string
        }
        Update: {
          business_id?: string | null
          default_specs?: Json | null
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_types_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_comments: {
        Row: {
          comment: string
          commenter_id: string
          commenter_name: string
          commenter_type: string
          created_at: string | null
          feature_request_id: string
          id: string
          is_official_response: boolean | null
          updated_at: string | null
        }
        Insert: {
          comment: string
          commenter_id: string
          commenter_name: string
          commenter_type: string
          created_at?: string | null
          feature_request_id: string
          id?: string
          is_official_response?: boolean | null
          updated_at?: string | null
        }
        Update: {
          comment?: string
          commenter_id?: string
          commenter_name?: string
          commenter_type?: string
          created_at?: string | null
          feature_request_id?: string
          id?: string
          is_official_response?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_comments_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          business_name: string | null
          category: string
          completed_at: string | null
          created_at: string | null
          crm_account_id: string | null
          description: string
          estimated_timeline: string | null
          id: string
          priority: string
          request_number: string | null
          request_seq_id: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          submitter_email: string
          submitter_id: string
          submitter_name: string
          title: string
          updated_at: string | null
          upvotes: number | null
          use_case: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          business_name?: string | null
          category: string
          completed_at?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          description: string
          estimated_timeline?: string | null
          id?: string
          priority?: string
          request_number?: string | null
          request_seq_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source: string
          status?: string
          submitter_email: string
          submitter_id: string
          submitter_name: string
          title: string
          updated_at?: string | null
          upvotes?: number | null
          use_case?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          business_name?: string | null
          category?: string
          completed_at?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          description?: string
          estimated_timeline?: string | null
          id?: string
          priority?: string
          request_number?: string | null
          request_seq_id?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          submitter_email?: string
          submitter_id?: string
          submitter_name?: string
          title?: string
          updated_at?: string | null
          upvotes?: number | null
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_settings: {
        Row: {
          ai_sms_enabled: boolean | null
          auto_appointment_reminders: boolean | null
          auto_review_requests: boolean | null
          business_id: string
          created_at: string | null
          email_notifications: boolean | null
          id: string
          invoices_enabled: boolean | null
          online_booking_enabled: boolean | null
          push_notifications: boolean | null
          quotes_enabled: boolean | null
          receipts_enabled: boolean | null
          route_optimization_enabled: boolean | null
          send_arrival_sms: boolean | null
          sms_notifications: boolean | null
          timesheets_enabled: boolean | null
          updated_at: string | null
        }
        Insert: {
          ai_sms_enabled?: boolean | null
          auto_appointment_reminders?: boolean | null
          auto_review_requests?: boolean | null
          business_id: string
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          invoices_enabled?: boolean | null
          online_booking_enabled?: boolean | null
          push_notifications?: boolean | null
          quotes_enabled?: boolean | null
          receipts_enabled?: boolean | null
          route_optimization_enabled?: boolean | null
          send_arrival_sms?: boolean | null
          sms_notifications?: boolean | null
          timesheets_enabled?: boolean | null
          updated_at?: string | null
        }
        Update: {
          ai_sms_enabled?: boolean | null
          auto_appointment_reminders?: boolean | null
          auto_review_requests?: boolean | null
          business_id?: string
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          invoices_enabled?: boolean | null
          online_booking_enabled?: boolean | null
          push_notifications?: boolean | null
          quotes_enabled?: boolean | null
          receipts_enabled?: boolean | null
          route_optimization_enabled?: boolean | null
          send_arrival_sms?: boolean | null
          sms_notifications?: boolean | null
          timesheets_enabled?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_votes: {
        Row: {
          created_at: string | null
          feature_request_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feature_request_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feature_request_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_votes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_instances: {
        Row: {
          attempt_number: number | null
          business_id: string
          created_at: string | null
          customer_id: string | null
          email_id: string | null
          entity_id: string
          entity_type: string
          id: string
          message_sid: string | null
          result_message: string | null
          rule_id: string
          scheduled_at: string
          sent_at: string | null
          status: string | null
          stopped_reason: string | null
        }
        Insert: {
          attempt_number?: number | null
          business_id: string
          created_at?: string | null
          customer_id?: string | null
          email_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          message_sid?: string | null
          result_message?: string | null
          rule_id: string
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
          stopped_reason?: string | null
        }
        Update: {
          attempt_number?: number | null
          business_id?: string
          created_at?: string | null
          customer_id?: string | null
          email_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          message_sid?: string | null
          result_message?: string | null
          rule_id?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          stopped_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_instances_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_instances_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_instances_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "follow_up_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_up_rules: {
        Row: {
          action_type: string
          business_id: string
          conditions: Json | null
          created_at: string | null
          delay_hours: number
          description: string | null
          email_subject: string | null
          email_template: string | null
          id: string
          is_active: boolean | null
          max_attempts: number | null
          message_template: string | null
          name: string
          sort_order: number | null
          stop_on_response: boolean | null
          task_assigned_to: string | null
          task_title: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          action_type: string
          business_id: string
          conditions?: Json | null
          created_at?: string | null
          delay_hours: number
          description?: string | null
          email_subject?: string | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          message_template?: string | null
          name: string
          sort_order?: number | null
          stop_on_response?: boolean | null
          task_assigned_to?: string | null
          task_title?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          business_id?: string
          conditions?: Json | null
          created_at?: string | null
          delay_hours?: number
          description?: string | null
          email_subject?: string | null
          email_template?: string | null
          id?: string
          is_active?: boolean | null
          max_attempts?: number | null
          message_template?: string | null
          name?: string
          sort_order?: number | null
          stop_on_response?: boolean | null
          task_assigned_to?: string | null
          task_title?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_up_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_up_rules_task_assigned_to_fkey"
            columns: ["task_assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      founders_program: {
        Row: {
          closed_at: string | null
          created_at: string | null
          id: string
          is_open: boolean | null
          slots_used: number | null
          total_slots: number | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          is_open?: boolean | null
          slots_used?: number | null
          total_slots?: number | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          id?: string
          is_open?: boolean | null
          slots_used?: number | null
          total_slots?: number | null
        }
        Relationships: []
      }
      geocode_cache: {
        Row: {
          address_hash: string
          created_at: string | null
          expires_at: string | null
          formatted_address: string | null
          hit_count: number | null
          id: string
          latitude: number
          longitude: number
          original_address: string
          place_id: string | null
        }
        Insert: {
          address_hash: string
          created_at?: string | null
          expires_at?: string | null
          formatted_address?: string | null
          hit_count?: number | null
          id?: string
          latitude: number
          longitude: number
          original_address: string
          place_id?: string | null
        }
        Update: {
          address_hash?: string
          created_at?: string | null
          expires_at?: string | null
          formatted_address?: string | null
          hit_count?: number | null
          id?: string
          latitude?: number
          longitude?: number
          original_address?: string
          place_id?: string | null
        }
        Relationships: []
      }
      geocoded_addresses: {
        Row: {
          address_hash: string
          formatted_address: string | null
          geocoded_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          original_address: string
        }
        Insert: {
          address_hash: string
          formatted_address?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          original_address: string
        }
        Update: {
          address_hash?: string
          formatted_address?: string | null
          geocoded_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          original_address?: string
        }
        Relationships: []
      }
      global_blackout_dates: {
        Row: {
          blackout_date: string
          created_at: string | null
          id: string
          name: string | null
          recurring_yearly: boolean | null
        }
        Insert: {
          blackout_date: string
          created_at?: string | null
          id?: string
          name?: string | null
          recurring_yearly?: boolean | null
        }
        Update: {
          blackout_date?: string
          created_at?: string | null
          id?: string
          name?: string | null
          recurring_yearly?: boolean | null
        }
        Relationships: []
      }
      inventory_categories: {
        Row: {
          business_id: string | null
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          parent_category_id: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          parent_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          parent_category_id?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          business_id: string
          cost_per_unit: number | null
          created_at: string | null
          id: string
          inventory_id: string | null
          notes: string | null
          quantity_change: number
          reference_id: string | null
          running_balance: number | null
          type: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          quantity_change: number
          reference_id?: string | null
          running_balance?: number | null
          type: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          cost_per_unit?: number | null
          created_at?: string | null
          id?: string
          inventory_id?: string | null
          notes?: string | null
          quantity_change?: number
          reference_id?: string | null
          running_balance?: number | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "business_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          description: string
          id: string
          invoice_id: string | null
          is_taxable: boolean | null
          quantity: number
          saved_service_id: string | null
          sort_order: number | null
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          invoice_id?: string | null
          is_taxable?: boolean | null
          quantity?: number
          saved_service_id?: string | null
          sort_order?: number | null
          total: number
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          invoice_id?: string | null
          is_taxable?: boolean | null
          quantity?: number
          saved_service_id?: string | null
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_saved_service_id_fkey"
            columns: ["saved_service_id"]
            isOneToOne: false
            referencedRelation: "saved_services"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminders: {
        Row: {
          id: string
          invoice_id: string
          method: string
          sent_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          method: string
          sent_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          method?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          access_token: string | null
          amount_due: number | null
          amount_paid: number | null
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          discount_amount: number | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string
          is_recurring: boolean | null
          job_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          quote_id: string | null
          service_agreement_id: string | null
          status: string
          stripe_payment_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_link: string | null
          stripe_payment_link_url: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total: number
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          access_token?: string | null
          amount_due?: number | null
          amount_paid?: number | null
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number: string
          is_recurring?: boolean | null
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          quote_id?: string | null
          service_agreement_id?: string | null
          status?: string
          stripe_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          stripe_payment_link_url?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          access_token?: string | null
          amount_due?: number | null
          amount_paid?: number | null
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string
          is_recurring?: boolean | null
          job_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          quote_id?: string | null
          service_agreement_id?: string | null
          status?: string
          stripe_payment_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_link?: string | null
          stripe_payment_link_url?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_invoices_service_agreement"
            columns: ["service_agreement_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_checklists: {
        Row: {
          checklist_type: string | null
          completed_at: string | null
          completed_items: number | null
          created_at: string | null
          id: string
          items: Json
          job_id: string
          name: string
          started_at: string | null
          template_id: string | null
          total_items: number | null
          updated_at: string | null
        }
        Insert: {
          checklist_type?: string | null
          completed_at?: string | null
          completed_items?: number | null
          created_at?: string | null
          id?: string
          items?: Json
          job_id: string
          name: string
          started_at?: string | null
          template_id?: string | null
          total_items?: number | null
          updated_at?: string | null
        }
        Update: {
          checklist_type?: string | null
          completed_at?: string | null
          completed_items?: number | null
          created_at?: string | null
          id?: string
          items?: Json
          job_id?: string
          name?: string
          started_at?: string | null
          template_id?: string | null
          total_items?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_checklists_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      job_cost_summary: {
        Row: {
          actual_hours: number | null
          collected_amount: number | null
          estimated_hours: number | null
          gross_profit: number | null
          id: string
          invoiced_amount: number | null
          job_id: string
          labor_cost: number | null
          material_cost: number | null
          other_cost: number | null
          profit_margin: number | null
          quoted_amount: number | null
          subcontractor_cost: number | null
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          collected_amount?: number | null
          estimated_hours?: number | null
          gross_profit?: number | null
          id?: string
          invoiced_amount?: number | null
          job_id: string
          labor_cost?: number | null
          material_cost?: number | null
          other_cost?: number | null
          profit_margin?: number | null
          quoted_amount?: number | null
          subcontractor_cost?: number | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          collected_amount?: number | null
          estimated_hours?: number | null
          gross_profit?: number | null
          id?: string
          invoiced_amount?: number | null
          job_id?: string
          labor_cost?: number | null
          material_cost?: number | null
          other_cost?: number | null
          profit_margin?: number | null
          quoted_amount?: number | null
          subcontractor_cost?: number | null
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_cost_summary_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_equipment: {
        Row: {
          created_at: string | null
          equipment_id: string
          id: string
          job_id: string
          notes: string | null
          service_performed: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          id?: string
          job_id: string
          notes?: string | null
          service_performed?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          id?: string
          job_id?: string
          notes?: string | null
          service_performed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_equipment_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "customer_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_inventory_usage: {
        Row: {
          created_at: string | null
          id: string
          inventory_id: string
          job_id: string
          notes: string | null
          quantity_used: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          inventory_id: string
          job_id: string
          notes?: string | null
          quantity_used?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          inventory_id?: string
          job_id?: string
          notes?: string | null
          quantity_used?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_inventory_usage_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "business_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_inventory_usage_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_labor: {
        Row: {
          break_minutes: number | null
          clock_in: string
          clock_out: string | null
          created_at: string | null
          hourly_rate: number | null
          id: string
          is_overtime: boolean | null
          job_id: string
          labor_cost: number | null
          notes: string | null
          overtime_rate: number | null
          total_minutes: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          break_minutes?: number | null
          clock_in: string
          clock_out?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_overtime?: boolean | null
          job_id: string
          labor_cost?: number | null
          notes?: string | null
          overtime_rate?: number | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string | null
          hourly_rate?: number | null
          id?: string
          is_overtime?: boolean | null
          job_id?: string
          labor_cost?: number | null
          notes?: string | null
          overtime_rate?: number | null
          total_minutes?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_labor_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_labor_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_materials: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          inventory_item_id: string | null
          job_id: string
          name: string
          part_number: string | null
          quantity: number
          source: string | null
          supplier: string | null
          total_cost: number | null
          total_price: number | null
          unit_cost: number
          unit_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          job_id: string
          name: string
          part_number?: string | null
          quantity?: number
          source?: string | null
          supplier?: string | null
          total_cost?: number | null
          total_price?: number | null
          unit_cost: number
          unit_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          inventory_item_id?: string | null
          job_id?: string
          name?: string
          part_number?: string | null
          quantity?: number
          source?: string | null
          supplier?: string | null
          total_cost?: number | null
          total_price?: number | null
          unit_cost?: number
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notes: {
        Row: {
          content: string
          created_at: string | null
          id: string
          job_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          job_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_photos: {
        Row: {
          business_id: string | null
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          job_id: string | null
          latitude: number | null
          longitude: number | null
          notes: string | null
          photo_type: string | null
          photo_type_legacy: string | null
          photo_url: string
          sort_order: number | null
          storage_path: string | null
          taken_at: string | null
          thumbnail_url: string | null
          uploaded_by: string | null
        }
        Insert: {
          business_id?: string | null
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          job_id?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_type?: string | null
          photo_type_legacy?: string | null
          photo_url: string
          sort_order?: number | null
          storage_path?: string | null
          taken_at?: string | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Update: {
          business_id?: string | null
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          job_id?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_type?: string | null
          photo_type_legacy?: string | null
          photo_url?: string
          sort_order?: number | null
          storage_path?: string | null
          taken_at?: string | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_photos_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_pre_checklist_items: {
        Row: {
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          description: string | null
          id: string
          is_checked: boolean | null
          item_type: string
          job_id: string
          label: string
          quantity: number | null
        }
        Insert: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_checked?: boolean | null
          item_type: string
          job_id: string
          label: string
          quantity?: number | null
        }
        Update: {
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_checked?: boolean | null
          item_type?: string
          job_id?: string
          label?: string
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_pre_checklist_items_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_pre_checklist_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_ratings: {
        Row: {
          created_at: string | null
          customer_comment: string | null
          id: string
          job_id: string
          overall_rating: number | null
          professionalism: number | null
          punctuality: number | null
          service_quality: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          customer_comment?: string | null
          id?: string
          job_id: string
          overall_rating?: number | null
          professionalism?: number | null
          punctuality?: number | null
          service_quality?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          customer_comment?: string | null
          id?: string
          job_id?: string
          overall_rating?: number | null
          professionalism?: number | null
          punctuality?: number | null
          service_quality?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_ratings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      job_type_skills: {
        Row: {
          business_id: string
          id: string
          is_required: boolean | null
          job_type: string
          minimum_proficiency: number | null
          skill_id: string
        }
        Insert: {
          business_id: string
          id?: string
          is_required?: boolean | null
          job_type: string
          minimum_proficiency?: number | null
          skill_id: string
        }
        Update: {
          business_id?: string
          id?: string
          is_required?: boolean | null
          job_type?: string
          minimum_proficiency?: number | null
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_type_skills_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_type_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      job_voice_notes: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          id: string
          job_id: string
          storage_path: string
          transcript: string | null
          transcription_completed_at: string | null
          transcription_provider: string | null
          transcription_started_at: string | null
          transcription_status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          job_id: string
          storage_path: string
          transcript?: string | null
          transcription_completed_at?: string | null
          transcription_provider?: string | null
          transcription_started_at?: string | null
          transcription_status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          job_id?: string
          storage_path?: string
          transcript?: string | null
          transcription_completed_at?: string | null
          transcription_provider?: string | null
          transcription_started_at?: string | null
          transcription_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_voice_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_voice_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          arrived_at: string | null
          assigned_user_id: string | null
          business_id: string | null
          completed_at: string | null
          completion_notes: string | null
          created_at: string | null
          customer_confirmed: boolean | null
          customer_confirmed_at: string | null
          customer_feedback: string | null
          customer_id: string | null
          customer_rating: number | null
          customer_reminders_enabled: boolean | null
          departed_at: string | null
          description: string | null
          external_calendar_event_id: string | null
          feedback_submitted_at: string | null
          google_calendar_event_id: string | null
          id: string
          invoiced_at: string | null
          is_recurring: boolean | null
          job_address_city: string | null
          job_address_line1: string | null
          job_address_state: string | null
          job_address_zip: string | null
          job_type: string | null
          lead_id: string | null
          location_id: string | null
          metadata: Json | null
          on_the_way_at: string | null
          paid_at: string | null
          portal_visible: boolean | null
          requires_signature: boolean | null
          scheduled_date: string
          scheduled_time: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          service_agreement_id: string | null
          service_type: string
          signature_id: string | null
          started_at: string | null
          status: string
          tech_notes: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          arrived_at?: string | null
          assigned_user_id?: string | null
          business_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          customer_confirmed?: boolean | null
          customer_confirmed_at?: string | null
          customer_feedback?: string | null
          customer_id?: string | null
          customer_rating?: number | null
          customer_reminders_enabled?: boolean | null
          departed_at?: string | null
          description?: string | null
          external_calendar_event_id?: string | null
          feedback_submitted_at?: string | null
          google_calendar_event_id?: string | null
          id?: string
          invoiced_at?: string | null
          is_recurring?: boolean | null
          job_address_city?: string | null
          job_address_line1?: string | null
          job_address_state?: string | null
          job_address_zip?: string | null
          job_type?: string | null
          lead_id?: string | null
          location_id?: string | null
          metadata?: Json | null
          on_the_way_at?: string | null
          paid_at?: string | null
          portal_visible?: boolean | null
          requires_signature?: boolean | null
          scheduled_date: string
          scheduled_time?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          service_agreement_id?: string | null
          service_type: string
          signature_id?: string | null
          started_at?: string | null
          status?: string
          tech_notes?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          arrived_at?: string | null
          assigned_user_id?: string | null
          business_id?: string | null
          completed_at?: string | null
          completion_notes?: string | null
          created_at?: string | null
          customer_confirmed?: boolean | null
          customer_confirmed_at?: string | null
          customer_feedback?: string | null
          customer_id?: string | null
          customer_rating?: number | null
          customer_reminders_enabled?: boolean | null
          departed_at?: string | null
          description?: string | null
          external_calendar_event_id?: string | null
          feedback_submitted_at?: string | null
          google_calendar_event_id?: string | null
          id?: string
          invoiced_at?: string | null
          is_recurring?: boolean | null
          job_address_city?: string | null
          job_address_line1?: string | null
          job_address_state?: string | null
          job_address_zip?: string | null
          job_type?: string | null
          lead_id?: string | null
          location_id?: string | null
          metadata?: Json | null
          on_the_way_at?: string | null
          paid_at?: string | null
          portal_visible?: boolean | null
          requires_signature?: boolean | null
          scheduled_date?: string
          scheduled_time?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          service_agreement_id?: string | null
          service_type?: string
          signature_id?: string | null
          started_at?: string | null
          status?: string
          tech_notes?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_jobs_service_agreement"
            columns: ["service_agreement_id"]
            isOneToOne: false
            referencedRelation: "service_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_jobs_signature"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_assigned_user_id_fkey"
            columns: ["assigned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "business_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article_feedback: {
        Row: {
          article_id: string | null
          comment: string | null
          created_at: string | null
          helpful: boolean
          id: string
          user_id: string | null
        }
        Insert: {
          article_id?: string | null
          comment?: string | null
          created_at?: string | null
          helpful: boolean
          id?: string
          user_id?: string | null
        }
        Update: {
          article_id?: string | null
          comment?: string | null
          created_at?: string | null
          helpful?: boolean
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_article_views: {
        Row: {
          article_id: string | null
          id: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          article_id?: string | null
          id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          article_id?: string | null
          id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_article_views_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "kb_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_article_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          body: string
          category: string
          created_at: string | null
          excerpt: string | null
          id: string
          is_featured: boolean | null
          is_published: boolean | null
          read_time_minutes: number | null
          related_articles: string[] | null
          search_keywords: string[] | null
          search_vector: unknown
          show_on_screens: string[] | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body: string
          category: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          read_time_minutes?: number | null
          related_articles?: string[] | null
          search_keywords?: string[] | null
          search_vector?: unknown
          show_on_screens?: string[] | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body?: string
          category?: string
          created_at?: string | null
          excerpt?: string | null
          id?: string
          is_featured?: boolean | null
          is_published?: boolean | null
          read_time_minutes?: number | null
          related_articles?: string[] | null
          search_keywords?: string[] | null
          search_vector?: unknown
          show_on_screens?: string[] | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kb_search_logs: {
        Row: {
          id: string
          query: string
          results_count: number | null
          searched_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          query: string
          results_count?: number | null
          searched_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          query?: string
          results_count?: number | null
          searched_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_search_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          agent_id: string
          created_at: string | null
          description: string | null
          id: string
          lead_id: string
          new_agent_id: string | null
          new_status: string | null
          old_agent_id: string | null
          old_status: string | null
          reassigned_by: string | null
          reassignment_reason: string | null
        }
        Insert: {
          activity_type: string
          agent_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id: string
          new_agent_id?: string | null
          new_status?: string | null
          old_agent_id?: string | null
          old_status?: string | null
          reassigned_by?: string | null
          reassignment_reason?: string | null
        }
        Update: {
          activity_type?: string
          agent_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          lead_id?: string
          new_agent_id?: string | null
          new_status?: string | null
          old_agent_id?: string | null
          old_status?: string | null
          reassigned_by?: string | null
          reassignment_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tc_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_new_agent_id_fkey"
            columns: ["new_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_old_agent_id_fkey"
            columns: ["old_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_reassigned_by_fkey"
            columns: ["reassigned_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_batch_uploads: {
        Row: {
          assigned_to_agent_id: string
          completed_at: string | null
          created_at: string | null
          duplicate_skipped: number | null
          errors: Json | null
          failed_imports: number | null
          file_size: number | null
          id: string
          original_filename: string
          status: string | null
          successful_imports: number | null
          total_rows: number | null
          uploaded_by: string
        }
        Insert: {
          assigned_to_agent_id: string
          completed_at?: string | null
          created_at?: string | null
          duplicate_skipped?: number | null
          errors?: Json | null
          failed_imports?: number | null
          file_size?: number | null
          id?: string
          original_filename: string
          status?: string | null
          successful_imports?: number | null
          total_rows?: number | null
          uploaded_by: string
        }
        Update: {
          assigned_to_agent_id?: string
          completed_at?: string | null
          created_at?: string | null
          duplicate_skipped?: number | null
          errors?: Json | null
          failed_imports?: number | null
          file_size?: number | null
          id?: string
          original_filename?: string
          status?: string | null
          successful_imports?: number | null
          total_rows?: number | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_batch_uploads_assigned_to_agent_id_fkey"
            columns: ["assigned_to_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_batch_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_engagement: {
        Row: {
          created_at: string | null
          engagement_type: string
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          engagement_type: string
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          engagement_type?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_engagement_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_enrichment: {
        Row: {
          ai_insights: Json | null
          company_size: string | null
          contact_id: string
          enriched_at: string | null
          enrichment_provider: string | null
          estimated_revenue: string | null
          facebook_url: string | null
          founded_year: number | null
          google_place_id: string | null
          google_review_avg: number | null
          google_review_count: number | null
          has_ssl: boolean | null
          id: string
          instagram_url: string | null
          linkedin_url: string | null
          mobile_friendly: boolean | null
          website_age_years: number | null
          website_platform: string | null
          website_url: string | null
          years_in_business: number | null
        }
        Insert: {
          ai_insights?: Json | null
          company_size?: string | null
          contact_id: string
          enriched_at?: string | null
          enrichment_provider?: string | null
          estimated_revenue?: string | null
          facebook_url?: string | null
          founded_year?: number | null
          google_place_id?: string | null
          google_review_avg?: number | null
          google_review_count?: number | null
          has_ssl?: boolean | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          mobile_friendly?: boolean | null
          website_age_years?: number | null
          website_platform?: string | null
          website_url?: string | null
          years_in_business?: number | null
        }
        Update: {
          ai_insights?: Json | null
          company_size?: string | null
          contact_id?: string
          enriched_at?: string | null
          enrichment_provider?: string | null
          estimated_revenue?: string | null
          facebook_url?: string | null
          founded_year?: number | null
          google_place_id?: string | null
          google_review_avg?: number | null
          google_review_count?: number | null
          has_ssl?: boolean | null
          id?: string
          instagram_url?: string | null
          linkedin_url?: string | null
          mobile_friendly?: boolean | null
          website_age_years?: number | null
          website_platform?: string | null
          website_url?: string | null
          years_in_business?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_enrichment_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_imports: {
        Row: {
          assign_to_agent_id: string | null
          assign_to_campaign_id: string | null
          auto_start_campaign: boolean | null
          check_dnc: boolean | null
          check_opt_outs: boolean | null
          column_mapping: Json | null
          completed_at: string | null
          created_at: string | null
          error_details: Json | null
          filename: string
          id: string
          imported_by: string | null
          imported_count: number | null
          normalize_phones: boolean | null
          skip_duplicates: boolean | null
          skipped_dnc: number | null
          skipped_duplicates: number | null
          skipped_invalid: number | null
          skipped_opted_out: number | null
          source_campaign: string | null
          source_label: string | null
          started_at: string | null
          status: string | null
          total_rows: number | null
        }
        Insert: {
          assign_to_agent_id?: string | null
          assign_to_campaign_id?: string | null
          auto_start_campaign?: boolean | null
          check_dnc?: boolean | null
          check_opt_outs?: boolean | null
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          filename: string
          id?: string
          imported_by?: string | null
          imported_count?: number | null
          normalize_phones?: boolean | null
          skip_duplicates?: boolean | null
          skipped_dnc?: number | null
          skipped_duplicates?: number | null
          skipped_invalid?: number | null
          skipped_opted_out?: number | null
          source_campaign?: string | null
          source_label?: string | null
          started_at?: string | null
          status?: string | null
          total_rows?: number | null
        }
        Update: {
          assign_to_agent_id?: string | null
          assign_to_campaign_id?: string | null
          auto_start_campaign?: boolean | null
          check_dnc?: boolean | null
          check_opt_outs?: boolean | null
          column_mapping?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: Json | null
          filename?: string
          id?: string
          imported_by?: string | null
          imported_count?: number | null
          normalize_phones?: boolean | null
          skip_duplicates?: boolean | null
          skipped_dnc?: number | null
          skipped_duplicates?: number | null
          skipped_invalid?: number | null
          skipped_opted_out?: number | null
          source_campaign?: string | null
          source_label?: string | null
          started_at?: string | null
          status?: string | null
          total_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_imports_assign_to_agent_id_fkey"
            columns: ["assign_to_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_imports_assign_to_campaign_id_fkey"
            columns: ["assign_to_campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_imports_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reassignments: {
        Row: {
          created_at: string | null
          from_agent_id: string | null
          id: string
          lead_id: string
          notes: string | null
          reason: string | null
          reassigned_by: string
          to_agent_id: string
        }
        Insert: {
          created_at?: string | null
          from_agent_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          reason?: string | null
          reassigned_by: string
          to_agent_id: string
        }
        Update: {
          created_at?: string | null
          from_agent_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          reason?: string | null
          reassigned_by?: string
          to_agent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_reassignments_from_agent_id_fkey"
            columns: ["from_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reassignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tc_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reassignments_reassigned_by_fkey"
            columns: ["reassigned_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_reassignments_to_agent_id_fkey"
            columns: ["to_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_scoring_rules: {
        Row: {
          business_id: string
          condition_operator: string
          condition_type: string
          condition_value: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          score_adjustment: number
        }
        Insert: {
          business_id: string
          condition_operator: string
          condition_type: string
          condition_value: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          score_adjustment: number
        }
        Update: {
          business_id?: string
          condition_operator?: string
          condition_type?: string
          condition_value?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          score_adjustment?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_scoring_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          description: string | null
          email: string | null
          estimated_value: number | null
          follow_up_date: string | null
          id: string
          last_scored_at: string | null
          lost_reason: string | null
          name: string
          phone: string
          score: number | null
          score_breakdown: Json | null
          service_needed: string | null
          source: string
          status: string
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          last_scored_at?: string | null
          lost_reason?: string | null
          name: string
          phone: string
          score?: number | null
          score_breakdown?: Json | null
          service_needed?: string | null
          source: string
          status?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          description?: string | null
          email?: string | null
          estimated_value?: number | null
          follow_up_date?: string | null
          id?: string
          last_scored_at?: string | null
          lost_reason?: string | null
          name?: string
          phone?: string
          score?: number | null
          score_breakdown?: Json | null
          service_needed?: string | null
          source?: string
          status?: string
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_config: {
        Row: {
          ai_confidence_threshold: number | null
          ai_creativity_level: string | null
          ai_enabled: boolean | null
          ai_max_messages: number | null
          ai_pricing_mode: string | null
          approval_timeout_minutes: number | null
          booking_link: string | null
          business_hours: Json | null
          business_id: string
          business_name: string
          business_type: string | null
          created_at: string | null
          emergency_phone: string | null
          emergency_service: boolean | null
          global_mode: string | null
          id: string
          languages: string[] | null
          main_phone: string | null
          memory_expiration_days: number | null
          memory_scope: string | null
          owner_name: string | null
          require_approval: string | null
          service_area: string | null
          timezone: string | null
          tone: string | null
          updated_at: string | null
          use_emojis: boolean | null
          use_new_orchestrator: boolean | null
        }
        Insert: {
          ai_confidence_threshold?: number | null
          ai_creativity_level?: string | null
          ai_enabled?: boolean | null
          ai_max_messages?: number | null
          ai_pricing_mode?: string | null
          approval_timeout_minutes?: number | null
          booking_link?: string | null
          business_hours?: Json | null
          business_id: string
          business_name: string
          business_type?: string | null
          created_at?: string | null
          emergency_phone?: string | null
          emergency_service?: boolean | null
          global_mode?: string | null
          id?: string
          languages?: string[] | null
          main_phone?: string | null
          memory_expiration_days?: number | null
          memory_scope?: string | null
          owner_name?: string | null
          require_approval?: string | null
          service_area?: string | null
          timezone?: string | null
          tone?: string | null
          updated_at?: string | null
          use_emojis?: boolean | null
          use_new_orchestrator?: boolean | null
        }
        Update: {
          ai_confidence_threshold?: number | null
          ai_creativity_level?: string | null
          ai_enabled?: boolean | null
          ai_max_messages?: number | null
          ai_pricing_mode?: string | null
          approval_timeout_minutes?: number | null
          booking_link?: string | null
          business_hours?: Json | null
          business_id?: string
          business_name?: string
          business_type?: string | null
          created_at?: string | null
          emergency_phone?: string | null
          emergency_service?: boolean | null
          global_mode?: string | null
          id?: string
          languages?: string[] | null
          main_phone?: string | null
          memory_expiration_days?: number | null
          memory_scope?: string | null
          owner_name?: string | null
          require_approval?: string | null
          service_area?: string | null
          timezone?: string | null
          tone?: string | null
          updated_at?: string | null
          use_emojis?: boolean | null
          use_new_orchestrator?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_config_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_conversation_analysis: {
        Row: {
          ai_performance_notes: Json | null
          analyzed_at: string | null
          config_id: string
          conversation_id: string
          customer_sentiment: string | null
          estimated_job_value: string | null
          follow_up_recommendation: string | null
          id: string
          lead_quality: string | null
          model_used: string | null
          service_category: string | null
          summary: string
          tokens_used: number | null
        }
        Insert: {
          ai_performance_notes?: Json | null
          analyzed_at?: string | null
          config_id: string
          conversation_id: string
          customer_sentiment?: string | null
          estimated_job_value?: string | null
          follow_up_recommendation?: string | null
          id?: string
          lead_quality?: string | null
          model_used?: string | null
          service_category?: string | null
          summary: string
          tokens_used?: number | null
        }
        Update: {
          ai_performance_notes?: Json | null
          analyzed_at?: string | null
          config_id?: string
          conversation_id?: string
          customer_sentiment?: string | null
          estimated_job_value?: string | null
          follow_up_recommendation?: string | null
          id?: string
          lead_quality?: string | null
          model_used?: string | null
          service_category?: string | null
          summary?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_conversation_analysis_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_captain_conversation_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "leads_captain_conversations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_conversations_v2: {
        Row: {
          ai_message_count: number | null
          closed_at: string | null
          config_id: string
          created_at: string | null
          crm_customer_id: string | null
          crm_lead_id: string | null
          current_intent: string | null
          customer_email: string | null
          customer_memory: Json | null
          customer_name: string | null
          customer_phone: string
          id: string
          initial_intent: string | null
          is_emergency: boolean | null
          is_hot_lead: boolean | null
          last_customer_message_at: string | null
          last_message_at: string | null
          message_count: number | null
          opted_out: boolean | null
          requires_human: boolean | null
          sentiment: string | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          ai_message_count?: number | null
          closed_at?: string | null
          config_id: string
          created_at?: string | null
          crm_customer_id?: string | null
          crm_lead_id?: string | null
          current_intent?: string | null
          customer_email?: string | null
          customer_memory?: Json | null
          customer_name?: string | null
          customer_phone: string
          id?: string
          initial_intent?: string | null
          is_emergency?: boolean | null
          is_hot_lead?: boolean | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          message_count?: number | null
          opted_out?: boolean | null
          requires_human?: boolean | null
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          ai_message_count?: number | null
          closed_at?: string | null
          config_id?: string
          created_at?: string | null
          crm_customer_id?: string | null
          crm_lead_id?: string | null
          current_intent?: string | null
          customer_email?: string | null
          customer_memory?: Json | null
          customer_name?: string | null
          customer_phone?: string
          id?: string
          initial_intent?: string | null
          is_emergency?: boolean | null
          is_hot_lead?: boolean | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          message_count?: number | null
          opted_out?: boolean | null
          requires_human?: boolean | null
          sentiment?: string | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_conversations_v2_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_conversations_v2_crm_customer_id_fkey"
            columns: ["crm_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_extracted_notes: {
        Row: {
          confidence: number | null
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          note_type: string
        }
        Insert: {
          confidence?: number | null
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          note_type: string
        }
        Update: {
          confidence?: number | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_extracted_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_conversations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_handoff_summaries: {
        Row: {
          already_discussed: Json | null
          conversation_id: string
          created_at: string | null
          customer_mood: string | null
          customer_wants: Json | null
          handoff_reason: string | null
          id: string
          model_used: string | null
          not_yet_discussed: Json | null
          quick_summary: string
          suggested_opening: string | null
          tokens_used: number | null
          urgency_level: string | null
          warning_flags: Json | null
        }
        Insert: {
          already_discussed?: Json | null
          conversation_id: string
          created_at?: string | null
          customer_mood?: string | null
          customer_wants?: Json | null
          handoff_reason?: string | null
          id?: string
          model_used?: string | null
          not_yet_discussed?: Json | null
          quick_summary: string
          suggested_opening?: string | null
          tokens_used?: number | null
          urgency_level?: string | null
          warning_flags?: Json | null
        }
        Update: {
          already_discussed?: Json | null
          conversation_id?: string
          created_at?: string | null
          customer_mood?: string | null
          customer_wants?: Json | null
          handoff_reason?: string | null
          id?: string
          model_used?: string | null
          not_yet_discussed?: Json | null
          quick_summary?: string
          suggested_opening?: string | null
          tokens_used?: number | null
          urgency_level?: string | null
          warning_flags?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_handoff_summaries_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "leads_captain_conversations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_insights: {
        Row: {
          config_id: string
          conversations_analyzed: number | null
          created_at: string | null
          executive_summary: string | null
          generated_at: string | null
          id: string
          insights: Json
          key_metrics: Json
          model_used: string | null
          period_end: string
          period_start: string
          tokens_used: number | null
        }
        Insert: {
          config_id: string
          conversations_analyzed?: number | null
          created_at?: string | null
          executive_summary?: string | null
          generated_at?: string | null
          id?: string
          insights?: Json
          key_metrics?: Json
          model_used?: string | null
          period_end: string
          period_start: string
          tokens_used?: number | null
        }
        Update: {
          config_id?: string
          conversations_analyzed?: number | null
          created_at?: string | null
          executive_summary?: string | null
          generated_at?: string | null
          id?: string
          insights?: Json
          key_metrics?: Json
          model_used?: string | null
          period_end?: string
          period_start?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_insights_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_messages_v2: {
        Row: {
          ai_confidence: number | null
          ai_model: string | null
          ai_used: boolean | null
          approval_required: boolean | null
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          content: string
          conversation_id: string
          created_at: string | null
          decision_details: Json | null
          decision_explanation: string | null
          delivery_error: string | null
          delivery_status: string | null
          detected_intent: string | null
          detected_language: string | null
          detected_sentiment: string | null
          direction: string
          extracted_entities: Json | null
          id: string
          intent_confidence: number | null
          original_content: string | null
          rule_matched: string | null
          sent_at: string | null
          template_used: string | null
          twilio_sid: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_used?: boolean | null
          approval_required?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content: string
          conversation_id: string
          created_at?: string | null
          decision_details?: Json | null
          decision_explanation?: string | null
          delivery_error?: string | null
          delivery_status?: string | null
          detected_intent?: string | null
          detected_language?: string | null
          detected_sentiment?: string | null
          direction: string
          extracted_entities?: Json | null
          id?: string
          intent_confidence?: number | null
          original_content?: string | null
          rule_matched?: string | null
          sent_at?: string | null
          template_used?: string | null
          twilio_sid?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_model?: string | null
          ai_used?: boolean | null
          approval_required?: boolean | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          decision_details?: Json | null
          decision_explanation?: string | null
          delivery_error?: string | null
          delivery_status?: string | null
          detected_intent?: string | null
          detected_language?: string | null
          detected_sentiment?: string | null
          direction?: string
          extracted_entities?: Json | null
          id?: string
          intent_confidence?: number | null
          original_content?: string | null
          rule_matched?: string | null
          sent_at?: string | null
          template_used?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_messages_v2_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_conversations_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_messages_v2_rule_matched_fkey"
            columns: ["rule_matched"]
            isOneToOne: false
            referencedRelation: "nevermiss_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_messages_v2_template_used_fkey"
            columns: ["template_used"]
            isOneToOne: false
            referencedRelation: "nevermiss_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_photo_analysis: {
        Row: {
          analyzed_at: string | null
          category: string
          confidence: number | null
          config_id: string
          conversation_id: string | null
          created_at: string | null
          detected_issues: Json
          equipment: Json | null
          estimated_service_type: string | null
          id: string
          image_url: string
          model_used: string | null
          recommended_actions: Json
          safety_warnings: Json
          summary: string
          tokens_used: number | null
          urgency: string
        }
        Insert: {
          analyzed_at?: string | null
          category: string
          confidence?: number | null
          config_id: string
          conversation_id?: string | null
          created_at?: string | null
          detected_issues?: Json
          equipment?: Json | null
          estimated_service_type?: string | null
          id?: string
          image_url: string
          model_used?: string | null
          recommended_actions?: Json
          safety_warnings?: Json
          summary: string
          tokens_used?: number | null
          urgency?: string
        }
        Update: {
          analyzed_at?: string | null
          category?: string
          confidence?: number | null
          config_id?: string
          conversation_id?: string | null
          created_at?: string | null
          detected_issues?: Json
          equipment?: Json | null
          estimated_service_type?: string | null
          id?: string
          image_url?: string
          model_used?: string | null
          recommended_actions?: Json
          safety_warnings?: Json
          summary?: string
          tokens_used?: number | null
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_photo_analysis_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_captain_photo_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_conversations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_sandbox_tests: {
        Row: {
          analysis: Json
          config_id: string
          conversation: Json
          created_at: string | null
          id: string
          scenario: Json
          scenario_completed: boolean | null
          tokens_used: number | null
          turns_used: number | null
        }
        Insert: {
          analysis?: Json
          config_id: string
          conversation?: Json
          created_at?: string | null
          id?: string
          scenario: Json
          scenario_completed?: boolean | null
          tokens_used?: number | null
          turns_used?: number | null
        }
        Update: {
          analysis?: Json
          config_id?: string
          conversation?: Json
          created_at?: string | null
          id?: string
          scenario?: Json
          scenario_completed?: boolean | null
          tokens_used?: number | null
          turns_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_sandbox_tests_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      location_distances: {
        Row: {
          calculated_at: string | null
          distance_meters: number | null
          duration_seconds: number | null
          expires_at: string | null
          from_lat: number
          from_lng: number
          id: string
          to_lat: number
          to_lng: number
        }
        Insert: {
          calculated_at?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          expires_at?: string | null
          from_lat: number
          from_lng: number
          id?: string
          to_lat: number
          to_lng: number
        }
        Update: {
          calculated_at?: string | null
          distance_meters?: number | null
          duration_seconds?: number | null
          expires_at?: string | null
          from_lat?: number
          from_lng?: number
          id?: string
          to_lat?: number
          to_lng?: number
        }
        Relationships: []
      }
      membership_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          membership_id: string
          paid_at: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          membership_id: string
          paid_at?: string | null
          status: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          membership_id?: string
          paid_at?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          benefits: Json | null
          billing_interval: string
          business_id: string
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          display_order: number | null
          free_emergency_calls: number | null
          free_inspections: number | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          priority_scheduling: boolean | null
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          benefits?: Json | null
          billing_interval: string
          business_id: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          display_order?: number | null
          free_emergency_calls?: number | null
          free_inspections?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          priority_scheduling?: boolean | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          benefits?: Json | null
          billing_interval?: string
          business_id?: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          display_order?: number | null
          free_emergency_calls?: number | null
          free_inspections?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          priority_scheduling?: boolean | null
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      mileage_logs: {
        Row: {
          business_id: string
          calculation_source: string | null
          created_at: string | null
          distance_miles: number
          duration_minutes: number | null
          from_address: string | null
          from_job_id: string | null
          from_latitude: number | null
          from_longitude: number | null
          id: string
          log_date: string
          notes: string | null
          purpose: string | null
          to_address: string | null
          to_job_id: string | null
          to_latitude: number | null
          to_longitude: number | null
          user_id: string
        }
        Insert: {
          business_id: string
          calculation_source?: string | null
          created_at?: string | null
          distance_miles: number
          duration_minutes?: number | null
          from_address?: string | null
          from_job_id?: string | null
          from_latitude?: number | null
          from_longitude?: number | null
          id?: string
          log_date: string
          notes?: string | null
          purpose?: string | null
          to_address?: string | null
          to_job_id?: string | null
          to_latitude?: number | null
          to_longitude?: number | null
          user_id: string
        }
        Update: {
          business_id?: string
          calculation_source?: string | null
          created_at?: string | null
          distance_miles?: number
          duration_minutes?: number | null
          from_address?: string | null
          from_job_id?: string | null
          from_latitude?: number | null
          from_longitude?: number | null
          id?: string
          log_date?: string
          notes?: string | null
          purpose?: string | null
          to_address?: string | null
          to_job_id?: string | null
          to_latitude?: number | null
          to_longitude?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_from_job_id_fkey"
            columns: ["from_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_to_job_id_fkey"
            columns: ["to_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mileage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_audit_log: {
        Row: {
          action: string
          actor: string | null
          config_id: string
          conversation_id: string | null
          created_at: string | null
          details: Json | null
          id: string
          message_id: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          config_id: string
          conversation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          message_id?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          config_id?: string
          conversation_id?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_audit_log_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_audit_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_conversations_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_audit_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_messages_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_conversations: {
        Row: {
          abandoned_at: string | null
          abuse_score: number | null
          ai_enabled: boolean | null
          ai_handoff_reason: string | null
          blocked_at: string | null
          booking_hold_id: string | null
          booking_job_id: string | null
          business_id: string | null
          business_phone: string
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          customer_phone: string
          handed_off_at: string | null
          handed_off_to: string | null
          id: string
          last_customer_message_at: string | null
          message_count: number | null
          metadata: Json | null
          state: string | null
        }
        Insert: {
          abandoned_at?: string | null
          abuse_score?: number | null
          ai_enabled?: boolean | null
          ai_handoff_reason?: string | null
          blocked_at?: string | null
          booking_hold_id?: string | null
          booking_job_id?: string | null
          business_id?: string | null
          business_phone: string
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_phone: string
          handed_off_at?: string | null
          handed_off_to?: string | null
          id?: string
          last_customer_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          state?: string | null
        }
        Update: {
          abandoned_at?: string | null
          abuse_score?: number | null
          ai_enabled?: boolean | null
          ai_handoff_reason?: string | null
          blocked_at?: string | null
          booking_hold_id?: string | null
          booking_job_id?: string | null
          business_id?: string | null
          business_phone?: string
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          customer_phone?: string
          handed_off_at?: string | null
          handed_off_to?: string | null
          id?: string
          last_customer_message_at?: string | null
          message_count?: number | null
          metadata?: Json | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_conversations_booking_job_id_fkey"
            columns: ["booking_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_events: {
        Row: {
          business_id: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          event_type: string
          id: string
          notes: string | null
          processed: boolean | null
          processed_at: string | null
          raw_payload: Json | null
          status: string | null
          twilio_sid: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          notes?: string | null
          processed?: boolean | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string | null
          twilio_sid?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          processed?: boolean | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_intents: {
        Row: {
          config_id: string
          created_at: string | null
          enabled: boolean | null
          example_phrases: string[] | null
          id: string
          intent_category: string | null
          intent_code: string
          intent_label: string
        }
        Insert: {
          config_id: string
          created_at?: string | null
          enabled?: boolean | null
          example_phrases?: string[] | null
          id?: string
          intent_category?: string | null
          intent_code: string
          intent_label: string
        }
        Update: {
          config_id?: string
          created_at?: string | null
          enabled?: boolean | null
          example_phrases?: string[] | null
          id?: string
          intent_category?: string | null
          intent_code?: string
          intent_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_intents_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_messages: {
        Row: {
          ai_model: string | null
          business_id: string | null
          content: string
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          direction: string
          error_code: string | null
          from_number: string | null
          id: string
          is_ai_response: boolean | null
          metadata: Json | null
          status: string | null
          status_updated_at: string | null
          to_number: string | null
          twilio_sid: string | null
        }
        Insert: {
          ai_model?: string | null
          business_id?: string | null
          content: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          error_code?: string | null
          from_number?: string | null
          id?: string
          is_ai_response?: boolean | null
          metadata?: Json | null
          status?: string | null
          status_updated_at?: string | null
          to_number?: string | null
          twilio_sid?: string | null
        }
        Update: {
          ai_model?: string | null
          business_id?: string | null
          content?: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          from_number?: string | null
          id?: string
          is_ai_response?: boolean | null
          metadata?: Json | null
          status?: string | null
          status_updated_at?: string | null
          to_number?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_notifications: {
        Row: {
          config_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          notify_email: boolean | null
          notify_push: boolean | null
          notify_sms: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_except_emergency: boolean | null
          quiet_hours_start: string | null
          recipient_email: string | null
          recipient_name: string
          recipient_phone: string | null
          recipient_role: string | null
          triggers: Json | null
        }
        Insert: {
          config_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notify_email?: boolean | null
          notify_push?: boolean | null
          notify_sms?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_except_emergency?: boolean | null
          quiet_hours_start?: string | null
          recipient_email?: string | null
          recipient_name: string
          recipient_phone?: string | null
          recipient_role?: string | null
          triggers?: Json | null
        }
        Update: {
          config_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notify_email?: boolean | null
          notify_push?: boolean | null
          notify_sms?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_except_emergency?: boolean | null
          quiet_hours_start?: string | null
          recipient_email?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          recipient_role?: string | null
          triggers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_notifications_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_price_list: {
        Row: {
          config_id: string
          created_at: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          price_max: number | null
          price_min: number | null
          price_note: string | null
          service_name: string
        }
        Insert: {
          config_id: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          price_max?: number | null
          price_min?: number | null
          price_note?: string | null
          service_name: string
        }
        Update: {
          config_id?: string
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          price_max?: number | null
          price_min?: number | null
          price_note?: string | null
          service_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_price_list_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_rules: {
        Row: {
          actions: Json
          conditions: Json
          config_id: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          name: string
          priority: number | null
          updated_at: string | null
        }
        Insert: {
          actions: Json
          conditions: Json
          config_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name: string
          priority?: number | null
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          conditions?: Json
          config_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          name?: string
          priority?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_rules_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_settings: {
        Row: {
          ai_tone: string | null
          business_days: number[] | null
          business_hours_end: string | null
          business_hours_start: string | null
          business_id: string | null
          business_name: string | null
          created_at: string | null
          custom_prompt: string | null
          emergency_always_notify: boolean | null
          forward_to: string | null
          greeting_message: string | null
          id: string
          is_active: boolean | null
          notify_email: boolean | null
          notify_push: boolean | null
          notify_sms: boolean | null
          phone_number: string | null
          phone_number_sid: string | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          service_area: string | null
          services_offered: string[] | null
          updated_at: string | null
        }
        Insert: {
          ai_tone?: string | null
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string | null
          custom_prompt?: string | null
          emergency_always_notify?: boolean | null
          forward_to?: string | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean | null
          notify_email?: boolean | null
          notify_push?: boolean | null
          notify_sms?: boolean | null
          phone_number?: string | null
          phone_number_sid?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          service_area?: string | null
          services_offered?: string[] | null
          updated_at?: string | null
        }
        Update: {
          ai_tone?: string | null
          business_days?: number[] | null
          business_hours_end?: string | null
          business_hours_start?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string | null
          custom_prompt?: string | null
          emergency_always_notify?: boolean | null
          forward_to?: string | null
          greeting_message?: string | null
          id?: string
          is_active?: boolean | null
          notify_email?: boolean | null
          notify_push?: boolean | null
          notify_sms?: boolean | null
          phone_number?: string | null
          phone_number_sid?: string | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          service_area?: string | null
          services_offered?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_templates: {
        Row: {
          ai_personalization: string | null
          config_id: string
          content: string
          created_at: string | null
          emoji_setting: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          max_length: number | null
          name: string
          template_key: string | null
          updated_at: string | null
        }
        Insert: {
          ai_personalization?: string | null
          config_id: string
          content: string
          created_at?: string | null
          emoji_setting?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          max_length?: number | null
          name: string
          template_key?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_personalization?: string | null
          config_id?: string
          content?: string
          created_at?: string | null
          emoji_setting?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          max_length?: number | null
          name?: string
          template_key?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_templates_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      nevermiss_training: {
        Row: {
          ai_response: string
          better_response: string | null
          config_id: string
          created_at: string | null
          feedback_reasons: string[] | null
          id: string
          incoming_message: string
          message_id: string | null
          processed: boolean | null
          rating: string | null
        }
        Insert: {
          ai_response: string
          better_response?: string | null
          config_id: string
          created_at?: string | null
          feedback_reasons?: string[] | null
          id?: string
          incoming_message: string
          message_id?: string | null
          processed?: boolean | null
          rating?: string | null
        }
        Update: {
          ai_response?: string
          better_response?: string | null
          config_id?: string
          created_at?: string | null
          feedback_reasons?: string[] | null
          id?: string
          incoming_message?: string
          message_id?: string | null
          processed?: boolean | null
          rating?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_training_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nevermiss_training_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_messages_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      no_show_escalations: {
        Row: {
          contact_id: string | null
          created_at: string | null
          escalation_action: string | null
          id: string
          no_show_number: number
          scheduled_call_id: string | null
          score_adjustment: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          escalation_action?: string | null
          id?: string
          no_show_number: number
          scheduled_call_id?: string | null
          score_adjustment?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          escalation_action?: string | null
          id?: string
          no_show_number?: number
          scheduled_call_id?: string | null
          score_adjustment?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "no_show_escalations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "no_show_escalations_scheduled_call_id_fkey"
            columns: ["scheduled_call_id"]
            isOneToOne: false
            referencedRelation: "scheduled_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          business_id: string
          channel: string | null
          customer_id: string | null
          delivered_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          reference_id: string | null
          sent_at: string | null
          type: string
        }
        Insert: {
          business_id: string
          channel?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          reference_id?: string | null
          sent_at?: string | null
          type: string
        }
        Update: {
          business_id?: string
          channel?: string | null
          customer_id?: string | null
          delivered_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          reference_id?: string | null
          sent_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          job_assignment_notifications: boolean | null
          message_notifications: boolean | null
          new_lead_notifications: boolean | null
          payment_notifications: boolean | null
          push_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          reminder_notifications: boolean | null
          schedule_change_notifications: boolean | null
          sms_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          job_assignment_notifications?: boolean | null
          message_notifications?: boolean | null
          new_lead_notifications?: boolean | null
          payment_notifications?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_notifications?: boolean | null
          schedule_change_notifications?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          job_assignment_notifications?: boolean | null
          message_notifications?: boolean | null
          new_lead_notifications?: boolean | null
          payment_notifications?: boolean | null
          push_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          reminder_notifications?: boolean | null
          schedule_change_notifications?: boolean | null
          sms_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          body: string
          business_id: string | null
          conversation_id: string | null
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          job_id: string | null
          metadata: Json | null
          notification_type: string
          recipient_email: string | null
          recipient_phone: string | null
          scheduled_for: string
          sent_at: string | null
          skip_reason: string | null
          status: string
          subject: string | null
          template_data: Json | null
          template_id: string | null
        }
        Insert: {
          body: string
          business_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          notification_type: string
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_for: string
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          subject?: string | null
          template_data?: Json | null
          template_id?: string | null
        }
        Update: {
          body?: string
          business_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          metadata?: Json | null
          notification_type?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          scheduled_for?: string
          sent_at?: string | null
          skip_reason?: string | null
          status?: string
          subject?: string | null
          template_data?: Json | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_data: Json | null
          action_type: string | null
          body: string
          business_id: string
          created_at: string | null
          icon: string | null
          id: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_type?: string | null
          body: string
          business_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_type?: string | null
          body?: string
          business_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_enrollments: {
        Row: {
          contact_id: string
          created_at: string | null
          current_step: number | null
          enrolled_at: string | null
          enrolled_by: string | null
          enrolled_reason: string | null
          exit_reason: string | null
          exited_at: string | null
          id: string
          next_message_at: string | null
          sequence_id: string
          status: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          current_step?: number | null
          enrolled_at?: string | null
          enrolled_by?: string | null
          enrolled_reason?: string | null
          exit_reason?: string | null
          exited_at?: string | null
          id?: string
          next_message_at?: string | null
          sequence_id: string
          status?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          current_step?: number | null
          enrolled_at?: string | null
          enrolled_by?: string | null
          enrolled_reason?: string | null
          exit_reason?: string | null
          exited_at?: string | null
          id?: string
          next_message_at?: string | null
          sequence_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nurture_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_enrollments_enrolled_by_fkey"
            columns: ["enrolled_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_sequence_steps: {
        Row: {
          created_at: string | null
          delay_days: number
          exit_on_reply: boolean | null
          id: string
          message_template: string
          require_business_hours: boolean | null
          send_time: string | null
          sequence_id: string
          step_number: number
        }
        Insert: {
          created_at?: string | null
          delay_days: number
          exit_on_reply?: boolean | null
          id?: string
          message_template: string
          require_business_hours?: boolean | null
          send_time?: string | null
          sequence_id: string
          step_number: number
        }
        Update: {
          created_at?: string | null
          delay_days?: number
          exit_on_reply?: boolean | null
          id?: string
          message_template?: string
          require_business_hours?: boolean | null
          send_time?: string | null
          sequence_id?: string
          step_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "nurture_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_sequences: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          trigger_conditions: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          trigger_conditions?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nurture_sequences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_approval_requests: {
        Row: {
          agent_id: string
          client_id: string
          created_at: string | null
          id: string
          justification: string
          offer_code_id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          agent_id: string
          client_id: string
          created_at?: string | null
          id?: string
          justification: string
          offer_code_id: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          agent_id?: string
          client_id?: string
          created_at?: string | null
          id?: string
          justification?: string
          offer_code_id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_approval_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_approval_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_approval_requests_offer_code_id_fkey"
            columns: ["offer_code_id"]
            isOneToOne: false
            referencedRelation: "offer_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_approval_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_codes: {
        Row: {
          applicable_plans: string[] | null
          code: string
          commission_impact_type: string | null
          commission_impact_value: number | null
          created_at: string | null
          description: string | null
          discount_duration_months: number | null
          discount_type: string
          discount_value: number | null
          eligible_plan_types: string[] | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          name: string
          requires_approval: boolean | null
          trial_days: number | null
          uses_count: number | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applicable_plans?: string[] | null
          code: string
          commission_impact_type?: string | null
          commission_impact_value?: number | null
          created_at?: string | null
          description?: string | null
          discount_duration_months?: number | null
          discount_type: string
          discount_value?: number | null
          eligible_plan_types?: string[] | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name: string
          requires_approval?: boolean | null
          trial_days?: number | null
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applicable_plans?: string[] | null
          code?: string
          commission_impact_type?: string | null
          commission_impact_value?: number | null
          created_at?: string | null
          description?: string | null
          discount_duration_months?: number | null
          discount_type?: string
          discount_value?: number | null
          eligible_plan_types?: string[] | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name?: string
          requires_approval?: boolean | null
          trial_days?: number | null
          uses_count?: number | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      offer_commission_adjustments: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          offer_code: string
          offer_name: string | null
          recurring_adjustment_type: string | null
          recurring_adjustment_value: number | null
          upfront_adjustment_type: string | null
          upfront_adjustment_value: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          offer_code: string
          offer_name?: string | null
          recurring_adjustment_type?: string | null
          recurring_adjustment_value?: number | null
          upfront_adjustment_type?: string | null
          upfront_adjustment_value?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          offer_code?: string
          offer_name?: string | null
          recurring_adjustment_type?: string | null
          recurring_adjustment_value?: number | null
          upfront_adjustment_type?: string | null
          upfront_adjustment_value?: number | null
        }
        Relationships: []
      }
      offer_usage: {
        Row: {
          agent_id: string
          applied_at: string | null
          client_id: string
          id: string
          offer_code_id: string
          subscription_id: string | null
        }
        Insert: {
          agent_id: string
          applied_at?: string | null
          client_id: string
          id?: string
          offer_code_id: string
          subscription_id?: string | null
        }
        Update: {
          agent_id?: string
          applied_at?: string | null
          client_id?: string
          id?: string
          offer_code_id?: string
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_usage_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_usage_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_usage_offer_code_id_fkey"
            columns: ["offer_code_id"]
            isOneToOne: false
            referencedRelation: "offer_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_template_tasks: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          depends_on_task_id: string | null
          display_order: number | null
          estimated_days: number | null
          id: string
          task_description: string | null
          task_name: string
          template_id: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          depends_on_task_id?: string | null
          display_order?: number | null
          estimated_days?: number | null
          id?: string
          task_description?: string | null
          task_name: string
          template_id: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          depends_on_task_id?: string | null
          display_order?: number | null
          estimated_days?: number | null
          id?: string
          task_description?: string | null
          task_name?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_template_tasks_depends_on_task_id_fkey"
            columns: ["depends_on_task_id"]
            isOneToOne: false
            referencedRelation: "onboarding_template_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "onboarding_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_templates: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          phase_name: string
          phase_number: number
          plan_track: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phase_name: string
          phase_number: number
          plan_track: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phase_name?: string
          phase_number?: number
          plan_track?: string
        }
        Relationships: []
      }
      outreach_campaigns: {
        Row: {
          ai_goal: string | null
          ai_system_prompt: string | null
          campaign_type: string
          contacts_messaged: number | null
          contacts_qualified: number | null
          contacts_replied: number | null
          contacts_total: number | null
          created_at: string | null
          created_by: string | null
          daily_send_limit: number | null
          deals_closed: number | null
          demos_booked: number | null
          description: string | null
          id: string
          initial_message_template: string
          max_ai_messages: number | null
          name: string
          sending_days: number[] | null
          sending_window_end: string | null
          sending_window_start: string | null
          status: string | null
          trigger_conditions: Json | null
          trigger_delay_minutes: number | null
          trigger_source: string | null
          trigger_type: string | null
          updated_at: string | null
        }
        Insert: {
          ai_goal?: string | null
          ai_system_prompt?: string | null
          campaign_type: string
          contacts_messaged?: number | null
          contacts_qualified?: number | null
          contacts_replied?: number | null
          contacts_total?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_send_limit?: number | null
          deals_closed?: number | null
          demos_booked?: number | null
          description?: string | null
          id?: string
          initial_message_template: string
          max_ai_messages?: number | null
          name: string
          sending_days?: number[] | null
          sending_window_end?: string | null
          sending_window_start?: string | null
          status?: string | null
          trigger_conditions?: Json | null
          trigger_delay_minutes?: number | null
          trigger_source?: string | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_goal?: string | null
          ai_system_prompt?: string | null
          campaign_type?: string
          contacts_messaged?: number | null
          contacts_qualified?: number | null
          contacts_replied?: number | null
          contacts_total?: number | null
          created_at?: string | null
          created_by?: string | null
          daily_send_limit?: number | null
          deals_closed?: number | null
          demos_booked?: number | null
          description?: string | null
          id?: string
          initial_message_template?: string
          max_ai_messages?: number | null
          name?: string
          sending_days?: number[] | null
          sending_window_end?: string | null
          sending_window_start?: string | null
          status?: string | null
          trigger_conditions?: Json | null
          trigger_delay_minutes?: number | null
          trigger_source?: string | null
          trigger_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_contacts: {
        Row: {
          admin_assigned_at: string | null
          admin_assigned_by: string | null
          admin_notified: boolean | null
          assigned_agent_id: string | null
          budget_signal: string | null
          campaign_id: string | null
          city: string | null
          company_name: string | null
          consent_id: string | null
          converted_at: string | null
          converted_client_id: string | null
          converted_plan: string | null
          created_at: string | null
          current_solution: string | null
          decision_maker: boolean | null
          decision_maker_name: string | null
          email: string | null
          first_message_at: string | null
          first_reply_at: string | null
          id: string
          interest_level: string | null
          last_message_at: string | null
          last_reply_at: string | null
          messages_received: number | null
          messages_sent: number | null
          name: string | null
          overflow_at: string | null
          overflow_reason: string | null
          overflow_to_admin: boolean | null
          pain_points: string[] | null
          phone: string
          qualification_summary: string | null
          recommended_plan: string | null
          referrer_client_id: string | null
          scheduled_call_id: string | null
          score: number | null
          score_breakdown: Json | null
          source: string
          source_campaign: string | null
          source_details: Json | null
          state: string | null
          status: string | null
          timeline: string | null
          timezone: string | null
          timezone_source: string | null
          trade: string | null
          updated_at: string | null
        }
        Insert: {
          admin_assigned_at?: string | null
          admin_assigned_by?: string | null
          admin_notified?: boolean | null
          assigned_agent_id?: string | null
          budget_signal?: string | null
          campaign_id?: string | null
          city?: string | null
          company_name?: string | null
          consent_id?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          converted_plan?: string | null
          created_at?: string | null
          current_solution?: string | null
          decision_maker?: boolean | null
          decision_maker_name?: string | null
          email?: string | null
          first_message_at?: string | null
          first_reply_at?: string | null
          id?: string
          interest_level?: string | null
          last_message_at?: string | null
          last_reply_at?: string | null
          messages_received?: number | null
          messages_sent?: number | null
          name?: string | null
          overflow_at?: string | null
          overflow_reason?: string | null
          overflow_to_admin?: boolean | null
          pain_points?: string[] | null
          phone: string
          qualification_summary?: string | null
          recommended_plan?: string | null
          referrer_client_id?: string | null
          scheduled_call_id?: string | null
          score?: number | null
          score_breakdown?: Json | null
          source: string
          source_campaign?: string | null
          source_details?: Json | null
          state?: string | null
          status?: string | null
          timeline?: string | null
          timezone?: string | null
          timezone_source?: string | null
          trade?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_assigned_at?: string | null
          admin_assigned_by?: string | null
          admin_notified?: boolean | null
          assigned_agent_id?: string | null
          budget_signal?: string | null
          campaign_id?: string | null
          city?: string | null
          company_name?: string | null
          consent_id?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          converted_plan?: string | null
          created_at?: string | null
          current_solution?: string | null
          decision_maker?: boolean | null
          decision_maker_name?: string | null
          email?: string | null
          first_message_at?: string | null
          first_reply_at?: string | null
          id?: string
          interest_level?: string | null
          last_message_at?: string | null
          last_reply_at?: string | null
          messages_received?: number | null
          messages_sent?: number | null
          name?: string | null
          overflow_at?: string | null
          overflow_reason?: string | null
          overflow_to_admin?: boolean | null
          pain_points?: string[] | null
          phone?: string
          qualification_summary?: string | null
          recommended_plan?: string | null
          referrer_client_id?: string | null
          scheduled_call_id?: string | null
          score?: number | null
          score_breakdown?: Json | null
          source?: string
          source_campaign?: string | null
          source_details?: Json | null
          state?: string | null
          status?: string | null
          timeline?: string | null
          timezone?: string | null
          timezone_source?: string | null
          trade?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_contacts_admin_assigned_by_fkey"
            columns: ["admin_assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_contacts_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_contacts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_contacts_consent_id_fkey"
            columns: ["consent_id"]
            isOneToOne: false
            referencedRelation: "sms_consent"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_contacts_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_contacts_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_contacts_scheduled_call_id_fkey"
            columns: ["scheduled_call_id"]
            isOneToOne: false
            referencedRelation: "scheduled_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_conversations: {
        Row: {
          ai_context: Json | null
          ai_extracted_data: Json | null
          campaign_id: string | null
          contact_id: string
          created_at: string | null
          human_takeover: boolean | null
          human_takeover_at: string | null
          human_takeover_by: string | null
          human_takeover_reason: string | null
          id: string
          last_message_at: string | null
          messages_count: number | null
          started_at: string | null
          status: string | null
        }
        Insert: {
          ai_context?: Json | null
          ai_extracted_data?: Json | null
          campaign_id?: string | null
          contact_id: string
          created_at?: string | null
          human_takeover?: boolean | null
          human_takeover_at?: string | null
          human_takeover_by?: string | null
          human_takeover_reason?: string | null
          id?: string
          last_message_at?: string | null
          messages_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Update: {
          ai_context?: Json | null
          ai_extracted_data?: Json | null
          campaign_id?: string | null
          contact_id?: string
          created_at?: string | null
          human_takeover?: boolean | null
          human_takeover_at?: string | null
          human_takeover_by?: string | null
          human_takeover_reason?: string | null
          id?: string
          last_message_at?: string | null
          messages_count?: number | null
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_conversations_human_takeover_by_fkey"
            columns: ["human_takeover_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_messages: {
        Row: {
          ai_confidence: number | null
          ai_extracted: Json | null
          ai_intent: string | null
          consent_verified: boolean | null
          contact_id: string
          conversation_id: string
          created_at: string | null
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          id: string
          message_text: string
          opt_out_checked: boolean | null
          sender_id: string | null
          sender_type: string | null
          sent_at: string | null
          status: string | null
          twilio_sid: string | null
          within_send_window: boolean | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_extracted?: Json | null
          ai_intent?: string | null
          consent_verified?: boolean | null
          contact_id: string
          conversation_id: string
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_text: string
          opt_out_checked?: boolean | null
          sender_id?: string | null
          sender_type?: string | null
          sent_at?: string | null
          status?: string | null
          twilio_sid?: string | null
          within_send_window?: boolean | null
        }
        Update: {
          ai_confidence?: number | null
          ai_extracted?: Json | null
          ai_intent?: string | null
          consent_verified?: boolean | null
          contact_id?: string
          conversation_id?: string
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          message_text?: string
          opt_out_checked?: boolean | null
          sender_id?: string | null
          sender_type?: string | null
          sent_at?: string | null
          status?: string | null
          twilio_sid?: string | null
          within_send_window?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "outreach_messages_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "outreach_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      password_history: {
        Row: {
          created_at: string | null
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plan_installments: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          paid_at: string | null
          plan_id: string
          status: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          paid_at?: string | null
          plan_id: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          paid_at?: string | null
          plan_id?: string
          status?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plan_installments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          business_id: string
          created_at: string | null
          created_by: string | null
          frequency: string
          id: string
          invoice_id: string
          number_of_installments: number
          start_date: string
          status: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          created_by?: string | null
          frequency: string
          id?: string
          invoice_id: string
          number_of_installments: number
          start_date: string
          status?: string | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          created_by?: string | null
          frequency?: string
          id?: string
          invoice_id?: string
          number_of_installments?: number
          start_date?: string
          status?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_tracking: {
        Row: {
          agent_id: string | null
          created_at: string | null
          crm_account_id: string | null
          first_payment_at: string | null
          id: string
          plan_type: string | null
          recurring_eligible: boolean | null
          recurring_end_payment: number | null
          second_payment_at: string | null
          stripe_subscription_id: string
          successful_payments: number | null
          third_payment_at: string | null
          updated_at: string | null
          upfront_eligible: boolean | null
          upfront_paid: boolean | null
          web_customer_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          first_payment_at?: string | null
          id?: string
          plan_type?: string | null
          recurring_eligible?: boolean | null
          recurring_end_payment?: number | null
          second_payment_at?: string | null
          stripe_subscription_id: string
          successful_payments?: number | null
          third_payment_at?: string | null
          updated_at?: string | null
          upfront_eligible?: boolean | null
          upfront_paid?: boolean | null
          web_customer_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          first_payment_at?: string | null
          id?: string
          plan_type?: string | null
          recurring_eligible?: boolean | null
          recurring_end_payment?: number | null
          second_payment_at?: string | null
          stripe_subscription_id?: string
          successful_payments?: number | null
          third_payment_at?: string | null
          updated_at?: string | null
          upfront_eligible?: boolean | null
          upfront_paid?: boolean | null
          web_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_tracking_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tracking_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tracking_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string | null
          id: string
          invoice_id: string
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_activities: {
        Row: {
          activity_type: string
          agent_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          lead_id: string
          outcome: string | null
        }
        Insert: {
          activity_type: string
          agent_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id: string
          outcome?: string | null
        }
        Update: {
          activity_type?: string
          agent_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lead_id?: string
          outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_activities_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_leads: {
        Row: {
          address: string | null
          agent_id: string
          city: string | null
          company_name: string | null
          contact_name: string | null
          converted_at: string | null
          converted_client_id: string | null
          created_at: string | null
          email: string | null
          estimated_value_cents: number | null
          id: string
          interested_plan: string | null
          interested_track: string | null
          lost_reason: string | null
          notes: string | null
          phone: string | null
          source: string | null
          stage: string
          stage_changed_at: string | null
          state: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          agent_id: string
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          created_at?: string | null
          email?: string | null
          estimated_value_cents?: number | null
          id?: string
          interested_plan?: string | null
          interested_track?: string | null
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          stage_changed_at?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string
          city?: string | null
          company_name?: string | null
          contact_name?: string | null
          converted_at?: string | null
          converted_client_id?: string | null
          created_at?: string | null
          email?: string | null
          estimated_value_cents?: number | null
          id?: string
          interested_plan?: string | null
          interested_track?: string | null
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          stage?: string
          stage_changed_at?: string | null
          state?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_leads_converted_client_id_fkey"
            columns: ["converted_client_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_tasks: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          is_completed: boolean | null
          lead_id: string
          task_type: string
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean | null
          lead_id: string
          task_type: string
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean | null
          lead_id?: string
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_tasks_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pipeline_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "pipeline_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_commission_lookup: {
        Row: {
          annual_commission_cents: number | null
          annual_price_cents: number | null
          created_at: string | null
          id: string
          max_commission_cents: number
          monthly_price_cents: number
          plan_type: string
          rate_10_cents: number
          rate_15_cents: number
          total_bonuses_cents: number
          total_recurring_cents: number
          updated_at: string | null
          upfront_cents: number
        }
        Insert: {
          annual_commission_cents?: number | null
          annual_price_cents?: number | null
          created_at?: string | null
          id?: string
          max_commission_cents: number
          monthly_price_cents: number
          plan_type: string
          rate_10_cents: number
          rate_15_cents: number
          total_bonuses_cents: number
          total_recurring_cents: number
          updated_at?: string | null
          upfront_cents: number
        }
        Update: {
          annual_commission_cents?: number | null
          annual_price_cents?: number | null
          created_at?: string | null
          id?: string
          max_commission_cents?: number
          monthly_price_cents?: number
          plan_type?: string
          rate_10_cents?: number
          rate_15_cents?: number
          total_bonuses_cents?: number
          total_recurring_cents?: number
          updated_at?: string | null
          upfront_cents?: number
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          created_at: string | null
          display_order: number | null
          display_value: string | null
          feature_category: string
          feature_description: string | null
          feature_name: string
          id: string
          is_included: boolean
          plan_type: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          display_value?: string | null
          feature_category: string
          feature_description?: string | null
          feature_name: string
          id?: string
          is_included?: boolean
          plan_type: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          display_value?: string | null
          feature_category?: string
          feature_description?: string | null
          feature_name?: string
          id?: string
          is_included?: boolean
          plan_type?: string
        }
        Relationships: []
      }
      plan_leads_captain_features: {
        Row: {
          can_book_calendar: boolean | null
          created_at: string | null
          id: string
          includes_calendar: boolean | null
          includes_crm: boolean | null
          includes_leads_captain: boolean | null
          plan_type: string
          sms_included: number | null
        }
        Insert: {
          can_book_calendar?: boolean | null
          created_at?: string | null
          id?: string
          includes_calendar?: boolean | null
          includes_crm?: boolean | null
          includes_leads_captain?: boolean | null
          plan_type: string
          sms_included?: number | null
        }
        Update: {
          can_book_calendar?: boolean | null
          created_at?: string | null
          id?: string
          includes_calendar?: boolean | null
          includes_crm?: boolean | null
          includes_leads_captain?: boolean | null
          plan_type?: string
          sms_included?: number | null
        }
        Relationships: []
      }
      plan_nevermiss_features: {
        Row: {
          can_book_calendar: boolean
          created_at: string | null
          id: string
          includes_calendar: boolean
          includes_crm: boolean
          includes_nevermiss: boolean
          plan_type: string
          sms_included: number
        }
        Insert: {
          can_book_calendar?: boolean
          created_at?: string | null
          id?: string
          includes_calendar?: boolean
          includes_crm?: boolean
          includes_nevermiss?: boolean
          plan_type: string
          sms_included?: number
        }
        Update: {
          can_book_calendar?: boolean
          created_at?: string | null
          id?: string
          includes_calendar?: boolean
          includes_crm?: boolean
          includes_nevermiss?: boolean
          plan_type?: string
          sms_included?: number
        }
        Relationships: []
      }
      plan_pricing: {
        Row: {
          annual_price: number | null
          category: string
          created_at: string | null
          id: string
          is_active: boolean | null
          monthly_price: number | null
          plan_name: string
          plan_tier: string
          plan_type: string
          stripe_annual_price_id: string | null
          stripe_monthly_price_id: string | null
          updated_at: string | null
          user_limit: number | null
        }
        Insert: {
          annual_price?: number | null
          category: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          plan_name: string
          plan_tier: string
          plan_type: string
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          updated_at?: string | null
          user_limit?: number | null
        }
        Update: {
          annual_price?: number | null
          category?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          monthly_price?: number | null
          plan_name?: string
          plan_tier?: string
          plan_type?: string
          stripe_annual_price_id?: string | null
          stripe_monthly_price_id?: string | null
          updated_at?: string | null
          user_limit?: number | null
        }
        Relationships: []
      }
      plan_upgrade_paths: {
        Row: {
          benefits_summary: string | null
          created_at: string | null
          display_order: number | null
          from_plan_type: string
          id: string
          is_recommended: boolean | null
          price_difference_cents: number
          talking_point: string | null
          to_plan_type: string
        }
        Insert: {
          benefits_summary?: string | null
          created_at?: string | null
          display_order?: number | null
          from_plan_type: string
          id?: string
          is_recommended?: boolean | null
          price_difference_cents: number
          talking_point?: string | null
          to_plan_type: string
        }
        Update: {
          benefits_summary?: string | null
          created_at?: string | null
          display_order?: number | null
          from_plan_type?: string
          id?: string
          is_recommended?: boolean | null
          price_difference_cents?: number
          talking_point?: string | null
          to_plan_type?: string
        }
        Relationships: []
      }
      portal_activity_log: {
        Row: {
          action: string
          business_id: string
          created_at: string | null
          customer_id: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          business_id: string
          created_at?: string | null
          customer_id: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          business_id?: string
          created_at?: string | null
          customer_id?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_activity_log_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_notifications: {
        Row: {
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          data: Json | null
          id: string
          message: string
          read: boolean | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          data?: Json | null
          id?: string
          message: string
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          data?: Json | null
          id?: string
          message?: string
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_notifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portal_notifications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          created_at: string | null
          event_id: string
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_id: string
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string | null
        }
        Relationships: []
      }
      promotion_uses: {
        Row: {
          created_at: string | null
          customer_id: string
          discount_amount: number
          id: string
          invoice_id: string | null
          job_id: string | null
          promotion_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          discount_amount: number
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          promotion_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          discount_amount?: number
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_uses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_uses_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_uses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_uses_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applicable_services: string[] | null
          business_id: string
          code: string
          created_at: string | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_customer: number | null
          minimum_order_value: number | null
          name: string
          new_customers_only: boolean | null
          starts_at: string | null
          times_used: number | null
          updated_at: string | null
        }
        Insert: {
          applicable_services?: string[] | null
          business_id: string
          code: string
          created_at?: string | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          minimum_order_value?: number | null
          name: string
          new_customers_only?: boolean | null
          starts_at?: string | null
          times_used?: number | null
          updated_at?: string | null
        }
        Update: {
          applicable_services?: string[] | null
          business_id?: string
          code?: string
          created_at?: string | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_customer?: number | null
          minimum_order_value?: number | null
          name?: string
          new_customers_only?: boolean | null
          starts_at?: string | null
          times_used?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string | null
          device_name: string | null
          device_type: string
          endpoint: string | null
          fcm_token: string | null
          id: string
          is_active: boolean | null
          keys_auth: string | null
          keys_p256dh: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_name?: string | null
          device_type: string
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          is_active?: boolean | null
          keys_auth?: string | null
          keys_p256dh?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_name?: string | null
          device_type?: string
          endpoint?: string | null
          fcm_token?: string | null
          id?: string
          is_active?: boolean | null
          keys_auth?: string | null
          keys_p256dh?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_connections: {
        Row: {
          access_token: string
          auto_sync_enabled: boolean | null
          business_id: string
          company_name: string | null
          created_at: string | null
          id: string
          last_sync_at: string | null
          realm_id: string
          refresh_token: string
          sync_customers: boolean | null
          sync_expenses: boolean | null
          sync_invoices: boolean | null
          sync_payments: boolean | null
          token_expires_at: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          auto_sync_enabled?: boolean | null
          business_id: string
          company_name?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          realm_id: string
          refresh_token: string
          sync_customers?: boolean | null
          sync_expenses?: boolean | null
          sync_invoices?: boolean | null
          sync_payments?: boolean | null
          token_expires_at: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          auto_sync_enabled?: boolean | null
          business_id?: string
          company_name?: string | null
          created_at?: string | null
          id?: string
          last_sync_at?: string | null
          realm_id?: string
          refresh_token?: string
          sync_customers?: boolean | null
          sync_expenses?: boolean | null
          sync_invoices?: boolean | null
          sync_payments?: boolean | null
          token_expires_at?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quickbooks_sync_map: {
        Row: {
          business_id: string
          created_at: string | null
          entity_type: string
          id: string
          last_synced_at: string | null
          local_id: string
          quickbooks_id: string
          sync_error: string | null
          sync_status: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          entity_type: string
          id?: string
          last_synced_at?: string | null
          local_id: string
          quickbooks_id: string
          sync_error?: string | null
          sync_status?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          entity_type?: string
          id?: string
          last_synced_at?: string | null
          local_id?: string
          quickbooks_id?: string
          sync_error?: string | null
          sync_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quickbooks_sync_map_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          description: string
          id: string
          is_taxable: boolean | null
          quantity: number
          quote_id: string | null
          saved_service_id: string | null
          sort_order: number | null
          total: number
          unit_price: number
        }
        Insert: {
          description: string
          id?: string
          is_taxable?: boolean | null
          quantity?: number
          quote_id?: string | null
          saved_service_id?: string | null
          sort_order?: number | null
          total: number
          unit_price: number
        }
        Update: {
          description?: string
          id?: string
          is_taxable?: boolean | null
          quantity?: number
          quote_id?: string | null
          saved_service_id?: string | null
          sort_order?: number | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_saved_service_id_fkey"
            columns: ["saved_service_id"]
            isOneToOne: false
            referencedRelation: "saved_services"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          access_token: string | null
          approval_signature_url: string | null
          approval_status: string | null
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          business_id: string | null
          change_request_notes: string | null
          converted_at: string | null
          converted_to_invoice: boolean | null
          created_at: string | null
          customer_id: string | null
          customer_notes: string | null
          decline_reason: string | null
          discount_amount: number | null
          financing_available: boolean | null
          financing_terms: string | null
          id: string
          job_id: string | null
          lead_id: string | null
          notes: string | null
          quote_number: string
          requires_approval: boolean | null
          signature_id: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          terms: string | null
          total: number
          updated_at: string | null
          valid_until: string | null
          viewed_at: string | null
        }
        Insert: {
          access_token?: string | null
          approval_signature_url?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          business_id?: string | null
          change_request_notes?: string | null
          converted_at?: string | null
          converted_to_invoice?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          decline_reason?: string | null
          discount_amount?: number | null
          financing_available?: boolean | null
          financing_terms?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          notes?: string | null
          quote_number: string
          requires_approval?: boolean | null
          signature_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string | null
          valid_until?: string | null
          viewed_at?: string | null
        }
        Update: {
          access_token?: string | null
          approval_signature_url?: string | null
          approval_status?: string | null
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          business_id?: string | null
          change_request_notes?: string | null
          converted_at?: string | null
          converted_to_invoice?: boolean | null
          created_at?: string | null
          customer_id?: string | null
          customer_notes?: string | null
          decline_reason?: string | null
          discount_amount?: number | null
          financing_available?: boolean | null
          financing_terms?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          notes?: string | null
          quote_number?: string
          requires_approval?: boolean | null
          signature_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          terms?: string | null
          total?: number
          updated_at?: string | null
          valid_until?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_quotes_signature"
            columns: ["signature_id"]
            isOneToOne: false
            referencedRelation: "signatures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number | null
          business_id: string
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_path: string
          image_url: string
          job_id: string | null
          ocr_data: Json | null
          receipt_date: string | null
          reimbursed_at: string | null
          reimbursement_status: string | null
          updated_at: string | null
          uploaded_by: string
          vendor_name: string | null
        }
        Insert: {
          amount?: number | null
          business_id: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_path: string
          image_url: string
          job_id?: string | null
          ocr_data?: Json | null
          receipt_date?: string | null
          reimbursed_at?: string | null
          reimbursement_status?: string | null
          updated_at?: string | null
          uploaded_by: string
          vendor_name?: string | null
        }
        Update: {
          amount?: number | null
          business_id?: string
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_path?: string
          image_url?: string
          job_id?: string | null
          ocr_data?: Json | null
          receipt_date?: string | null
          reimbursed_at?: string | null
          reimbursement_status?: string | null
          updated_at?: string | null
          uploaded_by?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receipts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          business_id: string
          code: string
          created_at: string | null
          customer_id: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          times_used: number | null
          total_value_generated: number | null
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string | null
          customer_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          times_used?: number | null
          total_value_generated?: number | null
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string | null
          customer_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          times_used?: number | null
          total_value_generated?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_codes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_programs: {
        Row: {
          business_id: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          max_referrals_per_customer: number | null
          minimum_job_value: number | null
          name: string
          referee_reward_amount: number | null
          referee_reward_type: string | null
          referrer_reward_amount: number
          referrer_reward_type: string
          start_date: string | null
          terms_and_conditions: string | null
          updated_at: string | null
          valid_services: string[] | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_referrals_per_customer?: number | null
          minimum_job_value?: number | null
          name: string
          referee_reward_amount?: number | null
          referee_reward_type?: string | null
          referrer_reward_amount?: number
          referrer_reward_type: string
          start_date?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          valid_services?: string[] | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          max_referrals_per_customer?: number | null
          minimum_job_value?: number | null
          name?: string
          referee_reward_amount?: number | null
          referee_reward_type?: string | null
          referrer_reward_amount?: number
          referrer_reward_type?: string
          start_date?: string | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          valid_services?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_programs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_settings: {
        Row: {
          business_id: string
          created_at: string | null
          id: string
          is_enabled: boolean | null
          max_referrals_per_customer: number | null
          minimum_job_value: number | null
          referee_reward_amount: number | null
          referee_reward_type: string | null
          referrer_reward_amount: number | null
          referrer_reward_type: string | null
          require_job_completion: boolean | null
          reward_expiry_days: number | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_referrals_per_customer?: number | null
          minimum_job_value?: number | null
          referee_reward_amount?: number | null
          referee_reward_type?: string | null
          referrer_reward_amount?: number | null
          referrer_reward_type?: string | null
          require_job_completion?: boolean | null
          reward_expiry_days?: number | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          max_referrals_per_customer?: number | null
          minimum_job_value?: number | null
          referee_reward_amount?: number | null
          referee_reward_type?: string | null
          referrer_reward_amount?: number | null
          referrer_reward_type?: string | null
          require_job_completion?: boolean | null
          reward_expiry_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_settings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_submissions: {
        Row: {
          created_at: string | null
          id: string
          outreach_contact_id: string | null
          referral_company: string | null
          referral_email: string | null
          referral_name: string
          referral_notes: string | null
          referral_phone: string
          referral_trade: string | null
          referrer_agent_id: string | null
          referrer_client_id: string
          referrer_notified_on_contact: boolean | null
          referrer_notified_on_conversion: boolean | null
          reward_amount_cents: number | null
          reward_earned_at: string | null
          reward_notes: string | null
          reward_paid_at: string | null
          reward_status: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          outreach_contact_id?: string | null
          referral_company?: string | null
          referral_email?: string | null
          referral_name: string
          referral_notes?: string | null
          referral_phone: string
          referral_trade?: string | null
          referrer_agent_id?: string | null
          referrer_client_id: string
          referrer_notified_on_contact?: boolean | null
          referrer_notified_on_conversion?: boolean | null
          reward_amount_cents?: number | null
          reward_earned_at?: string | null
          reward_notes?: string | null
          reward_paid_at?: string | null
          reward_status?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          outreach_contact_id?: string | null
          referral_company?: string | null
          referral_email?: string | null
          referral_name?: string
          referral_notes?: string | null
          referral_phone?: string
          referral_trade?: string | null
          referrer_agent_id?: string | null
          referrer_client_id?: string
          referrer_notified_on_contact?: boolean | null
          referrer_notified_on_conversion?: boolean | null
          reward_amount_cents?: number | null
          reward_earned_at?: string | null
          reward_notes?: string | null
          reward_paid_at?: string | null
          reward_status?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_submissions_outreach_contact_id_fkey"
            columns: ["outreach_contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_submissions_referrer_agent_id_fkey"
            columns: ["referrer_agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_submissions_referrer_client_id_fkey"
            columns: ["referrer_client_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          business_id: string
          converted_at: string | null
          converted_job_id: string | null
          created_at: string | null
          id: string
          job_value: number | null
          referee_customer_id: string | null
          referee_email: string | null
          referee_name: string | null
          referee_phone: string | null
          referee_reward_amount: number | null
          referee_reward_status: string | null
          referral_code_id: string | null
          referrer_customer_id: string
          referrer_reward_amount: number | null
          referrer_reward_issued_at: string | null
          referrer_reward_status: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          business_id: string
          converted_at?: string | null
          converted_job_id?: string | null
          created_at?: string | null
          id?: string
          job_value?: number | null
          referee_customer_id?: string | null
          referee_email?: string | null
          referee_name?: string | null
          referee_phone?: string | null
          referee_reward_amount?: number | null
          referee_reward_status?: string | null
          referral_code_id?: string | null
          referrer_customer_id: string
          referrer_reward_amount?: number | null
          referrer_reward_issued_at?: string | null
          referrer_reward_status?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          converted_at?: string | null
          converted_job_id?: string | null
          created_at?: string | null
          id?: string
          job_value?: number | null
          referee_customer_id?: string | null
          referee_email?: string | null
          referee_name?: string | null
          referee_phone?: string | null
          referee_reward_amount?: number | null
          referee_reward_status?: string | null
          referral_code_id?: string | null
          referrer_customer_id?: string
          referrer_reward_amount?: number | null
          referrer_reward_issued_at?: string | null
          referrer_reward_status?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_converted_job_id_fkey"
            columns: ["converted_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_customer_id_fkey"
            columns: ["referee_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_customer_id_fkey"
            columns: ["referrer_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          business_id: string | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          job_id: string | null
          lead_id: string | null
          notes: string | null
          remind_at: string
          retention: string | null
          snoozed_until: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          notes?: string | null
          remind_at: string
          retention?: string | null
          snoozed_until?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          job_id?: string | null
          lead_id?: string | null
          notes?: string | null
          remind_at?: string
          retention?: string | null
          snoozed_until?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_bonuses: {
        Row: {
          applies_to: string | null
          bonus_amount_cents: number
          created_at: string | null
          effective_date: string
          id: string
          is_active: boolean | null
          milestone: string
          requirement: string | null
        }
        Insert: {
          applies_to?: string | null
          bonus_amount_cents: number
          created_at?: string | null
          effective_date: string
          id?: string
          is_active?: boolean | null
          milestone: string
          requirement?: string | null
        }
        Update: {
          applies_to?: string | null
          bonus_amount_cents?: number
          created_at?: string | null
          effective_date?: string
          id?: string
          is_active?: boolean | null
          milestone?: string
          requirement?: string | null
        }
        Relationships: []
      }
      retention_tracking: {
        Row: {
          agent_id: string
          created_at: string | null
          crm_account_id: string | null
          id: string
          month_12_bonus_paid: boolean | null
          month_12_payment_date: string | null
          month_12_retained: boolean | null
          month_3_audit_sent: boolean | null
          month_3_bonus_paid: boolean | null
          month_3_call_completed: boolean | null
          month_3_call_date: string | null
          month_3_call_notes: string | null
          month_4_bonus_paid: boolean | null
          month_4_payment_date: string | null
          month_4_retained: boolean | null
          month_6_bonus_paid: boolean | null
          month_6_payment_date: string | null
          month_6_retained: boolean | null
          total_retention_bonus: number | null
          updated_at: string | null
          web_customer_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          crm_account_id?: string | null
          id?: string
          month_12_bonus_paid?: boolean | null
          month_12_payment_date?: string | null
          month_12_retained?: boolean | null
          month_3_audit_sent?: boolean | null
          month_3_bonus_paid?: boolean | null
          month_3_call_completed?: boolean | null
          month_3_call_date?: string | null
          month_3_call_notes?: string | null
          month_4_bonus_paid?: boolean | null
          month_4_payment_date?: string | null
          month_4_retained?: boolean | null
          month_6_bonus_paid?: boolean | null
          month_6_payment_date?: string | null
          month_6_retained?: boolean | null
          total_retention_bonus?: number | null
          updated_at?: string | null
          web_customer_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          crm_account_id?: string | null
          id?: string
          month_12_bonus_paid?: boolean | null
          month_12_payment_date?: string | null
          month_12_retained?: boolean | null
          month_3_audit_sent?: boolean | null
          month_3_bonus_paid?: boolean | null
          month_3_call_completed?: boolean | null
          month_3_call_date?: string | null
          month_3_call_notes?: string | null
          month_4_bonus_paid?: boolean | null
          month_4_payment_date?: string | null
          month_4_retained?: boolean | null
          month_6_bonus_paid?: boolean | null
          month_6_payment_date?: string | null
          month_6_retained?: boolean | null
          total_retention_bonus?: number | null
          updated_at?: string | null
          web_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retention_tracking_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_tracking_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: true
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_tracking_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: true
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_forecasts: {
        Row: {
          actual_mrr: number | null
          confidence_pct: number | null
          forecast_month: string
          generated_at: string | null
          id: string
          pipeline_snapshot: Json | null
          predicted_mrr: number | null
          predicted_mrr_high: number | null
          predicted_mrr_low: number | null
          variance_pct: number | null
        }
        Insert: {
          actual_mrr?: number | null
          confidence_pct?: number | null
          forecast_month: string
          generated_at?: string | null
          id?: string
          pipeline_snapshot?: Json | null
          predicted_mrr?: number | null
          predicted_mrr_high?: number | null
          predicted_mrr_low?: number | null
          variance_pct?: number | null
        }
        Update: {
          actual_mrr?: number | null
          confidence_pct?: number | null
          forecast_month?: string
          generated_at?: string | null
          id?: string
          pipeline_snapshot?: Json | null
          predicted_mrr?: number | null
          predicted_mrr_high?: number | null
          predicted_mrr_low?: number | null
          variance_pct?: number | null
        }
        Relationships: []
      }
      review_requests: {
        Row: {
          business_id: string
          clicked_at: string | null
          created_at: string | null
          customer_id: string
          id: string
          job_id: string | null
          sent_at: string | null
          sent_via: string | null
        }
        Insert: {
          business_id: string
          clicked_at?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          job_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
        }
        Update: {
          business_id?: string
          clicked_at?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          job_id?: string | null
          sent_at?: string | null
          sent_via?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_attribution_log: {
        Row: {
          agent_id: string | null
          attributed_to: string
          created_at: string | null
          created_by: string
          crm_account_id: string | null
          id: string
          notes: string | null
          plan_type: string | null
          sale_amount: number | null
          web_customer_id: string | null
        }
        Insert: {
          agent_id?: string | null
          attributed_to: string
          created_at?: string | null
          created_by: string
          crm_account_id?: string | null
          id?: string
          notes?: string | null
          plan_type?: string | null
          sale_amount?: number | null
          web_customer_id?: string | null
        }
        Update: {
          agent_id?: string | null
          attributed_to?: string
          created_at?: string | null
          created_by?: string
          crm_account_id?: string | null
          id?: string
          notes?: string | null
          plan_type?: string | null
          sale_amount?: number | null
          web_customer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_attribution_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_attribution_log_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_attribution_log_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_attribution_log_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_services: {
        Row: {
          business_id: string | null
          category: string | null
          default_price: number
          description: string | null
          id: string
          name: string
        }
        Insert: {
          business_id?: string | null
          category?: string | null
          default_price: number
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          business_id?: string | null
          category?: string | null
          default_price?: number
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_services_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_blocks: {
        Row: {
          business_id: string
          created_at: string | null
          day_of_week: number | null
          end_time: string
          id: string
          is_recurring: boolean | null
          label: string
          specific_date: string | null
          start_time: string
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          day_of_week?: number | null
          end_time: string
          id?: string
          is_recurring?: boolean | null
          label: string
          specific_date?: string | null
          start_time: string
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          day_of_week?: number | null
          end_time?: string
          id?: string
          is_recurring?: boolean | null
          label?: string
          specific_date?: string | null
          start_time?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_blocks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_calls: {
        Row: {
          admin_approved: boolean | null
          admin_approved_at: string | null
          admin_approved_by: string | null
          agent_id: string | null
          agent_reminder_sent: boolean | null
          agent_timezone: string | null
          call_type: string | null
          campaign_id: string | null
          contact_id: string | null
          created_at: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          lead_reminder_sent: boolean | null
          lead_timezone: string | null
          meeting_link: string | null
          outcome: string | null
          outcome_notes: string | null
          overflow_reason: string | null
          plan_sold: string | null
          reschedule_count: number | null
          rescheduled_from_id: string | null
          scheduled_at: string
          started_at: string | null
          status: string | null
          updated_at: string | null
          weekend_request: boolean | null
        }
        Insert: {
          admin_approved?: boolean | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          agent_id?: string | null
          agent_reminder_sent?: boolean | null
          agent_timezone?: string | null
          call_type?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          lead_reminder_sent?: boolean | null
          lead_timezone?: string | null
          meeting_link?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          overflow_reason?: string | null
          plan_sold?: string | null
          reschedule_count?: number | null
          rescheduled_from_id?: string | null
          scheduled_at: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          weekend_request?: boolean | null
        }
        Update: {
          admin_approved?: boolean | null
          admin_approved_at?: string | null
          admin_approved_by?: string | null
          agent_id?: string | null
          agent_reminder_sent?: boolean | null
          agent_timezone?: string | null
          call_type?: string | null
          campaign_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          lead_reminder_sent?: boolean | null
          lead_timezone?: string | null
          meeting_link?: string | null
          outcome?: string | null
          outcome_notes?: string | null
          overflow_reason?: string | null
          plan_sold?: string | null
          reschedule_count?: number | null
          rescheduled_from_id?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
          weekend_request?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_calls_admin_approved_by_fkey"
            columns: ["admin_approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_calls_rescheduled_from_id_fkey"
            columns: ["rescheduled_from_id"]
            isOneToOne: false
            referencedRelation: "scheduled_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          business_id: string
          content: string
          created_at: string | null
          customer_id: string | null
          error_message: string | null
          id: string
          job_id: string | null
          phone_number: string
          scheduled_for: string
          sent_at: string | null
          status: string | null
          twilio_sid: string | null
        }
        Insert: {
          business_id: string
          content: string
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          phone_number: string
          scheduled_for: string
          sent_at?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Update: {
          business_id?: string
          content?: string
          created_at?: string | null
          customer_id?: string | null
          error_message?: string | null
          id?: string
          job_id?: string | null
          phone_number?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduling_links: {
        Row: {
          agent_id: string | null
          bookings_count: number | null
          buffer_after_minutes: number | null
          buffer_before_minutes: number | null
          campaign_id: string | null
          created_at: string | null
          custom_fields: Json | null
          custom_hours: Json | null
          description_text: string | null
          header_text: string | null
          id: string
          is_active: boolean | null
          link_type: string | null
          logo_url: string | null
          max_bookings_per_day: number | null
          primary_color: string | null
          require_company: boolean | null
          require_email: boolean | null
          require_name: boolean | null
          require_phone: boolean | null
          require_trade: boolean | null
          slug: string
          updated_at: string | null
          use_agent_hours: boolean | null
        }
        Insert: {
          agent_id?: string | null
          bookings_count?: number | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          campaign_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          custom_hours?: Json | null
          description_text?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          link_type?: string | null
          logo_url?: string | null
          max_bookings_per_day?: number | null
          primary_color?: string | null
          require_company?: boolean | null
          require_email?: boolean | null
          require_name?: boolean | null
          require_phone?: boolean | null
          require_trade?: boolean | null
          slug: string
          updated_at?: string | null
          use_agent_hours?: boolean | null
        }
        Update: {
          agent_id?: string | null
          bookings_count?: number | null
          buffer_after_minutes?: number | null
          buffer_before_minutes?: number | null
          campaign_id?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          custom_hours?: Json | null
          description_text?: string | null
          header_text?: string | null
          id?: string
          is_active?: boolean | null
          link_type?: string | null
          logo_url?: string | null
          max_bookings_per_day?: number | null
          primary_color?: string | null
          require_company?: boolean | null
          require_email?: boolean | null
          require_name?: boolean | null
          require_phone?: boolean | null
          require_trade?: boolean | null
          slug?: string
          updated_at?: string | null
          use_agent_hours?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduling_links_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduling_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "outreach_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          business_id: string | null
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          ip_address: string | null
          location: string | null
          metadata: Json | null
          risk_level: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          ip_address?: string | null
          location?: string | null
          metadata?: Json | null
          risk_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          ip_address?: string | null
          location?: string | null
          metadata?: Json | null
          risk_level?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      service_agreements: {
        Row: {
          annual_price: number | null
          auto_generate_jobs: boolean | null
          auto_notify_customer: boolean | null
          auto_renew: boolean | null
          benefits: Json | null
          business_id: string
          created_at: string | null
          customer_id: string
          days_before_to_generate: number | null
          description: string | null
          discount_percentage: number | null
          end_date: string | null
          free_diagnostic: boolean | null
          frequency: string
          id: string
          job_template: Json | null
          membership_tier: string | null
          name: string
          next_service_date: string | null
          notes: string | null
          portal_visible: boolean | null
          price_per_service: number | null
          priority_scheduling: boolean | null
          renewal_reminder_days: number | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          annual_price?: number | null
          auto_generate_jobs?: boolean | null
          auto_notify_customer?: boolean | null
          auto_renew?: boolean | null
          benefits?: Json | null
          business_id: string
          created_at?: string | null
          customer_id: string
          days_before_to_generate?: number | null
          description?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          free_diagnostic?: boolean | null
          frequency: string
          id?: string
          job_template?: Json | null
          membership_tier?: string | null
          name: string
          next_service_date?: string | null
          notes?: string | null
          portal_visible?: boolean | null
          price_per_service?: number | null
          priority_scheduling?: boolean | null
          renewal_reminder_days?: number | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          annual_price?: number | null
          auto_generate_jobs?: boolean | null
          auto_notify_customer?: boolean | null
          auto_renew?: boolean | null
          benefits?: Json | null
          business_id?: string
          created_at?: string | null
          customer_id?: string
          days_before_to_generate?: number | null
          description?: string | null
          discount_percentage?: number | null
          end_date?: string | null
          free_diagnostic?: boolean | null
          frequency?: string
          id?: string
          job_template?: Json | null
          membership_tier?: string | null
          name?: string
          next_service_date?: string | null
          notes?: string | null
          portal_visible?: boolean | null
          price_per_service?: number | null
          priority_scheduling?: boolean | null
          renewal_reminder_days?: number | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_agreements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_agreements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_onboarding_progress: {
        Row: {
          checklist_type: string
          client_id: string
          completed_at: string | null
          created_at: string | null
          id: string
          items: Json
          overall_progress: number | null
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          checklist_type: string
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          overall_progress?: number | null
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          checklist_type?: string
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          items?: Json
          overall_progress?: number | null
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      service_requests: {
        Row: {
          business_id: string
          created_at: string | null
          customer_id: string
          customer_notes: string | null
          description: string
          equipment_id: string | null
          flexible_scheduling: boolean | null
          id: string
          internal_notes: string | null
          job_id: string | null
          photos: Json | null
          preferred_date: string | null
          preferred_time_slot: string | null
          service_type: string
          status: string | null
          updated_at: string | null
          urgency: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          customer_id: string
          customer_notes?: string | null
          description: string
          equipment_id?: string | null
          flexible_scheduling?: boolean | null
          id?: string
          internal_notes?: string | null
          job_id?: string | null
          photos?: Json | null
          preferred_date?: string | null
          preferred_time_slot?: string | null
          service_type: string
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          customer_id?: string
          customer_notes?: string | null
          description?: string
          equipment_id?: string | null
          flexible_scheduling?: boolean | null
          id?: string
          internal_notes?: string | null
          job_id?: string | null
          photos?: Json | null
          preferred_date?: string | null
          preferred_time_slot?: string | null
          service_type?: string
          status?: string | null
          updated_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "customer_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_requests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      signatures: {
        Row: {
          agreement_text: string | null
          business_id: string
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          signature_url: string
          signed_at: string | null
          signer_email: string | null
          signer_name: string
          signer_phone: string | null
          storage_path: string
          user_agent: string | null
        }
        Insert: {
          agreement_text?: string | null
          business_id: string
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          signature_url: string
          signed_at?: string | null
          signer_email?: string | null
          signer_name: string
          signer_phone?: string | null
          storage_path: string
          user_agent?: string | null
        }
        Update: {
          agreement_text?: string | null
          business_id?: string
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          signature_url?: string
          signed_at?: string | null
          signer_email?: string | null
          signer_name?: string
          signer_phone?: string | null
          storage_path?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signatures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_definitions: {
        Row: {
          business_id: string
          category: string | null
          certification_expiry_days: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          requires_certification: boolean | null
        }
        Insert: {
          business_id: string
          category?: string | null
          certification_expiry_days?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          requires_certification?: boolean | null
        }
        Update: {
          business_id?: string
          category?: string | null
          certification_expiry_days?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          requires_certification?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_definitions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_channels: {
        Row: {
          agent_id: string | null
          channel_id: string
          channel_name: string
          channel_type: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          notify_booked: boolean | null
          notify_closed: boolean | null
          notify_escalations: boolean | null
          notify_hot_leads: boolean | null
          notify_new_leads: boolean | null
          notify_no_shows: boolean | null
          notify_qualified: boolean | null
          notify_speed_alerts: boolean | null
        }
        Insert: {
          agent_id?: string | null
          channel_id: string
          channel_name: string
          channel_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notify_booked?: boolean | null
          notify_closed?: boolean | null
          notify_escalations?: boolean | null
          notify_hot_leads?: boolean | null
          notify_new_leads?: boolean | null
          notify_no_shows?: boolean | null
          notify_qualified?: boolean | null
          notify_speed_alerts?: boolean | null
        }
        Update: {
          agent_id?: string | null
          channel_id?: string
          channel_name?: string
          channel_type?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          notify_booked?: boolean | null
          notify_closed?: boolean | null
          notify_escalations?: boolean | null
          notify_hot_leads?: boolean | null
          notify_new_leads?: boolean | null
          notify_no_shows?: boolean | null
          notify_qualified?: boolean | null
          notify_speed_alerts?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_channels_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      slack_settings: {
        Row: {
          access_token: string | null
          bot_token: string | null
          connected_at: string | null
          connected_by: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          workspace_id: string | null
          workspace_name: string | null
        }
        Insert: {
          access_token?: string | null
          bot_token?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Update: {
          access_token?: string | null
          bot_token?: string | null
          connected_at?: string | null
          connected_by?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          workspace_id?: string | null
          workspace_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "slack_settings_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_consent: {
        Row: {
          consent_form_url: string | null
          consent_ip: string | null
          consent_language: string | null
          consent_source: string
          consent_timestamp: string
          consent_type: string
          consent_user_agent: string | null
          created_at: string | null
          id: string
          is_valid: boolean | null
          phone: string
          revoke_method: string | null
          revoked_at: string | null
        }
        Insert: {
          consent_form_url?: string | null
          consent_ip?: string | null
          consent_language?: string | null
          consent_source: string
          consent_timestamp: string
          consent_type: string
          consent_user_agent?: string | null
          created_at?: string | null
          id?: string
          is_valid?: boolean | null
          phone: string
          revoke_method?: string | null
          revoked_at?: string | null
        }
        Update: {
          consent_form_url?: string | null
          consent_ip?: string | null
          consent_language?: string | null
          consent_source?: string
          consent_timestamp?: string
          consent_type?: string
          consent_user_agent?: string | null
          created_at?: string | null
          id?: string
          is_valid?: boolean | null
          phone?: string
          revoke_method?: string | null
          revoked_at?: string | null
        }
        Relationships: []
      }
      sms_conversations: {
        Row: {
          ai_response_count: number | null
          business_id: string | null
          created_at: string | null
          customer_id: string | null
          human_attention_at: string | null
          human_attention_reason: string | null
          human_requested_at: string | null
          id: string
          is_customer_initiated: boolean | null
          last_customer_message_at: string | null
          last_message_at: string | null
          lead_id: string | null
          metadata: Json | null
          needs_human_attention: boolean | null
          phone: string
          portal_customer_id: string | null
          requires_human_attention: boolean | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          ai_response_count?: number | null
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          human_attention_at?: string | null
          human_attention_reason?: string | null
          human_requested_at?: string | null
          id?: string
          is_customer_initiated?: boolean | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          needs_human_attention?: boolean | null
          phone: string
          portal_customer_id?: string | null
          requires_human_attention?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_response_count?: number | null
          business_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          human_attention_at?: string | null
          human_attention_reason?: string | null
          human_requested_at?: string | null
          id?: string
          is_customer_initiated?: boolean | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          lead_id?: string | null
          metadata?: Json | null
          needs_human_attention?: boolean | null
          phone?: string
          portal_customer_id?: string | null
          requires_human_attention?: boolean | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_conversations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_conversations_portal_customer_id_fkey"
            columns: ["portal_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_delivery_failures: {
        Row: {
          business_id: string | null
          created_at: string | null
          error_code: string | null
          id: string
          message_sid: string | null
          phone_number: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          error_code?: string | null
          id?: string
          message_sid?: string | null
          phone_number?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          error_code?: string | null
          id?: string
          message_sid?: string | null
          phone_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_delivery_failures_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          body: string
          conversation_id: string | null
          created_at: string | null
          delivered_at: string | null
          direction: string
          error_message: string | null
          forwarded_at: string | null
          forwarded_to: string | null
          from_number: string | null
          id: string
          is_ai_response: boolean | null
          metadata: Json | null
          sender: string
          sender_user_id: string | null
          status: string | null
          status_updated_at: string | null
          to_number: string | null
          twilio_sid: string | null
        }
        Insert: {
          body: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          error_message?: string | null
          forwarded_at?: string | null
          forwarded_to?: string | null
          from_number?: string | null
          id?: string
          is_ai_response?: boolean | null
          metadata?: Json | null
          sender: string
          sender_user_id?: string | null
          status?: string | null
          status_updated_at?: string | null
          to_number?: string | null
          twilio_sid?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string | null
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          error_message?: string | null
          forwarded_at?: string | null
          forwarded_to?: string | null
          from_number?: string | null
          id?: string
          is_ai_response?: boolean | null
          metadata?: Json | null
          sender?: string
          sender_user_id?: string | null
          status?: string | null
          status_updated_at?: string | null
          to_number?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "sms_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_opt_outs: {
        Row: {
          created_at: string | null
          id: string
          opt_out_keyword: string | null
          opt_out_method: string | null
          opted_out_at: string
          original_campaign_id: string | null
          phone: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          opt_out_keyword?: string | null
          opt_out_method?: string | null
          opted_out_at: string
          original_campaign_id?: string | null
          phone: string
        }
        Update: {
          created_at?: string | null
          id?: string
          opt_out_keyword?: string | null
          opt_out_method?: string | null
          opted_out_at?: string
          original_campaign_id?: string | null
          phone?: string
        }
        Relationships: []
      }
      sms_suppression_list: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          phone_number: string
          reason: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number: string
          reason: string
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          phone_number?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_suppression_list_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          business_id: string
          category: string | null
          content: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          business_id: string
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          business_id?: string
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_usage: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          notified_100_percent: boolean | null
          notified_150_percent: boolean | null
          notified_80_percent: boolean | null
          period_end: string
          period_start: string
          sms_limit: number
          sms_received: number | null
          sms_sent: number | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          notified_100_percent?: boolean | null
          notified_150_percent?: boolean | null
          notified_80_percent?: boolean | null
          period_end: string
          period_start: string
          sms_limit: number
          sms_received?: number | null
          sms_sent?: number | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          notified_100_percent?: boolean | null
          notified_150_percent?: boolean | null
          notified_80_percent?: boolean | null
          period_end?: string
          period_start?: string
          sms_limit?: number
          sms_received?: number | null
          sms_sent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_metrics: {
        Row: {
          call_booked_at: string | null
          call_completed_at: string | null
          closed_at: string | null
          contact_id: string
          created_at: string | null
          first_reply_at: string | null
          first_text_sent_at: string | null
          first_text_to_reply_seconds: number | null
          form_submitted_at: string | null
          form_to_first_text_seconds: number | null
          id: string
          met_30_minute_booking_target: boolean | null
          met_5_minute_reply_target: boolean | null
          met_60_second_target: boolean | null
          qualified_at: string | null
          qualified_to_booked_seconds: number | null
          reply_to_booked_seconds: number | null
          reply_to_qualified_seconds: number | null
        }
        Insert: {
          call_booked_at?: string | null
          call_completed_at?: string | null
          closed_at?: string | null
          contact_id: string
          created_at?: string | null
          first_reply_at?: string | null
          first_text_sent_at?: string | null
          first_text_to_reply_seconds?: number | null
          form_submitted_at?: string | null
          form_to_first_text_seconds?: number | null
          id?: string
          met_30_minute_booking_target?: boolean | null
          met_5_minute_reply_target?: boolean | null
          met_60_second_target?: boolean | null
          qualified_at?: string | null
          qualified_to_booked_seconds?: number | null
          reply_to_booked_seconds?: number | null
          reply_to_qualified_seconds?: number | null
        }
        Update: {
          call_booked_at?: string | null
          call_completed_at?: string | null
          closed_at?: string | null
          contact_id?: string
          created_at?: string | null
          first_reply_at?: string | null
          first_text_sent_at?: string | null
          first_text_to_reply_seconds?: number | null
          form_submitted_at?: string | null
          form_to_first_text_seconds?: number | null
          id?: string
          met_30_minute_booking_target?: boolean | null
          met_5_minute_reply_target?: boolean | null
          met_60_second_target?: boolean | null
          qualified_at?: string | null
          qualified_to_booked_seconds?: number | null
          reply_to_booked_seconds?: number | null
          reply_to_qualified_seconds?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "speed_metrics_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          ai_summary: Json | null
          assigned_at: string | null
          assigned_to: string | null
          business_name: string | null
          category: string | null
          conversation_context: Json | null
          created_at: string | null
          crm_account_id: string | null
          description: string
          id: string
          page_context: string | null
          priority: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          subject: string
          ticket_number: string
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          ai_summary?: Json | null
          assigned_at?: string | null
          assigned_to?: string | null
          business_name?: string | null
          category?: string | null
          conversation_context?: Json | null
          created_at?: string | null
          crm_account_id?: string | null
          description: string
          id?: string
          page_context?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          subject: string
          ticket_number: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          ai_summary?: Json | null
          assigned_at?: string | null
          assigned_to?: string | null
          business_name?: string | null
          category?: string | null
          conversation_context?: Json | null
          created_at?: string | null
          crm_account_id?: string | null
          description?: string
          id?: string
          page_context?: string | null
          priority?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          subject?: string
          ticket_number?: string
          updated_at?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppression_list: {
        Row: {
          added_at: string | null
          added_by: string | null
          id: string
          phone: string
          reason: string
          source: string | null
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          phone: string
          reason: string
          source?: string | null
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          id?: string
          phone?: string
          reason?: string
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppression_list_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          access_token: string
          additional_comments: string | null
          business_id: string
          communication_rating: number | null
          completed_at: string | null
          created_at: string | null
          customer_id: string
          google_review_clicked: boolean | null
          google_review_prompted: boolean | null
          id: string
          job_id: string | null
          nps_score: number | null
          overall_rating: number | null
          sent_at: string | null
          sent_via: string | null
          service_quality: number | null
          status: string | null
          technician_rating: number | null
          value_rating: number | null
          what_could_improve: string | null
          what_went_well: string | null
        }
        Insert: {
          access_token: string
          additional_comments?: string | null
          business_id: string
          communication_rating?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id: string
          google_review_clicked?: boolean | null
          google_review_prompted?: boolean | null
          id?: string
          job_id?: string | null
          nps_score?: number | null
          overall_rating?: number | null
          sent_at?: string | null
          sent_via?: string | null
          service_quality?: number | null
          status?: string | null
          technician_rating?: number | null
          value_rating?: number | null
          what_could_improve?: string | null
          what_went_well?: string | null
        }
        Update: {
          access_token?: string
          additional_comments?: string | null
          business_id?: string
          communication_rating?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string
          google_review_clicked?: boolean | null
          google_review_prompted?: boolean | null
          id?: string
          job_id?: string | null
          nps_score?: number | null
          overall_rating?: number | null
          sent_at?: string | null
          sent_via?: string | null
          service_quality?: number | null
          status?: string | null
          technician_rating?: number | null
          value_rating?: number | null
          what_could_improve?: string | null
          what_went_well?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      tc_leads: {
        Row: {
          address: string | null
          agent_id: string
          assigned_at: string | null
          assigned_by: string | null
          batch_upload_id: string | null
          city: string | null
          company_name: string
          contact_count: number | null
          contact_name: string
          converted_at: string | null
          created_at: string | null
          crm_account_id: string | null
          current_crm: string | null
          current_website: string | null
          deleted_at: string | null
          email: string | null
          employee_count: string | null
          estimated_value: number | null
          id: string
          interested_in: string[] | null
          last_contact_at: string | null
          next_followup_at: string | null
          notes: string | null
          phone: string | null
          preferred_plan: string | null
          source: string | null
          source_details: string | null
          state: string | null
          status: string | null
          trade_type: string | null
          updated_at: string | null
          web_customer_id: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          agent_id: string
          assigned_at?: string | null
          assigned_by?: string | null
          batch_upload_id?: string | null
          city?: string | null
          company_name: string
          contact_count?: number | null
          contact_name: string
          converted_at?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          current_crm?: string | null
          current_website?: string | null
          deleted_at?: string | null
          email?: string | null
          employee_count?: string | null
          estimated_value?: number | null
          id?: string
          interested_in?: string[] | null
          last_contact_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_plan?: string | null
          source?: string | null
          source_details?: string | null
          state?: string | null
          status?: string | null
          trade_type?: string | null
          updated_at?: string | null
          web_customer_id?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string
          assigned_at?: string | null
          assigned_by?: string | null
          batch_upload_id?: string | null
          city?: string | null
          company_name?: string
          contact_count?: number | null
          contact_name?: string
          converted_at?: string | null
          created_at?: string | null
          crm_account_id?: string | null
          current_crm?: string | null
          current_website?: string | null
          deleted_at?: string | null
          email?: string | null
          employee_count?: string | null
          estimated_value?: number | null
          id?: string
          interested_in?: string[] | null
          last_contact_at?: string | null
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          preferred_plan?: string | null
          source?: string | null
          source_details?: string | null
          state?: string | null
          status?: string | null
          trade_type?: string | null
          updated_at?: string | null
          web_customer_id?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tc_leads_batch"
            columns: ["batch_upload_id"]
            isOneToOne: false
            referencedRelation: "lead_batch_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tc_leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tc_leads_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tc_leads_crm_account_id_fkey"
            columns: ["crm_account_id"]
            isOneToOne: false
            referencedRelation: "crm_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tc_leads_web_customer_id_fkey"
            columns: ["web_customer_id"]
            isOneToOne: false
            referencedRelation: "web_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          business_id: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          business_id: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: string
          status?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          business_id?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_daily_metrics: {
        Row: {
          avg_response_time_minutes: number | null
          business_id: string
          callbacks: number | null
          created_at: string | null
          id: string
          jobs_completed: number | null
          jobs_scheduled: number | null
          metric_date: string
          revenue_generated: number | null
          total_drive_time_minutes: number | null
          total_job_time_minutes: number | null
          total_miles: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_response_time_minutes?: number | null
          business_id: string
          callbacks?: number | null
          created_at?: string | null
          id?: string
          jobs_completed?: number | null
          jobs_scheduled?: number | null
          metric_date: string
          revenue_generated?: number | null
          total_drive_time_minutes?: number | null
          total_job_time_minutes?: number | null
          total_miles?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_response_time_minutes?: number | null
          business_id?: string
          callbacks?: number | null
          created_at?: string | null
          id?: string
          jobs_completed?: number | null
          jobs_scheduled?: number | null
          metric_date?: string
          revenue_generated?: number | null
          total_drive_time_minutes?: number | null
          total_job_time_minutes?: number | null
          total_miles?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_daily_metrics_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_daily_metrics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_locations: {
        Row: {
          address: string | null
          city: string | null
          current_job_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          current_job_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          current_job_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_locations_current_job_id_fkey"
            columns: ["current_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technician_locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      technician_schedules: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          end_date: string | null
          end_time: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          schedule_type: string
          start_date: string | null
          start_time: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          schedule_type: string
          start_date?: string | null
          start_time?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          end_date?: string | null
          end_time?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          schedule_type?: string
          start_date?: string | null
          start_time?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technician_schedules_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      text_widget_clicks: {
        Row: {
          button_location: string | null
          clicked_at: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          page_url: string
          user_agent: string | null
        }
        Insert: {
          button_location?: string | null
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          page_url: string
          user_agent?: string | null
        }
        Update: {
          button_location?: string | null
          clicked_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          page_url?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "text_widget_clicks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "outreach_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          attachments: Json | null
          created_at: string | null
          id: string
          is_internal: boolean | null
          message: string
          sender_id: string | null
          sender_name: string | null
          sender_type: string
          ticket_id: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type: string
          ticket_id: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          id?: string
          is_internal?: boolean | null
          message?: string
          sender_id?: string | null
          sender_name?: string | null
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          clock_in_at: string
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_out_at: string | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          created_at: string | null
          duration_minutes: number | null
          entry_type: string | null
          id: string
          job_id: string | null
          notes: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          clock_in_at: string
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out_at?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          entry_type?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          clock_in_at?: string
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_out_at?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          created_at?: string | null
          duration_minutes?: number | null
          entry_type?: string | null
          id?: string
          job_id?: string | null
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheet_summaries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string | null
          id: string
          overtime_hours: number | null
          regular_hours: number | null
          status: string | null
          submitted_at: string | null
          total_hours: number | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string | null
          id?: string
          overtime_hours?: number | null
          regular_hours?: number | null
          status?: string | null
          submitted_at?: string | null
          total_hours?: number | null
          user_id: string
          week_end_date: string
          week_start_date: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string | null
          id?: string
          overtime_hours?: number | null
          regular_hours?: number | null
          status?: string | null
          submitted_at?: string | null
          total_hours?: number | null
          user_id?: string
          week_end_date?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_summaries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_summaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheet_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_devices: {
        Row: {
          created_at: string | null
          device_fingerprint: string
          device_name: string | null
          device_type: string | null
          id: string
          last_used_at: string | null
          trust_expires_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_fingerprint: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          trust_expires_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_fingerprint?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          last_used_at?: string | null
          trust_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trusted_devices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      two_factor_attempts: {
        Row: {
          code_hash: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          method: string
          success: boolean | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          code_hash?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          method: string
          success?: boolean | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          method?: string
          success?: boolean | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_pins: {
        Row: {
          auto_lock_minutes: number | null
          created_at: string | null
          failed_attempts: number | null
          id: string
          is_enabled: boolean | null
          last_used_at: string | null
          locked_until: string | null
          pin_hash: string
          require_pin_for: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auto_lock_minutes?: number | null
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          locked_until?: string | null
          pin_hash: string
          require_pin_for?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auto_lock_minutes?: number | null
          created_at?: string | null
          failed_attempts?: number | null
          id?: string
          is_enabled?: boolean | null
          last_used_at?: string | null
          locked_until?: string | null
          pin_hash?: string
          require_pin_for?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string | null
          device_name: string | null
          device_type: string | null
          ended_reason: string | null
          expires_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          is_current: boolean | null
          last_active_at: string | null
          os: string | null
          revoked_at: string | null
          session_token_hash: string
          two_factor_verified: boolean | null
          two_factor_verified_at: string | null
          user_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_name?: string | null
          device_type?: string | null
          ended_reason?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_current?: boolean | null
          last_active_at?: string | null
          os?: string | null
          revoked_at?: string | null
          session_token_hash: string
          two_factor_verified?: boolean | null
          two_factor_verified_at?: string | null
          user_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          device_name?: string | null
          device_type?: string | null
          ended_reason?: string | null
          expires_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          is_current?: boolean | null
          last_active_at?: string | null
          os?: string | null
          revoked_at?: string | null
          session_token_hash?: string
          two_factor_verified?: boolean | null
          two_factor_verified_at?: string | null
          user_id?: string
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
      user_skills: {
        Row: {
          certification_expires_at: string | null
          certification_number: string | null
          certified_at: string | null
          created_at: string | null
          id: string
          is_verified: boolean | null
          proficiency_level: number | null
          skill_id: string
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          certification_expires_at?: string | null
          certification_number?: string | null
          certified_at?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          proficiency_level?: number | null
          skill_id: string
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          certification_expires_at?: string | null
          certification_number?: string | null
          certified_at?: string | null
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          proficiency_level?: number | null
          skill_id?: string
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skill_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_skills_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_two_factor: {
        Row: {
          backup_codes: Json | null
          backup_codes_generated_at: string | null
          created_at: string | null
          email_enabled: boolean | null
          email_enabled_at: string | null
          email_verified: boolean | null
          id: string
          is_enabled: boolean | null
          preferred_method: string | null
          sms_enabled: boolean | null
          sms_enabled_at: string | null
          sms_phone: string | null
          sms_verified: boolean | null
          totp_enabled_at: string | null
          totp_secret: string | null
          totp_verified: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: Json | null
          backup_codes_generated_at?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          email_enabled_at?: string | null
          email_verified?: boolean | null
          id?: string
          is_enabled?: boolean | null
          preferred_method?: string | null
          sms_enabled?: boolean | null
          sms_enabled_at?: string | null
          sms_phone?: string | null
          sms_verified?: boolean | null
          totp_enabled_at?: string | null
          totp_secret?: string | null
          totp_verified?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: Json | null
          backup_codes_generated_at?: string | null
          created_at?: string | null
          email_enabled?: boolean | null
          email_enabled_at?: string | null
          email_verified?: boolean | null
          id?: string
          is_enabled?: boolean | null
          preferred_method?: string | null
          sms_enabled?: boolean | null
          sms_enabled_at?: string | null
          sms_phone?: string | null
          sms_verified?: boolean | null
          totp_enabled_at?: string | null
          totp_secret?: string | null
          totp_verified?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_two_factor_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          accepted_at: string | null
          auth_user_id: string | null
          avatar_url: string | null
          business_id: string | null
          color: string | null
          created_at: string | null
          email: string
          failed_login_attempts: number | null
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          id: string
          invite_token: string | null
          invited_at: string | null
          invited_by: string | null
          locked_until: string | null
          must_change_password: boolean | null
          name: string
          notification_settings: Json | null
          password_changed_at: string | null
          password_expires_at: string | null
          phone: string | null
          role: string
          shared_calendar_user_id: string | null
          status: string | null
          updated_at: string | null
          user_type: string | null
          vehicle_type: string | null
        }
        Insert: {
          accepted_at?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          business_id?: string | null
          color?: string | null
          created_at?: string | null
          email: string
          failed_login_attempts?: number | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          locked_until?: string | null
          must_change_password?: boolean | null
          name: string
          notification_settings?: Json | null
          password_changed_at?: string | null
          password_expires_at?: string | null
          phone?: string | null
          role?: string
          shared_calendar_user_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_type?: string | null
          vehicle_type?: string | null
        }
        Update: {
          accepted_at?: string | null
          auth_user_id?: string | null
          avatar_url?: string | null
          business_id?: string | null
          color?: string | null
          created_at?: string | null
          email?: string
          failed_login_attempts?: number | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          invited_by?: string | null
          locked_until?: string | null
          must_change_password?: boolean | null
          name?: string
          notification_settings?: Json | null
          password_changed_at?: string | null
          password_expires_at?: string | null
          phone?: string | null
          role?: string
          shared_calendar_user_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_type?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_users_invited_by"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_users_shared_calendar"
            columns: ["shared_calendar_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      warranties: {
        Row: {
          business_id: string
          coverage_details: string | null
          created_at: string | null
          customer_id: string
          description: string | null
          document_id: string | null
          end_date: string
          equipment_id: string | null
          exclusions: string | null
          id: string
          job_id: string | null
          name: string
          notes: string | null
          portal_visible: boolean | null
          provider_email: string | null
          provider_name: string | null
          provider_phone: string | null
          reminder_days: number | null
          reminder_sent: boolean | null
          start_date: string
          status: string | null
          updated_at: string | null
          warranty_number: string | null
          warranty_type: string
        }
        Insert: {
          business_id: string
          coverage_details?: string | null
          created_at?: string | null
          customer_id: string
          description?: string | null
          document_id?: string | null
          end_date: string
          equipment_id?: string | null
          exclusions?: string | null
          id?: string
          job_id?: string | null
          name: string
          notes?: string | null
          portal_visible?: boolean | null
          provider_email?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          reminder_days?: number | null
          reminder_sent?: boolean | null
          start_date: string
          status?: string | null
          updated_at?: string | null
          warranty_number?: string | null
          warranty_type: string
        }
        Update: {
          business_id?: string
          coverage_details?: string | null
          created_at?: string | null
          customer_id?: string
          description?: string | null
          document_id?: string | null
          end_date?: string
          equipment_id?: string | null
          exclusions?: string | null
          id?: string
          job_id?: string | null
          name?: string
          notes?: string | null
          portal_visible?: boolean | null
          provider_email?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          reminder_days?: number | null
          reminder_sent?: boolean | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
          warranty_number?: string | null
          warranty_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_warranties_document"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "customer_equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranties_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      warranty_claims: {
        Row: {
          claim_date: string
          claim_description: string | null
          claim_reason: string
          created_at: string | null
          id: string
          repair_job_id: string | null
          resolution: string | null
          resolution_date: string | null
          status: string | null
          updated_at: string | null
          warranty_id: string
        }
        Insert: {
          claim_date: string
          claim_description?: string | null
          claim_reason: string
          created_at?: string | null
          id?: string
          repair_job_id?: string | null
          resolution?: string | null
          resolution_date?: string | null
          status?: string | null
          updated_at?: string | null
          warranty_id: string
        }
        Update: {
          claim_date?: string
          claim_description?: string | null
          claim_reason?: string
          created_at?: string | null
          id?: string
          repair_job_id?: string | null
          resolution?: string | null
          resolution_date?: string | null
          status?: string | null
          updated_at?: string | null
          warranty_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_claims_repair_job_id_fkey"
            columns: ["repair_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warranty_claims_warranty_id_fkey"
            columns: ["warranty_id"]
            isOneToOne: false
            referencedRelation: "warranties"
            referencedColumns: ["id"]
          },
        ]
      }
      web_customers: {
        Row: {
          address: string | null
          agent_id: string | null
          billing_interval: string
          business_name: string
          cancelled_at: string | null
          city: string | null
          company_sale: boolean | null
          contact_name: string
          created_at: string | null
          crm_coupon_id: string | null
          crm_coupon_issued: boolean | null
          custom_quote_amount: number | null
          custom_quote_notes: string | null
          deleted_at: string | null
          email: string
          extra_locations: number | null
          id: string
          lead_id: string | null
          monthly_amount: number
          phone: string | null
          plan_type: string
          plan_version: string | null
          state: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          billing_interval?: string
          business_name: string
          cancelled_at?: string | null
          city?: string | null
          company_sale?: boolean | null
          contact_name: string
          created_at?: string | null
          crm_coupon_id?: string | null
          crm_coupon_issued?: boolean | null
          custom_quote_amount?: number | null
          custom_quote_notes?: string | null
          deleted_at?: string | null
          email: string
          extra_locations?: number | null
          id?: string
          lead_id?: string | null
          monthly_amount: number
          phone?: string | null
          plan_type: string
          plan_version?: string | null
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          billing_interval?: string
          business_name?: string
          cancelled_at?: string | null
          city?: string | null
          company_sale?: boolean | null
          contact_name?: string
          created_at?: string | null
          crm_coupon_id?: string | null
          crm_coupon_issued?: boolean | null
          custom_quote_amount?: number | null
          custom_quote_notes?: string | null
          deleted_at?: string | null
          email?: string
          extra_locations?: number | null
          id?: string
          lead_id?: string | null
          monthly_amount?: number
          phone?: string | null
          plan_type?: string
          plan_version?: string | null
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_web_customers_lead"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "tc_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_customers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          delivered_at: string | null
          endpoint_id: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          response_time_ms: number | null
          retry_count: number | null
          success: boolean | null
        }
        Insert: {
          delivered_at?: string | null
          endpoint_id: string
          error_message?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          retry_count?: number | null
          success?: boolean | null
        }
        Update: {
          delivered_at?: string | null
          endpoint_id?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          retry_count?: number | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          created_by: string | null
          event_call_completed: boolean | null
          event_call_scheduled: boolean | null
          event_deal_closed: boolean | null
          event_new_lead: boolean | null
          event_opt_out: boolean | null
          event_qualified: boolean | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_error: string | null
          last_success_at: string | null
          last_triggered_at: string | null
          name: string | null
          retry_count: number | null
          secret_key: string | null
          timeout_seconds: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          event_call_completed?: boolean | null
          event_call_scheduled?: boolean | null
          event_deal_closed?: boolean | null
          event_new_lead?: boolean | null
          event_opt_out?: boolean | null
          event_qualified?: boolean | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          name?: string | null
          retry_count?: number | null
          secret_key?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          event_call_completed?: boolean | null
          event_call_scheduled?: boolean | null
          event_deal_closed?: boolean | null
          event_new_lead?: boolean | null
          event_opt_out?: boolean | null
          event_qualified?: boolean | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_success_at?: string | null
          last_triggered_at?: string | null
          name?: string | null
          retry_count?: number | null
          secret_key?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      working_hours: {
        Row: {
          business_id: string
          created_at: string | null
          day_of_week: number
          end_time: string | null
          id: string
          is_working_day: boolean | null
          start_time: string | null
          user_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string | null
          day_of_week: number
          end_time?: string | null
          id?: string
          is_working_day?: boolean | null
          start_time?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string | null
          id?: string
          is_working_day?: boolean | null
          start_time?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "working_hours_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "working_hours_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      business_revenue_stats: {
        Row: {
          business_id: string | null
          invoice_count: number | null
          month: string | null
          total_collected: number | null
          total_invoiced: number | null
          total_outstanding: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_equipment_conditions: {
        Row: {
          avg_confidence: number | null
          brand: string | null
          condition: string | null
          config_id: string | null
          count: number | null
          equipment_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_photo_analysis_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_handoff_trends: {
        Row: {
          config_id: string | null
          count: number | null
          customer_mood: string | null
          date: string | null
          urgency_level: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_conversations_v2_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_insights_summary: {
        Row: {
          avg_lead_quality: string | null
          avg_sentiment: string | null
          config_id: string | null
          conversations_analyzed: number | null
          conversion_trend: string | null
          generated_at: string | null
          insight_count: number | null
          period_end: string | null
          period_start: string | null
        }
        Insert: {
          avg_lead_quality?: never
          avg_sentiment?: never
          config_id?: string | null
          conversations_analyzed?: number | null
          conversion_trend?: never
          generated_at?: string | null
          insight_count?: never
          period_end?: string | null
          period_start?: string | null
        }
        Update: {
          avg_lead_quality?: never
          avg_sentiment?: never
          config_id?: string | null
          conversations_analyzed?: number | null
          conversion_trend?: never
          generated_at?: string | null
          insight_count?: never
          period_end?: string | null
          period_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_insights_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_lead_quality_stats: {
        Row: {
          analysis_date: string | null
          config_id: string | null
          count: number | null
          lead_quality: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_conversation_analysis_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_note_type_stats: {
        Row: {
          avg_confidence: number | null
          config_id: string | null
          count: number | null
          note_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nevermiss_conversations_v2_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_photo_category_stats: {
        Row: {
          avg_confidence: number | null
          category: string | null
          config_id: string | null
          count: number | null
          date: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_photo_analysis_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_photo_urgency_stats: {
        Row: {
          config_id: string | null
          count: number | null
          date: string | null
          urgency: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_photo_analysis_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_sandbox_results: {
        Row: {
          config_id: string | null
          created_at: string | null
          info_gathering: string | null
          persona: string | null
          response_quality: string | null
          scenario_completed: boolean | null
          score: number | null
          service_type: string | null
          turns_used: number | null
        }
        Insert: {
          config_id?: string | null
          created_at?: string | null
          info_gathering?: never
          persona?: never
          response_quality?: never
          scenario_completed?: boolean | null
          score?: never
          service_type?: never
          turns_used?: number | null
        }
        Update: {
          config_id?: string | null
          created_at?: string | null
          info_gathering?: never
          persona?: never
          response_quality?: never
          scenario_completed?: boolean | null
          score?: never
          service_type?: never
          turns_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_sandbox_tests_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_sentiment_stats: {
        Row: {
          analysis_date: string | null
          config_id: string | null
          count: number | null
          customer_sentiment: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_conversation_analysis_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captain_urgent_photos: {
        Row: {
          category: string | null
          config_id: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          recommended_actions: Json | null
          safety_warnings: Json | null
          summary: string | null
          urgency: string | null
        }
        Insert: {
          category?: string | null
          config_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          recommended_actions?: Json | null
          safety_warnings?: Json | null
          summary?: string | null
          urgency?: string | null
        }
        Update: {
          category?: string | null
          config_id?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          recommended_actions?: Json | null
          safety_warnings?: Json | null
          summary?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captain_photo_analysis_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_config"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_captain_photo_analysis_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "leads_captain_conversations_v2"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_user_business_id: { Args: never; Returns: string }
      cancel_pending_followups: {
        Args: { p_entity_id: string; p_entity_type: string; p_reason: string }
        Returns: undefined
      }
      check_duplicate_events: {
        Args: {
          p_business_id: string
          p_end_time: string
          p_resource_id?: string
          p_start_time: string
        }
        Returns: {
          end_time: string
          id: string
          start_time: string
          title: string
        }[]
      }
      cleanup_expired_2fa_attempts: { Args: never; Returns: undefined }
      cleanup_expired_geocode_cache: { Args: never; Returns: number }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_old_slot_holds: { Args: { days_old?: number }; Returns: number }
      expire_stale_slot_holds: { Args: never; Returns: number }
      generate_booking_slug: {
        Args: { business_name: string }
        Returns: string
      }
      generate_recurring_jobs: { Args: never; Returns: number }
      get_auth_business_id: { Args: never; Returns: string }
      get_current_commission_rates: {
        Args: never
        Returns: {
          rate_percentage: number
          rate_type: string
        }[]
      }
      get_daily_route_summaries_for_business: {
        Args: {
          p_business_id: string
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          arrival_pings_count: number
          first_stop_time: string
          jobs_completed: number
          last_stop_time: string
          summary_date: string
          total_drive_minutes: number
          total_miles: number
          user_id: string
          user_name: string
        }[]
      }
      get_photo_analysis_stats: {
        Args: { p_config_id: string; p_days?: number }
        Returns: {
          avg_confidence: number
          critical_count: number
          high_count: number
          low_count: number
          medium_count: number
          top_category: string
          top_service_type: string
          total_photos: number
        }[]
      }
      get_retention_bonuses: {
        Args: never
        Returns: {
          bonus_amount_cents: number
          milestone: string
          requirement: string
        }[]
      }
      get_sms_limit_for_business: {
        Args: { p_business_id: string }
        Returns: number
      }
      get_sms_status_priority: { Args: { p_status: string }; Returns: number }
      get_technician_availability: {
        Args: { p_date: string; p_user_id: string }
        Returns: {
          available: boolean
          end_time: string
          reason: string
          start_time: string
        }[]
      }
      get_user_business_id: { Args: never; Returns: string }
      get_user_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      has_active_leads_captain_addon: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      increment: {
        Args: {
          amount: number
          col_name: string
          row_id: string
          table_name: string
        }
        Returns: undefined
      }
      increment_ai_response_count: {
        Args: { conversation_id: string }
        Returns: undefined
      }
      increment_contact_count: {
        Args: { campaign_id: string }
        Returns: undefined
      }
      increment_promotion_uses: {
        Args: { promotion_id: string }
        Returns: undefined
      }
      jsonb_set_key: {
        Args: { key: string; target: Json; value: Json }
        Returns: Json
      }
      lookup_customer_by_phone: {
        Args: { p_business_id: string; p_phone: string }
        Returns: {
          email: string
          id: string
          name: string
          phone: string
        }[]
      }
      seed_nevermiss_intents: {
        Args: { p_config_id: string }
        Returns: undefined
      }
      seed_nevermiss_rules: {
        Args: { p_config_id: string }
        Returns: undefined
      }
      seed_nevermiss_templates: {
        Args: { p_config_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_message_status: {
        Args: {
          p_error_code?: string
          p_new_status: string
          p_twilio_sid: string
        }
        Returns: boolean
      }
      upsert_sms_usage:
        | {
            Args: {
              p_business_id: string
              p_cost: number
              p_message_count: number
              p_segment_count: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_business_id: string
              p_field: string
              p_period_end: string
              p_period_start: string
              p_sms_limit: number
            }
            Returns: undefined
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
    Enums: {},
  },
} as const
