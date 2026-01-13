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
      accounts: {
        Row: {
          account_mask: string | null
          account_name: string
          account_type: Database["public"]["Enums"]["account_type"]
          created_at: string
          current_balance: number
          id: string
          institution_name: string
          is_manual_entry: boolean | null
          last_synced_at: string | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_mask?: string | null
          account_name: string
          account_type: Database["public"]["Enums"]["account_type"]
          created_at?: string
          current_balance?: number
          id?: string
          institution_name: string
          is_manual_entry?: boolean | null
          last_synced_at?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_mask?: string | null
          account_name?: string
          account_type?: Database["public"]["Enums"]["account_type"]
          created_at?: string
          current_balance?: number
          id?: string
          institution_name?: string
          is_manual_entry?: boolean | null
          last_synced_at?: string | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          account_id: string
          asset_class: string
          cost_basis: number | null
          created_at: string
          id: string
          market_value: number
          quantity: number
          security_id: string | null
          security_name: string
          ticker_symbol: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          asset_class?: string
          cost_basis?: number | null
          created_at?: string
          id?: string
          market_value?: number
          quantity?: number
          security_id?: string | null
          security_name: string
          ticker_symbol?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          asset_class?: string
          cost_basis?: number | null
          created_at?: string
          id?: string
          market_value?: number
          quantity?: number
          security_id?: string | null
          security_name?: string
          ticker_symbol?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      money_flows: {
        Row: {
          account_type: string
          annual_amount: number
          contribution_name: string
          created_at: string
          end_age: number
          excess_income_enabled: boolean
          excess_save_percentage: number | null
          excess_target_account: string | null
          id: string
          income_link_percentage: number | null
          is_income_linked: boolean
          start_age: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type?: string
          annual_amount?: number
          contribution_name?: string
          created_at?: string
          end_age?: number
          excess_income_enabled?: boolean
          excess_save_percentage?: number | null
          excess_target_account?: string | null
          id?: string
          income_link_percentage?: number | null
          is_income_linked?: boolean
          start_age?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: string
          annual_amount?: number
          contribution_name?: string
          created_at?: string
          end_age?: number
          excess_income_enabled?: boolean
          excess_save_percentage?: number | null
          excess_target_account?: string | null
          id?: string
          income_link_percentage?: number | null
          is_income_linked?: boolean
          start_age?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plaid_tokens: {
        Row: {
          access_token: string
          account_id: string
          created_at: string
          id: string
          plaid_item_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          account_id: string
          created_at?: string
          id?: string
          plaid_item_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          account_id?: string
          created_at?: string
          id?: string
          plaid_item_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plaid_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          legacy_goal_amount: number | null
          mfa_enabled: boolean | null
          spouse_dob: string | null
          spouse_name: string | null
          spouse_pia: number | null
          spouse_retirement_age: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          legacy_goal_amount?: number | null
          mfa_enabled?: boolean | null
          spouse_dob?: string | null
          spouse_name?: string | null
          spouse_pia?: number | null
          spouse_retirement_age?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          legacy_goal_amount?: number | null
          mfa_enabled?: boolean | null
          spouse_dob?: string | null
          spouse_name?: string | null
          spouse_pia?: number | null
          spouse_retirement_age?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          created_at: string
          estimated_value: number
          id: string
          is_manual_entry: boolean
          mortgage_balance: number | null
          mortgage_interest_rate: number | null
          mortgage_monthly_payment: number | null
          mortgage_start_date: string | null
          mortgage_term_months: number | null
          plaid_account_id: string | null
          plaid_item_id: string | null
          property_name: string
          property_type: string
          relocation_age: number | null
          relocation_new_interest_rate: number | null
          relocation_new_mortgage_amount: number | null
          relocation_new_purchase_price: number | null
          relocation_new_term_months: number | null
          relocation_sale_price: number | null
          relocation_state: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estimated_value?: number
          id?: string
          is_manual_entry?: boolean
          mortgage_balance?: number | null
          mortgage_interest_rate?: number | null
          mortgage_monthly_payment?: number | null
          mortgage_start_date?: string | null
          mortgage_term_months?: number | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          property_name?: string
          property_type?: string
          relocation_age?: number | null
          relocation_new_interest_rate?: number | null
          relocation_new_mortgage_amount?: number | null
          relocation_new_purchase_price?: number | null
          relocation_new_term_months?: number | null
          relocation_sale_price?: number | null
          relocation_state?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estimated_value?: number
          id?: string
          is_manual_entry?: boolean
          mortgage_balance?: number | null
          mortgage_interest_rate?: number | null
          mortgage_monthly_payment?: number | null
          mortgage_start_date?: string | null
          mortgage_term_months?: number | null
          plaid_account_id?: string | null
          plaid_item_id?: string | null
          property_name?: string
          property_type?: string
          relocation_age?: number | null
          relocation_new_interest_rate?: number | null
          relocation_new_mortgage_amount?: number | null
          relocation_new_purchase_price?: number | null
          relocation_new_term_months?: number | null
          relocation_sale_price?: number | null
          relocation_state?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_assumptions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          historical_avg: number
          id: string
          last_updated_from_api: string | null
          market_sentiment: number | null
          name: string
          updated_at: string
          user_id: string
          user_optimistic: number
          user_pessimistic: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          historical_avg?: number
          id?: string
          last_updated_from_api?: string | null
          market_sentiment?: number | null
          name: string
          updated_at?: string
          user_id: string
          user_optimistic?: number
          user_pessimistic?: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          historical_avg?: number
          id?: string
          last_updated_from_api?: string | null
          market_sentiment?: number | null
          name?: string
          updated_at?: string
          user_id?: string
          user_optimistic?: number
          user_pessimistic?: number
        }
        Relationships: []
      }
      scenarios: {
        Row: {
          annual_contribution: number | null
          created_at: string
          current_age: number | null
          expected_return: number
          id: string
          inflation_rate: number
          is_active: boolean | null
          is_married: boolean | null
          monthly_retirement_spending: number | null
          primary_claiming_age: number | null
          primary_fra: number | null
          primary_life_expectancy: number | null
          primary_pia: number | null
          retirement_age: number
          scenario_name: string
          social_security_income: number | null
          spouse_claiming_age: number | null
          spouse_current_age: number | null
          spouse_fra: number | null
          spouse_life_expectancy: number | null
          spouse_pia: number | null
          updated_at: string
          user_id: string
          withdrawal_order: string[] | null
        }
        Insert: {
          annual_contribution?: number | null
          created_at?: string
          current_age?: number | null
          expected_return?: number
          id?: string
          inflation_rate?: number
          is_active?: boolean | null
          is_married?: boolean | null
          monthly_retirement_spending?: number | null
          primary_claiming_age?: number | null
          primary_fra?: number | null
          primary_life_expectancy?: number | null
          primary_pia?: number | null
          retirement_age?: number
          scenario_name?: string
          social_security_income?: number | null
          spouse_claiming_age?: number | null
          spouse_current_age?: number | null
          spouse_fra?: number | null
          spouse_life_expectancy?: number | null
          spouse_pia?: number | null
          updated_at?: string
          user_id: string
          withdrawal_order?: string[] | null
        }
        Update: {
          annual_contribution?: number | null
          created_at?: string
          current_age?: number | null
          expected_return?: number
          id?: string
          inflation_rate?: number
          is_active?: boolean | null
          is_married?: boolean | null
          monthly_retirement_spending?: number | null
          primary_claiming_age?: number | null
          primary_fra?: number | null
          primary_life_expectancy?: number | null
          primary_pia?: number | null
          retirement_age?: number
          scenario_name?: string
          social_security_income?: number | null
          spouse_claiming_age?: number | null
          spouse_current_age?: number | null
          spouse_fra?: number | null
          spouse_life_expectancy?: number | null
          spouse_pia?: number | null
          updated_at?: string
          user_id?: string
          withdrawal_order?: string[] | null
        }
        Relationships: []
      }
      state_tax_rules: {
        Row: {
          base_rate: number
          col_multiplier: number | null
          created_at: string
          id: string
          notes: string | null
          pension_exclusion_type: string | null
          property_tax_rate: number | null
          rate_type: string
          retirement_exclusion_amount: number | null
          retirement_friendliness: string | null
          social_security_taxable: boolean
          ss_exemption_threshold_joint: number | null
          state_code: string
          state_name: string
          top_marginal_rate: number | null
          updated_at: string
        }
        Insert: {
          base_rate?: number
          col_multiplier?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          pension_exclusion_type?: string | null
          property_tax_rate?: number | null
          rate_type?: string
          retirement_exclusion_amount?: number | null
          retirement_friendliness?: string | null
          social_security_taxable?: boolean
          ss_exemption_threshold_joint?: number | null
          state_code: string
          state_name: string
          top_marginal_rate?: number | null
          updated_at?: string
        }
        Update: {
          base_rate?: number
          col_multiplier?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          pension_exclusion_type?: string | null
          property_tax_rate?: number | null
          rate_type?: string
          retirement_exclusion_amount?: number | null
          retirement_friendliness?: string | null
          social_security_taxable?: boolean
          ss_exemption_threshold_joint?: number | null
          state_code?: string
          state_name?: string
          top_marginal_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      state_tax_lookup: {
        Row: {
          base_rate_type: string | null
          retirement_income_exclusion: number | null
          ss_exemption_threshold_joint: number | null
          ss_is_taxable: boolean | null
          state_code: string | null
          state_name: string | null
          top_marginal_rate: number | null
        }
        Insert: {
          base_rate_type?: never
          retirement_income_exclusion?: number | null
          ss_exemption_threshold_joint?: number | null
          ss_is_taxable?: boolean | null
          state_code?: string | null
          state_name?: string | null
          top_marginal_rate?: never
        }
        Update: {
          base_rate_type?: never
          retirement_income_exclusion?: number | null
          ss_exemption_threshold_joint?: number | null
          ss_is_taxable?: boolean | null
          state_code?: string | null
          state_name?: string | null
          top_marginal_rate?: never
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_type:
        | "401k"
        | "IRA"
        | "Brokerage"
        | "Cash"
        | "Savings"
        | "Checking"
        | "HSA"
        | "Other"
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
      account_type: [
        "401k",
        "IRA",
        "Brokerage",
        "Cash",
        "Savings",
        "Checking",
        "HSA",
        "Other",
      ],
    },
  },
} as const
