import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SanitizedPlanSummary {
  successScore: number;
  withdrawalRate: number;
  annualStateTax: number;
  annualPropertyTax: number;
  estateValueAt100: number;
  currentState: string;
  destinationState?: string;
  destinationStateTax?: number;
  ssFilingAge: number;
  monthlySpending: number;
  monthlyIncome: number;
  housingCostPercent: number;
  currentAge: number;
  retirementAge: number;
  isMarried: boolean;
  portfolioValue: number;
}

interface HeuristicWarning {
  type: 'high_burn' | 'relocation_opportunity' | 'delayed_filing_nudge' | 'housing_concern';
  message: string;
  priority: 'high' | 'medium' | 'low';
}

function runHeuristicChecks(summary: SanitizedPlanSummary): HeuristicWarning[] {
  const warnings: HeuristicWarning[] = [];

  // Withdrawal Check: If Withdrawal Rate > 5%, trigger 'High Burn Warning'
  if (summary.withdrawalRate > 5) {
    warnings.push({
      type: 'high_burn',
      message: `Your withdrawal rate of ${summary.withdrawalRate.toFixed(1)}% exceeds the safe 4% rule. This increases the risk of depleting your portfolio before age 100.`,
      priority: 'high',
    });
  }

  // Tax Check: If State Tax > $10k and Destination State Tax < $2k
  if (summary.annualStateTax > 10000 && summary.destinationStateTax !== undefined && summary.destinationStateTax < 2000) {
    warnings.push({
      type: 'relocation_opportunity',
      message: `You're paying $${Math.round(summary.annualStateTax).toLocaleString()} annually in state taxes. Moving to ${summary.destinationState} could save you $${Math.round(summary.annualStateTax - summary.destinationStateTax).toLocaleString()} per year.`,
      priority: 'medium',
    });
  }

  // Social Security Check: If filing age is 62 and success < 70%
  if (summary.ssFilingAge === 62 && summary.successScore < 70) {
    warnings.push({
      type: 'delayed_filing_nudge',
      message: `Filing for Social Security at 62 with a ${summary.successScore}% success rate is risky. Delaying to 67 increases your monthly benefit by ~30%, and to 70 by ~76%.`,
      priority: 'high',
    });
  }

  // Housing affordability check: If housing costs > 35% of income
  if (summary.housingCostPercent > 35) {
    warnings.push({
      type: 'housing_concern',
      message: `Your housing costs are ${summary.housingCostPercent.toFixed(0)}% of your income, which exceeds the recommended 30% threshold. Have you considered downsizing or relocating?`,
      priority: 'medium',
    });
  }

  return warnings;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { planSummary } = await req.json() as { planSummary: SanitizedPlanSummary };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Run heuristic checks first
    const warnings = runHeuristicChecks(planSummary);

    // Build context for AI
    const warningsContext = warnings.length > 0 
      ? `\n\nPRE-ANALYZED CONCERNS (address these first):\n${warnings.map(w => `- [${w.priority.toUpperCase()}] ${w.message}`).join('\n')}`
      : '';

    const systemPrompt = `You are Ariel, a friendly and experienced Financial Engineer who acts as a personal retirement coach. Your personality:
- Warm, encouraging, but direct about important issues
- Use conversational language, not jargon
- Always provide actionable advice
- Focus on the 3 most impactful changes the user can make

IMPORTANT RULES:
1. NEVER mention specific account numbers, names, or personally identifiable information
2. Always refer to percentages and general figures, not exact dollar amounts unless discussing annual savings
3. Prioritize advice that has the biggest impact on retirement success
4. Be empathetic but honest about risks
5. End with an encouraging message

Your response format:
- Start with a brief personalized greeting acknowledging their situation
- Provide exactly 3 actionable bullet points (most impactful first)
- If their success score is below 70%, express concern and urgency
- If their success score is above 85%, be encouraging but suggest optimization
- End with one adaptive question based on their weakest area`;

    const userContext = `Here is the sanitized retirement plan summary:

SUCCESS METRICS:
- Success Score: ${planSummary.successScore}% (probability of meeting legacy goals)
- Current Withdrawal Rate: ${planSummary.withdrawalRate.toFixed(1)}%
- Estate Value at Age 100 (median): $${Math.round(planSummary.estateValueAt100).toLocaleString()}

TAX SITUATION:
- Current State: ${planSummary.currentState}
- Annual State Income Tax: $${Math.round(planSummary.annualStateTax).toLocaleString()}
- Annual Property Tax: $${Math.round(planSummary.annualPropertyTax).toLocaleString()}
${planSummary.destinationState ? `- Considering relocation to: ${planSummary.destinationState}` : ''}

SOCIAL SECURITY:
- Planned Filing Age: ${planSummary.ssFilingAge}
${planSummary.isMarried ? '- Filing Status: Married (coordinated benefits)' : '- Filing Status: Single'}

HOUSEHOLD:
- Current Age: ${planSummary.currentAge}
- Retirement Age: ${planSummary.retirementAge}
- Housing costs as % of income: ${planSummary.housingCostPercent.toFixed(0)}%
- Portfolio Value: $${Math.round(planSummary.portfolioValue).toLocaleString()}
${warningsContext}

Based on this information, provide personalized retirement coaching advice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
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
    console.error("Retirement coach error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
