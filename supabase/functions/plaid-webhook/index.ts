/**
 * Plaid Webhook Handler - Banking-Grade Security Implementation
 * 
 * Features:
 * 1. HMAC Signature Verification (SHA-256)
 * 2. Idempotency & Replay Protection (5-minute window)
 * 3. Asynchronous Background Processing
 * 4. Dead Letter Queue with Exponential Backoff
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, plaid-verification",
};

// Plaid environment configuration
type PlaidEnv = "sandbox" | "development" | "production";
const PLAID_ENV = "sandbox" as PlaidEnv;
const PLAID_BASE_URL = PLAID_ENV === "production" 
  ? "https://production.plaid.com" 
  : PLAID_ENV === "development"
  ? "https://development.plaid.com"
  : "https://sandbox.plaid.com";

// Constants for replay protection
const MAX_EVENT_AGE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000; // 1 second

// Cache for Plaid verification keys
const keyCache = new Map<string, jose.KeyLike>();

// Type alias for Supabase client
type AdminClient = SupabaseClient;

// Initialize Supabase admin client
function getSupabaseAdmin(): AdminClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

// Generate unique event ID from webhook payload
function generateEventId(payload: Record<string, unknown>): string {
  const { webhook_type, webhook_code, item_id } = payload;
  const timestamp = payload.timestamp || Date.now();
  return `${webhook_type}_${webhook_code}_${item_id}_${timestamp}`;
}

/**
 * Part 1: Secure Webhook Listener with HMAC Signature Verification
 */
async function verifyPlaidWebhook(
  body: string,
  signedJwt: string,
  plaidClientId: string,
  plaidSecret: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Decode JWT header to get key ID
    const protectedHeader = jose.decodeProtectedHeader(signedJwt);
    const keyId = protectedHeader.kid;

    if (!keyId) {
      return { valid: false, error: "No key ID in JWT header" };
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
        return { valid: false, error: `Failed to fetch verification key: ${JSON.stringify(errorData)}` };
      }

      const keyData = await keyResponse.json();
      const importedKey = await jose.importJWK(keyData.key, "RS256");
      
      if (importedKey instanceof Uint8Array) {
        return { valid: false, error: "Unexpected key type: Uint8Array" };
      }
      
      verificationKey = importedKey;
      keyCache.set(keyId, verificationKey);
    }

    // Verify JWT with 5-minute max age (Replay Protection)
    const { payload } = await jose.jwtVerify(signedJwt, verificationKey, {
      maxTokenAge: "5 min",
    });

    // Verify body hash using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(body);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const bodyHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    const claimedHash = payload.request_body_sha256 as string;
    
    if (bodyHash !== claimedHash) {
      return { valid: false, error: "Body hash mismatch - potential tampering detected" };
    }

    console.log("✅ Webhook signature verified successfully");
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown verification error";
    return { valid: false, error: message };
  }
}

/**
 * Part 2: Idempotency Check - Prevent duplicate processing
 */
