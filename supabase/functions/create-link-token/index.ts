import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plaid environment - use 'sandbox' for testing, 'development' or 'production' for live
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
    console.log("Creating Plaid link token...");

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
    console.log("Creating link token for user:", user.id);

    // Get Plaid credentials
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SECRET");

    if (!plaidClientId || !plaidSecret) {
      console.error("Plaid credentials not configured");
      throw new Error("Plaid credentials not configured");
    }

    // Get the webhook URL for this project
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const webhookUrl = `${supabaseUrl}/functions/v1/plaid-webhook`;
    
    console.log("Using webhook URL:", webhookUrl);

    // Create Plaid link token
    const plaidResponse = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        user: {
          client_user_id: user.id, // Use Supabase user ID
        },
        client_name: "WealthPlan Pro",
        products: ["auth", "transactions", "investments", "liabilities"],
        country_codes: ["US"],
        language: "en",
        redirect_uri: "https://joyful-savings-dash.lovable.app",
        webhook: webhookUrl,
      }),
    });

    if (!plaidResponse.ok) {
      const errorData = await plaidResponse.json();
      console.error("Plaid API error:", errorData);
      throw new Error(errorData.error_message || "Failed to create link token");
    }

    const plaidData = await plaidResponse.json();
    console.log("Link token created successfully");

    return new Response(
      JSON.stringify({ 
        link_token: plaidData.link_token,
        expiration: plaidData.expiration,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating link token:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
