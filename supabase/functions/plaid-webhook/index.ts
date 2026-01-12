import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, plaid-verification",
};

// Plaid environment
type PlaidEnv = "sandbox" | "development" | "production";
const PLAID_ENV = "sandbox" as PlaidEnv;
const PLAID_BASE_URL = PLAID_ENV === "production" 
  ? "https://production.plaid.com" 
  : PLAID_ENV === "development"
  ? "https://development.plaid.com"
  : "https://sandbox.plaid.com";

// Cache for Plaid verification keys
const keyCache = new Map<string, jose.KeyLike>();

// Verify Plaid webhook signature
async function verifyPlaidWebhook(
  body: string,
  signedJwt: string,
  plaidClientId: string,
  plaidSecret: string
): Promise<boolean> {
  try {
    // Decode JWT header to get key ID
    const protectedHeader = jose.decodeProtectedHeader(signedJwt);
    const keyId = protectedHeader.kid;

    if (!keyId) {
      console.error("No key ID in JWT header");
      return false;
    }

    // Get key from cache or fetch from Plaid
    let verificationKey = keyCache.get(keyId);
    
    if (!verificationKey) {
      console.log("Fetching verification key from Plaid:", keyId);
      const keyResponse = await fetch(`${PLAID_BASE_URL}/webhook_verification_key/get`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: plaidClientId,
          secret: plaidSecret,
          key_id: keyId,
        }),
      });

      if (!keyResponse.ok) {
        const errorData = await keyResponse.json();
        console.error("Failed to fetch verification key:", errorData);
        return false;
      }

      const keyData = await keyResponse.json();
      const importedKey = await jose.importJWK(keyData.key, "RS256");
      
      // Type guard: jose.importJWK can return KeyLike or Uint8Array
      if (importedKey instanceof Uint8Array) {
        console.error("Unexpected key type: Uint8Array");
        return false;
      }
      
      verificationKey = importedKey;
      keyCache.set(keyId, verificationKey);
    }

    // Verify JWT with 5-minute max age
    const { payload } = await jose.jwtVerify(signedJwt, verificationKey, {
      maxTokenAge: "5 min",
    });

    // Verify body hash
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const bodyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const claimedHash = payload.request_body_sha256 as string;
    
    if (bodyHash !== claimedHash) {
      console.error("Body hash mismatch");
      return false;
    }

    console.log("Webhook signature verified successfully");
    return true;
  } catch (error) {
    console.error("Webhook verification failed:", error);
    return false;
  }
}

// Fetch latest balances from Plaid
async function fetchBalances(
  accessToken: string,
  plaidClientId: string,
  plaidSecret: string
): Promise<{ accounts: Array<{ account_id: string; balances: { current: number } }> } | null> {
  try {
    const response = await fetch(`${PLAID_BASE_URL}/accounts/balance/get`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: plaidClientId,
        secret: plaidSecret,
        access_token: accessToken,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to fetch balances:", errorData);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching balances:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Received Plaid webhook");

    // Get Plaid credentials
    const plaidClientId = Deno.env.get("PLAID_CLIENT_ID");
    const plaidSecret = Deno.env.get("PLAID_SECRET");

    if (!plaidClientId || !plaidSecret) {
      console.error("Plaid credentials not configured");
      return new Response(
        JSON.stringify({ error: "Plaid credentials not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Get raw body for verification
    const body = await req.text();
    
    // Verify webhook signature
    const signedJwt = req.headers.get("plaid-verification");
    if (signedJwt) {
      const isValid = await verifyPlaidWebhook(body, signedJwt, plaidClientId, plaidSecret);
      if (!isValid) {
        console.error("Invalid webhook signature");
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
    } else {
      // In sandbox mode, Plaid may not send verification header
      console.warn("No plaid-verification header - accepting in sandbox mode");
    }

    // Parse webhook payload
    const payload = JSON.parse(body);
    const { webhook_type, webhook_code, item_id } = payload;

    console.log(`Webhook received: ${webhook_type} - ${webhook_code} for item ${item_id}`);

    // Only process transaction webhooks for balance updates
    if (webhook_type !== "TRANSACTIONS") {
      console.log("Ignoring non-transaction webhook");
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Process DEFAULT_UPDATE or HISTORICAL_UPDATE
    if (webhook_code !== "DEFAULT_UPDATE" && webhook_code !== "HISTORICAL_UPDATE" && webhook_code !== "SYNC_UPDATES_AVAILABLE") {
      console.log(`Ignoring webhook code: ${webhook_code}`);
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Use service role client to access secure tables
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get access token from secure plaid_tokens table
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from("plaid_tokens")
      .select("access_token")
      .eq("plaid_item_id", item_id)
      .single();

    if (tokenError || !tokenRecord) {
      console.log("No token found for item:", item_id);
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const accessToken = tokenRecord.access_token;

    // Fetch latest balances from Plaid
    const balanceData = await fetchBalances(accessToken, plaidClientId, plaidSecret);
    
    if (!balanceData) {
      console.error("Failed to fetch balances from Plaid");
      return new Response(
        JSON.stringify({ error: "Failed to fetch balances" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log(`Updating balances for ${balanceData.accounts.length} accounts`);

    // Update each account's balance
    let updatedCount = 0;
    for (const plaidAccount of balanceData.accounts) {
      const { error: updateError } = await supabaseAdmin
        .from("accounts")
        .update({
          current_balance: plaidAccount.balances.current || 0,
          last_synced_at: new Date().toISOString(),
        })
        .eq("plaid_item_id", item_id);

      if (updateError) {
        console.error("Error updating account balance:", updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`Successfully updated ${updatedCount} accounts`);

    return new Response(
      JSON.stringify({ 
        received: true, 
        updated_accounts: updatedCount 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
