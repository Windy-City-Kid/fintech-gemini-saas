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
    console.log("Exchanging public token...");

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
    console.log("Exchanging token for user:", user.id);

    // Parse request body
    const { public_token, metadata } = await req.json();

    if (!public_token) {
      throw new Error("Missing public_token");
    }

    // Get Plaid credentials
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SECRET");

    if (!plaidClientId || !plaidSecret) {
      throw new Error("Plaid credentials not configured");
    }

    // Exchange public token for access token
    const exchangeResponse = await fetch(`${PLAID_BASE_URL}/item/public_token/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        public_token: public_token,
      }),
    });

    if (!exchangeResponse.ok) {
      const errorData = await exchangeResponse.json();
      console.error("Plaid exchange error:", errorData);
      throw new Error(errorData.error_message || "Failed to exchange token");
    }

    const exchangeData = await exchangeResponse.json();
    const accessToken = exchangeData.access_token;
    const itemId = exchangeData.item_id;
    
    console.log("Token exchanged successfully, item_id:", itemId);

    // Get account details from Plaid
    const accountsResponse = await fetch(`${PLAID_BASE_URL}/accounts/get`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token: accessToken,
      }),
    });

    if (!accountsResponse.ok) {
      const errorData = await accountsResponse.json();
      console.error("Plaid accounts error:", errorData);
      throw new Error(errorData.error_message || "Failed to fetch accounts");
    }

    const accountsData = await accountsResponse.json();
    const institution = metadata?.institution;
    
    console.log("Retrieved", accountsData.accounts.length, "accounts");

    // Use service role client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Map Plaid account types to our enum
    const mapAccountType = (plaidType: string, plaidSubtype: string): string => {
      const typeMapping: Record<string, string> = {
        'investment': 'Brokerage',
        '401k': '401k',
        '401a': '401k',
        '403b': '401k',
        'ira': 'IRA',
        'roth': 'IRA',
        'roth 401k': '401k',
        'hsa': 'HSA',
        'checking': 'Checking',
        'savings': 'Savings',
        'money market': 'Savings',
        'cd': 'Savings',
        'cash management': 'Cash',
        'paypal': 'Cash',
      };
      
      return typeMapping[plaidSubtype?.toLowerCase()] || 
             typeMapping[plaidType?.toLowerCase()] || 
             'Other';
    };

    // Save each account to database
    const savedAccounts = [];
    for (const account of accountsData.accounts) {
      const accountType = mapAccountType(account.type, account.subtype);
      
      const { data: savedAccount, error: saveError } = await supabaseAdmin
        .from('accounts')
        .insert({
          user_id: user.id,
          account_name: account.name || account.official_name || 'Unknown Account',
          institution_name: institution?.name || 'Connected Institution',
          account_type: accountType,
          current_balance: account.balances?.current || 0,
          plaid_access_token: accessToken, // Stored securely, never exposed to frontend
          plaid_item_id: itemId, // Store item_id for webhook matching
          plaid_account_id: account.account_id, // Store Plaid account ID for holdings sync
          account_mask: account.mask || null, // Store last 4 digits
          is_manual_entry: false,
          last_synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (saveError) {
        console.error("Error saving account:", saveError);
      } else {
        savedAccounts.push({
          id: savedAccount.id,
          account_name: savedAccount.account_name,
          institution_name: savedAccount.institution_name,
          account_type: savedAccount.account_type,
          current_balance: savedAccount.current_balance,
          account_mask: savedAccount.account_mask,
        });
      }
    }

    console.log("Saved", savedAccounts.length, "accounts to database");

    // Return success - NEVER include access_token in response
    return new Response(
      JSON.stringify({ 
        success: true,
        accounts_linked: savedAccounts.length,
        accounts: savedAccounts, // Safe account info only
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error exchanging token:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
