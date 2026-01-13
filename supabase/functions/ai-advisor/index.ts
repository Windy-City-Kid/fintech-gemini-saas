/**
 * AI Advisor Edge Function
 * 
 * Context-Aware AI Chatbot with multimodal support for:
 * - Q&A grounded in user's plan data
 * - Document/image analysis (401k statements, SS estimates)
 * - Chart explanation requests
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlanContext {
  // Accounts & Assets
  accounts: Array<{
    type: string;
    balance: number;
    institution: string;
  }>;
  totalNetWorth: number;
  portfolioAllocation: {
    stocks: number;
    bonds: number;
    cash: number;
    other: number;
  };
  
  // Income
  incomeSources: Array<{
    name: string;
    category: string;
    annualAmount: number;
    startYear: number;
    endYear?: number;
  }>;
  monthlyIncome: number;
  
  // Scenario & Projections
  currentAge: number;
  retirementAge: number;
  ssClaimingAge: number;
  ssPIA: number;
  monthlySpending: number;
  successRate: number;
  estateValueAt100: number;
  withdrawalRate: number;
  
  // Tax Situation
  currentState: string;
  annualStateTax: number;
  annualFederalTax: number;
  
  // Milestones
  isMarried: boolean;
  spouseAge?: number;
  legacyGoal: number;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string | Array<{
    type: "text" | "image_url";
    text?: string;
    image_url?: { url: string };
  }>;
}

interface RequestPayload {
  messages: ChatMessage[];
  planContext: PlanContext;
  chartContext?: {
    chartType: string;
    chartData: unknown;
    chartTitle: string;
  };
  imageData?: string; // Base64 encoded image
}

function buildSystemPrompt(planContext: PlanContext, chartContext?: RequestPayload["chartContext"]): string {
  const basePrompt = `You are Ariel, an expert Financial Engineer and AI Retirement Advisor. You have access to the user's complete retirement plan data and can provide personalized, grounded advice.

YOUR CAPABILITIES:
1. Answer questions about retirement planning grounded in their ACTUAL plan data
2. Analyze uploaded financial documents (401k statements, Social Security estimates, tax returns)
3. Explain chart data and trends in plain language
4. Suggest plan optimizations with specific dollar impact estimates

PERSONALITY:
- Warm, encouraging, but direct about important issues
- Use conversational language, avoid jargon
- Always provide actionable advice with specific numbers when relevant
- Be empathetic but honest about risks

RESPONSE RULES:
1. Ground ALL answers in the user's actual plan data provided below
2. When asked about affordability, calculate impact on estate value and success rate
3. For document uploads, extract key data and offer to update the plan
4. For chart explanations, focus on the "so what" - what the user should DO about it
5. Keep responses concise but complete (aim for 150-300 words unless more detail is requested)
6. Use formatting: bullet points for lists, **bold** for key numbers
7. End complex answers with a follow-up question to guide next steps

USER'S CURRENT PLAN DATA:
=========================

FINANCIAL SNAPSHOT:
- Total Net Worth: $${planContext.totalNetWorth.toLocaleString()}
- Monthly Income: $${planContext.monthlyIncome.toLocaleString()}
- Monthly Spending: $${planContext.monthlySpending.toLocaleString()}
- Excess/Deficit: $${(planContext.monthlyIncome - planContext.monthlySpending).toLocaleString()}/month

ACCOUNTS (${planContext.accounts.length} total):
${planContext.accounts.map(a => `- ${a.type}: $${a.balance.toLocaleString()} (${a.institution})`).join('\n')}

INCOME SOURCES:
${planContext.incomeSources.map(i => `- ${i.name} (${i.category}): $${i.annualAmount.toLocaleString()}/year, starts ${i.startYear}`).join('\n')}

RETIREMENT TIMELINE:
- Current Age: ${planContext.currentAge}
- Retirement Age: ${planContext.retirementAge}
- Social Security Claiming Age: ${planContext.ssClaimingAge}
- Estimated PIA: $${planContext.ssPIA.toLocaleString()}/month
${planContext.isMarried ? `- Married, Spouse Age: ${planContext.spouseAge}` : '- Single'}

PROJECTIONS:
- Monte Carlo Success Rate: ${planContext.successRate}%
- Estate Value at Age 100: $${planContext.estateValueAt100.toLocaleString()}
- Current Withdrawal Rate: ${planContext.withdrawalRate.toFixed(1)}%
- Legacy Goal: $${planContext.legacyGoal.toLocaleString()}

TAX SITUATION:
- State: ${planContext.currentState}
- Annual State Tax: $${planContext.annualStateTax.toLocaleString()}
- Annual Federal Tax: $${planContext.annualFederalTax.toLocaleString()}`;

  if (chartContext) {
    return `${basePrompt}

CHART EXPLANATION REQUEST:
==========================
The user is asking about the "${chartContext.chartTitle}" chart (type: ${chartContext.chartType}).
Chart data summary: ${JSON.stringify(chartContext.chartData).slice(0, 2000)}

When explaining this chart:
1. Start with the key insight/takeaway
2. Explain any notable trends or patterns
3. Point out specific data points that need attention
4. Connect the chart data to their overall plan
5. Suggest 1-2 specific actions based on what you see`;
  }

  return basePrompt;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json() as RequestPayload;
    const { messages, planContext, chartContext, imageData } = payload;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build system prompt with full plan context
    const systemPrompt = buildSystemPrompt(planContext, chartContext);

    // Prepare messages for the AI
    const aiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    // Process messages, handling multimodal content
    for (const msg of messages) {
      if (msg.role === "user" && imageData && messages.indexOf(msg) === messages.length - 1) {
        // Last user message with image - make it multimodal
        aiMessages.push({
          role: "user",
          content: [
            { type: "text", text: typeof msg.content === "string" ? msg.content : "" },
            { type: "image_url", image_url: { url: imageData } },
          ],
        });
      } else {
        aiMessages.push(msg);
      }
    }

    console.log(`AI Advisor: Processing ${messages.length} messages, image: ${!!imageData}, chart: ${!!chartContext}`);

    // Call Lovable AI with Gemini 3 for multimodal support
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: imageData ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("AI Advisor error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