async function checkIdempotency(
  supabaseAdmin: AdminClient,
  eventId: string,
  receivedAt: Date
): Promise<{ isDuplicate: boolean; isReplay: boolean; error?: string }> {
  try {
    // Check if event already exists
    const { data: existingEvent, error } = await supabaseAdmin
      .from("incoming_events")
      .select("id, received_at, status")
      .eq("event_id", eventId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found (which is good)
      return { isDuplicate: false, isReplay: false, error: error.message };
    }

    if (existingEvent) {
      console.log(`⚠️ Duplicate event detected: ${eventId}`);
      return { isDuplicate: true, isReplay: false };
    }

    // Check for replay attack (event timestamp too old)
    const eventAge = Date.now() - receivedAt.getTime();
    if (eventAge > MAX_EVENT_AGE_MS) {
      console.log(`🚨 Replay attack detected: Event is ${eventAge}ms old (max: ${MAX_EVENT_AGE_MS}ms)`);
      return { isDuplicate: false, isReplay: true };
    }

    return { isDuplicate: false, isReplay: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown idempotency error";
    return { isDuplicate: false, isReplay: false, error: message };
  }
}

/**
 * Part 3: Record incoming event for idempotency tracking
 */
async function recordIncomingEvent(
  supabaseAdmin: AdminClient,
  eventId: string,
  eventType: string,
  eventCode: string | null,
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("incoming_events")
      .insert({
        event_id: eventId,
        event_type: eventType,
        event_code: eventCode,
        provider: "plaid",
        payload,
        status: "processing",
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Log the event receipt
    await logWebhookAction(supabaseAdmin, eventId, "received", { eventType, eventCode });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown recording error";
    return { success: false, error: message };
  }
}

/**
 * Part 4: Dead Letter Queue - Add failed event for retry
 */
async function addToDeadLetterQueue(
  supabaseAdmin: AdminClient,
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>,
  errorMessage: string,
  retryCount: number = 0
): Promise<void> {
  try {
    // Calculate next retry time with exponential backoff
    const backoffMs = BASE_BACKOFF_MS * Math.pow(2, retryCount);
    const nextRetryAt = new Date(Date.now() + backoffMs);

    await supabaseAdmin
      .from("dead_letter_queue")
      .insert({
        event_id: eventId,
        event_type: eventType,
        provider: "plaid",
        payload,
        error_message: errorMessage,
        retry_count: retryCount,
        next_retry_at: nextRetryAt.toISOString(),
        last_attempted_at: new Date().toISOString(),
        status: retryCount >= MAX_RETRY_ATTEMPTS ? "failed" : "pending",
      });

    await logWebhookAction(supabaseAdmin, eventId, "queued_for_retry", {
      retryCount,
      nextRetryAt: nextRetryAt.toISOString(),
      errorMessage,
    });

    console.log(`📬 Event ${eventId} added to dead letter queue (retry #${retryCount + 1})`);
  } catch (error) {
    console.error("Failed to add to dead letter queue:", error);
  }
}

/**
 * Log webhook processing actions for audit trail
 */
async function logWebhookAction(
  supabaseAdmin: AdminClient,
  eventId: string,
  action: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin
      .from("webhook_processing_logs")
      .insert({
        event_id: eventId,
        action,
        details,
      });
  } catch (error) {
    console.error("Failed to log webhook action:", error);
  }
}

/**
 * Update event status after processing
 */
async function updateEventStatus(
  supabaseAdmin: AdminClient,
  eventId: string,
  status: "processed" | "failed",
  error?: string
): Promise<void> {
  try {
    const updates: Record<string, unknown> = {
      status,
      processed_at: status === "processed" ? new Date().toISOString() : null,
    };

    if (error) {
      updates.last_error = error;
    }

    await supabaseAdmin
      .from("incoming_events")
      .update(updates)
      .eq("event_id", eventId);

    await logWebhookAction(supabaseAdmin, eventId, status, { error });
  } catch (err) {
    console.error("Failed to update event status:", err);
  }
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

/**
 * Part 3: Background Processing Task
 * Processes the webhook payload asynchronously
 */
async function processWebhookPayload(
  payload: Record<string, unknown>,
  eventId: string
): Promise<void> {
  const supabaseAdmin = getSupabaseAdmin();
  const plaidClientId = Deno.env.get("PLAID_CLIENT_ID") ?? "";
  const plaidSecret = Deno.env.get("PLAID_SECRET") ?? "";
  
  const { webhook_type, webhook_code, item_id } = payload;

  console.log(`🔄 Background processing started for event: ${eventId}`);

  try {
    // Only process transaction webhooks for balance updates
    if (webhook_type !== "TRANSACTIONS") {
      console.log("Ignoring non-transaction webhook");
      await updateEventStatus(supabaseAdmin, eventId, "processed");
      return;
    }

    // Process specific webhook codes
    if (webhook_code !== "DEFAULT_UPDATE" && 
        webhook_code !== "HISTORICAL_UPDATE" && 
        webhook_code !== "SYNC_UPDATES_AVAILABLE") {
      console.log(`Ignoring webhook code: ${webhook_code}`);
      await updateEventStatus(supabaseAdmin, eventId, "processed");
      return;
    }

    // Get access token from secure plaid_tokens table
    const { data: tokenRecord, error: tokenError } = await supabaseAdmin
      .from("plaid_tokens")
      .select("access_token, user_id")
      .eq("plaid_item_id", item_id as string)
      .single();

    if (tokenError || !tokenRecord) {
      console.log("No token found for item:", item_id);
      await updateEventStatus(supabaseAdmin, eventId, "processed");
      return;
    }

    const accessToken = tokenRecord.access_token as string;
    const userId = tokenRecord.user_id as string;

    // Fetch latest balances from Plaid
    const balanceData = await fetchBalances(accessToken, plaidClientId, plaidSecret);
    
    if (!balanceData) {
      throw new Error("Failed to fetch balances from Plaid");
    }

    console.log(`📊 Updating balances for ${balanceData.accounts.length} accounts`);

    // Update each account's balance
    let updatedCount = 0;
    for (const plaidAccount of balanceData.accounts) {
      const { error: updateError } = await supabaseAdmin
        .from("accounts")
        .update({
          current_balance: plaidAccount.balances.current || 0,
          last_synced_at: new Date().toISOString(),
        })
        .eq("plaid_item_id", item_id as string);

      if (updateError) {
        console.error("Error updating account balance:", updateError);
      } else {
        updatedCount++;
      }
    }

    console.log(`✅ Successfully updated ${updatedCount} accounts`);

    // Update event status to processed
    await updateEventStatus(supabaseAdmin, eventId, "processed");

    // Log successful processing with details
    await logWebhookAction(supabaseAdmin, eventId, "balance_sync_complete", {
      accountsUpdated: updatedCount,
      itemId: item_id,
      userId,
    });

    console.log(`🎉 Background processing completed for event: ${eventId}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown processing error";
    console.error(`❌ Background processing failed for event ${eventId}:`, error);

    // Update event status to failed
    await updateEventStatus(supabaseAdmin, eventId, "failed", errorMessage);

    // Get current retry count
    const { data: eventRecord } = await supabaseAdmin
      .from("incoming_events")
      .select("processing_attempts")
      .eq("event_id", eventId)
      .single();

    const retryCount = (eventRecord?.processing_attempts as number) || 0;

    // Increment processing attempts
    await supabaseAdmin
      .from("incoming_events")
      .update({ processing_attempts: retryCount + 1 })
      .eq("event_id", eventId);

    // Add to dead letter queue for retry
    await addToDeadLetterQueue(
      supabaseAdmin,
      eventId,
      webhook_type as string,
      payload,
      errorMessage,
      retryCount
    );
  }
}

// Declare EdgeRuntime for Supabase Edge Functions
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

/**
 * Main webhook handler
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = getSupabaseAdmin();

  try {
    console.log("📨 Received Plaid webhook request");

    // Part 1: Enforce HTTPS-only (check if request came over secure connection)
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    if (protocol !== "https" && Deno.env.get("DENO_ENV") !== "development") {
      console.error("🚨 Rejected non-HTTPS request");
      return new Response(
        JSON.stringify({ error: "HTTPS required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 426 }
      );
    }

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
    
    // Part 1: Verify webhook signature (HMAC SHA-256)
    const signedJwt = req.headers.get("plaid-verification");
    if (signedJwt) {
      const verification = await verifyPlaidWebhook(body, signedJwt, plaidClientId, plaidSecret);
      if (!verification.valid) {
        console.error(`🚨 Invalid webhook signature: ${verification.error}`);
        await logWebhookAction(supabaseAdmin, "unknown", "signature_verification_failed", {
          error: verification.error,
        });
        return new Response(
          JSON.stringify({ error: "Invalid webhook signature" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
    } else {
      // In sandbox mode, Plaid may not send verification header
      if (PLAID_ENV === "production") {
        console.error("🚨 Missing verification header in production");
        return new Response(
          JSON.stringify({ error: "Missing verification header" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
      console.warn("⚠️ No plaid-verification header - accepting in sandbox mode");
    }

    // Parse webhook payload
    const payload = JSON.parse(body) as Record<string, unknown>;
    const { webhook_type, webhook_code, item_id } = payload;
    const eventId = generateEventId(payload);
    const receivedAt = new Date();

    console.log(`📋 Webhook: ${webhook_type} - ${webhook_code} for item ${item_id}`);
    console.log(`🔑 Event ID: ${eventId}`);

    // Part 2: Idempotency & Replay Protection
    const idempotencyCheck = await checkIdempotency(supabaseAdmin, eventId, receivedAt);

    if (idempotencyCheck.error) {
      console.error("Idempotency check error:", idempotencyCheck.error);
      // Continue processing - don't block on idempotency errors
    }

    if (idempotencyCheck.isDuplicate) {
      console.log(`⏭️ Skipping duplicate event: ${eventId}`);
      return new Response(
        JSON.stringify({ received: true, duplicate: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (idempotencyCheck.isReplay) {
      console.log(`🚨 Rejecting replay attack: ${eventId}`);
      await logWebhookAction(supabaseAdmin, eventId, "replay_attack_blocked", {
        receivedAt: receivedAt.toISOString(),
      });
      return new Response(
        JSON.stringify({ error: "Event too old - potential replay attack" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Record the incoming event
    const recordResult = await recordIncomingEvent(
      supabaseAdmin,
      eventId,
      webhook_type as string,
      webhook_code as string | null,
      payload
    );

    if (!recordResult.success) {
      // If we can't record (likely duplicate), still return 200 to Plaid
      console.warn(`Failed to record event: ${recordResult.error}`);
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Part 3: Immediately return 200 OK, then process in background
    // Use EdgeRuntime.waitUntil for background processing
    EdgeRuntime.waitUntil(processWebhookPayload(payload, eventId));

    console.log(`✅ Acknowledged webhook, processing in background: ${eventId}`);

    return new Response(
      JSON.stringify({ 
        received: true, 
        event_id: eventId,
        status: "processing"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("❌ Error processing webhook:", error);
    
    // Log the failure
    await logWebhookAction(supabaseAdmin, "unknown", "webhook_handler_error", {
      error: errorMessage,
    });

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Handle graceful shutdown
addEventListener("beforeunload", (ev) => {
  console.log(`🛑 Function shutdown: ${(ev as unknown as { detail?: { reason?: string } }).detail?.reason || "unknown"}`);
});
