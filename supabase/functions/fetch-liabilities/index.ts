import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plaid environment
type PlaidEnv = "sandbox" | "development" | "production";
const PLAID_ENV = "sandbox" as PlaidEnv;
const PLAID_BASE_URL = PLAID_ENV === "production" 
  ? "https://production.plaid.com" 
  : PLAID_ENV === "development"
  ? "https://development.plaid.com"
  : "https://sandbox.plaid.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching liabilities...");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("User authentication failed:", userError);
      throw new Error("User not authenticated");
    }

    const user = userData.user;
    console.log("Fetching liabilities for user:", user.id);

    // Get Plaid credentials
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SECRET");

    if (!plaidClientId || !plaidSecret) {
      throw new Error("Plaid credentials not configured");
    }

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all linked accounts for this user
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('id, plaid_item_id, account_name')
      .eq('user_id', user.id)
      .eq('is_manual_entry', false)
      .not('plaid_item_id', 'is', null);

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      throw new Error("Failed to fetch linked accounts");
    }

    if (!accounts || accounts.length === 0) {
      console.log("No linked accounts found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No linked accounts",
          mortgages: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get unique plaid_item_ids
    const uniqueItemIds = [...new Set(accounts.map(a => a.plaid_item_id).filter(Boolean))];

    // Fetch access tokens from secure plaid_tokens table
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('plaid_tokens')
      .select('plaid_item_id, access_token, account_id')
      .eq('user_id', user.id)
      .in('plaid_item_id', uniqueItemIds);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      throw new Error("Failed to fetch access tokens");
    }

    if (!tokens || tokens.length === 0) {
      console.log("No access tokens found for linked accounts");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No access tokens available",
          mortgages: []
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Track processed tokens to avoid duplicate API calls
    const processedTokens = new Set<string>();
    const mortgages: Array<{
      account_id: string;
      account_number_last_4: string;
      lender_name: string;
      current_principal: number;
      interest_rate: number;
      monthly_payment: number;
      loan_term_months: number;
      origination_date: string | null;
      next_payment_due_date: string | null;
    }> = [];

    for (const tokenRecord of tokens) {
      if (!tokenRecord.access_token || processedTokens.has(tokenRecord.access_token)) {
        continue;
      }
      processedTokens.add(tokenRecord.access_token);

      try {
        // Fetch liabilities from Plaid
        const liabilitiesResponse = await fetch(`${PLAID_BASE_URL}/liabilities/get`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            access_token: tokenRecord.access_token,
          }),
        });

        if (!liabilitiesResponse.ok) {
          const errorData = await liabilitiesResponse.json();
          console.error("Plaid liabilities error for item:", tokenRecord.plaid_item_id, errorData);
          // Continue to next token - liabilities may not be available for all accounts
          continue;
        }

        const liabilitiesData = await liabilitiesResponse.json();
        console.log(`Retrieved liabilities for item ${tokenRecord.plaid_item_id}`);

        // Process mortgage accounts
        const mortgageData = liabilitiesData.liabilities?.mortgage || [];
        
        for (const mortgage of mortgageData) {
          // Find matching account
          const matchingAccount = liabilitiesData.accounts?.find(
            (acc: { account_id: string }) => acc.account_id === mortgage.account_id
          );

          mortgages.push({
            account_id: mortgage.account_id,
            account_number_last_4: matchingAccount?.mask || '',
            lender_name: matchingAccount?.name || 'Unknown Lender',
            current_principal: mortgage.current_principal_balance || mortgage.last_payment_amount * 12 * 30 || 0,
            interest_rate: mortgage.interest_rate?.percentage || 0,
            monthly_payment: mortgage.last_payment_amount || mortgage.next_monthly_payment || 0,
            loan_term_months: mortgage.loan_term ? parseInt(mortgage.loan_term) : 360,
            origination_date: mortgage.origination_date || null,
            next_payment_due_date: mortgage.next_payment_due_date || null,
          });

          // Upsert to properties table
          const { error: upsertError } = await supabaseAdmin
            .from('properties')
            .upsert({
              user_id: user.id,
              property_name: matchingAccount?.name || 'Primary Residence',
              property_type: 'primary_residence',
              mortgage_balance: mortgage.current_principal_balance || 0,
              mortgage_interest_rate: mortgage.interest_rate?.percentage || 0,
              mortgage_monthly_payment: mortgage.last_payment_amount || mortgage.next_monthly_payment || 0,
              mortgage_term_months: mortgage.loan_term ? parseInt(mortgage.loan_term) : 360,
              mortgage_start_date: mortgage.origination_date || null,
              plaid_account_id: mortgage.account_id,
              plaid_item_id: tokenRecord.plaid_item_id,
              is_manual_entry: false,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'plaid_account_id',
              ignoreDuplicates: false,
            });

          if (upsertError) {
            console.error("Error upserting property:", upsertError);
            // Try insert if upsert fails (no unique constraint on plaid_account_id)
            const { error: insertError } = await supabaseAdmin
              .from('properties')
              .insert({
                user_id: user.id,
                property_name: matchingAccount?.name || 'Primary Residence',
                property_type: 'primary_residence',
                mortgage_balance: mortgage.current_principal_balance || 0,
                mortgage_interest_rate: mortgage.interest_rate?.percentage || 0,
                mortgage_monthly_payment: mortgage.last_payment_amount || mortgage.next_monthly_payment || 0,
                mortgage_term_months: mortgage.loan_term ? parseInt(mortgage.loan_term) : 360,
                mortgage_start_date: mortgage.origination_date || null,
                plaid_account_id: mortgage.account_id,
                plaid_item_id: tokenRecord.plaid_item_id,
                is_manual_entry: false,
              });
            
            if (insertError) {
              console.error("Error inserting property:", insertError);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching liabilities for item:", tokenRecord.plaid_item_id, err);
      }
    }

    console.log(`Found ${mortgages.length} mortgage(s)`);

    return new Response(
      JSON.stringify({ 
        success: true,
        mortgages_count: mortgages.length,
        mortgages,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching liabilities:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
