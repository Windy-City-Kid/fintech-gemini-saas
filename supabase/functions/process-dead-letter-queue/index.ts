/**
 * Dead Letter Queue Processor
 * 
 * This function processes failed webhooks from the dead letter queue
 * with exponential backoff retry logic.
 * 
 * Can be invoked:
 * 1. Via scheduled cron job
 * 2. Manually for immediate retry
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Plaid configuration
type PlaidEnv = "sandbox" | "development" | "production";
const PLAID_ENV = "sandbox" as PlaidEnv;
const PLAID_BASE_URL = PLAID_ENV === "production" 
  ? "https://production.plaid.com" 
  : PLAID_ENV === "development"
  ? "https://development.plaid.com"
  : "https://sandbox.plaid.com";

const MAX_RETRY_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000;

// Type alias for Supabase client
type AdminClient = SupabaseClient;

// Initialize Supabase admin client
function getSupabaseAdmin(): AdminClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

/**
 * Fetch latest balances from Plaid
 */
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

interface DeadLetterItem {
  id: string;
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  retry_count: number;
}

/**
 * Process a single dead letter queue item
 */
async function processDeadLetterItem(
  supabaseAdmin: AdminClient,
  item: DeadLetterItem
): Promise<{ success: boolean; error?: string }> {
  const plaidClientId = Deno.env.get("PLAID_CLIENT_ID") ?? "";
  const plaidSecret = Deno.env.get("PLAID_SECRET") ?? "";

  const { id, event_id, payload, retry_count } = item;
  const { webhook_type, webhook_code, item_id } = payload;

  console.log(`🔄 Retrying event ${event_id} (attempt ${retry_count + 1})`);

  try {
    // Only process transaction webhooks
    if (webhook_type !== "TRANSACTIONS") {
      return { success: true };
    }

    if (webhook_code !== "DEFAULT_UPDATE" && 
        webhook_code !== "HISTORICAL_UPDATE" && 
        webhook_code !== "SYNC_UPDATES_AVAILABLE") {
      return { success: true };
    }

    // Get access token
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from("plaid_tokens")
      .select("access_token")
      .eq("plaid_item_id", item_id as string)
      .single();

    if (tokenError || !tokenRecord) {
      return { success: true }; // No token = nothing to process
    }

    // Fetch balances
    const balanceData = await fetchBalances(
      tokenRecord.access_token as string,
      plaidClientId,
      plaidSecret
    );

    if (!balanceData) {
      return { success: false, error: "Failed to fetch balances from Plaid" };
    }

    // Update accounts
    for (const plaidAccount of balanceData.accounts) {
      await supabaseAdmin
        .from("accounts")
        .update({
          current_balance: plaidAccount.balances.current || 0,
          last_synced_at: new Date().toISOString(),
        })
        .eq("plaid_item_id", item_id as string);
    }

    // Mark as resolved
    await supabaseAdmin
      .from("dead_letter_queue")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", id);

    // Update original event status
    await supabaseAdmin
      .from("incoming_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("event_id", event_id);

    // Log success
    await supabaseAdmin
      .from("webhook_processing_logs")
      .insert({
        event_id,
        action: "dlq_retry_success",
        details: { attemptNumber: retry_count + 1 },
      });

    console.log(`✅ Successfully processed DLQ item: ${event_id}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`❌ Failed to process DLQ item ${event_id}:`, error);

    // Update retry count and next retry time
    const newRetryCount = retry_count + 1;
    const backoffMs = BASE_BACKOFF_MS * Math.pow(2, newRetryCount);
    const nextRetryAt = new Date(Date.now() + backoffMs);

    await supabaseAdmin
      .from("dead_letter_queue")
      .update({
        retry_count: newRetryCount,
        last_attempted_at: new Date().toISOString(),
        next_retry_at: nextRetryAt.toISOString(),
        error_message: errorMessage,
        status: newRetryCount >= MAX_RETRY_ATTEMPTS ? "failed" : "pending",
      })
      .eq("id", id);

    // Log failure
    await supabaseAdmin
      .from("webhook_processing_logs")
      .insert({
        event_id,
        action: "dlq_retry_failed",
        details: {
          attemptNumber: newRetryCount,
          error: errorMessage,
          nextRetryAt: nextRetryAt.toISOString(),
        },
      });

    return { success: false, error: errorMessage };
  }
}

/**
 * Main handler
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    console.log("📬 Processing dead letter queue...");

    // Get pending items ready for retry
    const { data: pendingItems, error: fetchError } = await supabaseAdmin
      .from("dead_letter_queue")
      .select("*")
      .eq("status", "pending")
      .lte("next_retry_at", new Date().toISOString())
      .order("next_retry_at", { ascending: true })
      .limit(10); // Process 10 at a time

    if (fetchError) {
      throw new Error(`Failed to fetch DLQ items: ${fetchError.message}`);
    }

    if (!pendingItems || pendingItems.length === 0) {
      console.log("📭 No pending items in dead letter queue");
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending items" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📋 Found ${pendingItems.length} items to process`);

    let successCount = 0;
    let failureCount = 0;

    for (const item of pendingItems) {
      const dlqItem: DeadLetterItem = {
        id: item.id as string,
        event_id: item.event_id as string,
        event_type: item.event_type as string,
        payload: item.payload as Record<string, unknown>,
        retry_count: item.retry_count as number,
      };
      const result = await processDeadLetterItem(supabaseAdmin, dlqItem);
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    console.log(`✅ DLQ processing complete: ${successCount} success, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        processed: pendingItems.length,
        success: successCount,
        failed: failureCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ DLQ processor error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
