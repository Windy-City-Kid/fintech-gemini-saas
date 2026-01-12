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

// Asset classification logic based on ticker symbols and security types
const classifyAsset = (security: {
  ticker_symbol?: string;
  type?: string;
  name?: string;
}): string => {
  const ticker = security.ticker_symbol?.toUpperCase() || '';
  const type = security.type?.toLowerCase() || '';
  const name = security.name?.toLowerCase() || '';

  // Cash and money market
  if (type === 'cash' || type === 'money market' || 
      ticker === 'VMFXX' || ticker === 'SPAXX' || ticker === 'FDRXX' ||
      name.includes('money market') || name.includes('cash')) {
    return 'Cash';
  }

  // Fixed income / Bonds
  const bondIndicators = ['bond', 'fixed income', 'treasury', 'municipal', 'corporate debt'];
  const bondTickers = ['BND', 'AGG', 'TLT', 'IEF', 'LQD', 'HYG', 'VCIT', 'VBTLX', 'FBNDX'];
  if (type === 'fixed income' || type === 'bond' ||
      bondTickers.includes(ticker) ||
      bondIndicators.some(ind => name.includes(ind))) {
    return 'Bonds';
  }

  // ETFs and Mutual Funds - classify by underlying
  if (type === 'etf' || type === 'mutual fund') {
    // Bond ETFs/Funds
    if (bondIndicators.some(ind => name.includes(ind)) || bondTickers.includes(ticker)) {
      return 'Bonds';
    }
    // Default ETFs/Mutual Funds to Stocks
    return 'Stocks';
  }

  // Stocks / Equity
  if (type === 'equity' || type === 'stock' || type === 'derivative') {
    return 'Stocks';
  }

  // Default classification based on name analysis
  if (name.includes('stock') || name.includes('equity') || name.includes('index')) {
    return 'Stocks';
  }

  return 'Other';
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Fetching investment holdings...");

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
    console.log("Fetching holdings for user:", user.id);

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

    // Get all linked accounts with Plaid access tokens
    const { data: accounts, error: accountsError } = await supabaseAdmin
      .from('accounts')
      .select('id, plaid_access_token, plaid_item_id, account_name')
      .eq('user_id', user.id)
      .eq('is_manual_entry', false)
      .not('plaid_access_token', 'is', null);

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      throw new Error("Failed to fetch linked accounts");
    }

    if (!accounts || accounts.length === 0) {
      console.log("No linked accounts found");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No linked accounts with investment data",
          holdings: [],
          allocation: { Stocks: 0, Bonds: 0, Cash: 0, Other: 0 }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Track unique access tokens (items) to avoid duplicate API calls
    const processedTokens = new Set<string>();
    const allHoldings: Array<{
      account_id: string;
      security_id: string;
      ticker_symbol: string;
      security_name: string;
      quantity: number;
      cost_basis: number | null;
      market_value: number;
      asset_class: string;
    }> = [];

    for (const account of accounts) {
      if (!account.plaid_access_token || processedTokens.has(account.plaid_access_token)) {
        continue;
      }
      processedTokens.add(account.plaid_access_token);

      try {
        // Fetch holdings from Plaid
        const holdingsResponse = await fetch(`${PLAID_BASE_URL}/investments/holdings/get`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: plaidClientId,
            secret: plaidSecret,
            access_token: account.plaid_access_token,
          }),
        });

        if (!holdingsResponse.ok) {
          const errorData = await holdingsResponse.json();
          console.error("Plaid holdings error for account:", account.id, errorData);
          // Continue with other accounts instead of failing completely
          continue;
        }

        const holdingsData = await holdingsResponse.json();
        console.log(`Retrieved ${holdingsData.holdings?.length || 0} holdings for account ${account.id}`);

        // Create a map of securities for quick lookup
        const securitiesMap = new Map<string, typeof holdingsData.securities[0]>();
        for (const security of holdingsData.securities || []) {
          securitiesMap.set(security.security_id, security);
        }

        // Process each holding
        for (const holding of holdingsData.holdings || []) {
          const security = securitiesMap.get(holding.security_id);
          if (!security) continue;

          const assetClass = classifyAsset({
            ticker_symbol: security.ticker_symbol,
            type: security.type,
            name: security.name,
          });

          allHoldings.push({
            account_id: account.id,
            security_id: holding.security_id,
            ticker_symbol: security.ticker_symbol || '',
            security_name: security.name || 'Unknown Security',
            quantity: holding.quantity || 0,
            cost_basis: holding.cost_basis,
            market_value: holding.institution_value || 0,
            asset_class: assetClass,
          });
        }
      } catch (err) {
        console.error("Error fetching holdings for account:", account.id, err);
        // Continue with other accounts
      }
    }

    // Delete existing holdings for this user and insert new ones
    await supabaseAdmin
      .from('holdings')
      .delete()
      .eq('user_id', user.id);

    if (allHoldings.length > 0) {
      const holdingsToInsert = allHoldings.map(h => ({
        user_id: user.id,
        account_id: h.account_id,
        security_id: h.security_id,
        ticker_symbol: h.ticker_symbol,
        security_name: h.security_name,
        quantity: h.quantity,
        cost_basis: h.cost_basis,
        market_value: h.market_value,
        asset_class: h.asset_class,
      }));

      const { error: insertError } = await supabaseAdmin
        .from('holdings')
        .insert(holdingsToInsert);

      if (insertError) {
        console.error("Error inserting holdings:", insertError);
      }
    }

    // Calculate allocation summary
    const allocation = allHoldings.reduce((acc, holding) => {
      const key = holding.asset_class as keyof typeof acc;
      if (key in acc) {
        acc[key] += holding.market_value;
      } else {
        acc.Other += holding.market_value;
      }
      return acc;
    }, { Stocks: 0, Bonds: 0, Cash: 0, Other: 0 });

    console.log("Holdings synced successfully. Allocation:", allocation);

    return new Response(
      JSON.stringify({ 
        success: true,
        holdings_count: allHoldings.length,
        holdings: allHoldings.map(h => ({
          ticker_symbol: h.ticker_symbol,
          security_name: h.security_name,
          quantity: h.quantity,
          market_value: h.market_value,
          asset_class: h.asset_class,
        })),
        allocation,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching holdings:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
