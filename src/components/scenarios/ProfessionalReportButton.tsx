/**
 * Professional Plan Report Export Button
 * Generates a comprehensive multi-page PDF report
 */

import { useState, useCallback } from 'react';
import { FileText, Loader2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  downloadProfessionalReport, 
  ProfessionalReportData 
} from '@/lib/professionalReportGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SimulationData {
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  ages: number[];
  successRate: number;
  medianEndBalance: number;
  guardrailActivations: number;
  guardrailEvents: Array<{
    yearInRetirement: number;
    activations: number;
    percentage: number;
  }>;
  inflationScenarios: {
    low: number;
    median: number;
    high: number;
  };
  executionTimeMs?: number;
}

interface ProfessionalReportButtonProps {
  simulationResult: SimulationData | null;
  userName: string;
  currentAge: number;
  retirementAge: number;
  portfolioBalance: number;
  homeEquity: number;
  disabled?: boolean;
}

export function ProfessionalReportButton({
  simulationResult,
  userName,
  currentAge,
  retirementAge,
  portfolioBalance,
  homeEquity,
  disabled = false,
}: ProfessionalReportButtonProps) {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);

  const handleExport = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to generate report');
      return;
    }

    if (!simulationResult) {
      toast.error('No simulation data', {
        description: 'Please run a Monte Carlo simulation first.',
      });
      return;
    }

    setGenerating(true);

    try {
      // Fetch all required data in parallel
      const [accountsRes, propertiesRes, rateAssumptionsRes, stateTaxRulesRes] = await Promise.all([
        supabase.from('accounts').select('*').order('current_balance', { ascending: false }),
        supabase.from('properties').select('*'),
        supabase.from('rate_assumptions').select('*'),
        supabase.from('state_tax_rules').select('*'),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (propertiesRes.error) throw propertiesRes.error;
      if (rateAssumptionsRes.error) throw rateAssumptionsRes.error;
      if (stateTaxRulesRes.error) throw stateTaxRulesRes.error;

      const accounts = accountsRes.data || [];
      const properties = propertiesRes.data || [];
      const rateAssumptions = rateAssumptionsRes.data || [];
      const stateTaxRules = stateTaxRulesRes.data || [];

      // Calculate totals
      const totalNetWorth = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
      const totalHomeEquity = properties.reduce(
        (sum, p) => sum + (p.estimated_value - (p.mortgage_balance || 0)),
        0
      );

      // Build relocation scenario if applicable
      const primaryProperty = properties.find((p) => p.property_type === 'primary_residence');
      let relocationScenario = null;

      if (primaryProperty?.relocation_state) {
        const currentState = stateTaxRules.find((s) => s.state_code === 'GA'); // Default current
        const destinationState = stateTaxRules.find(
          (s) => s.state_code === primaryProperty.relocation_state
        );

        if (currentState && destinationState) {
          relocationScenario = {
            currentState,
            destinationState,
            homeValue: primaryProperty.estimated_value,
            annualIncome: portfolioBalance * 0.04, // 4% withdrawal rate estimate
            yearsInRetirement: 100 - retirementAge,
          };
        }
      }

      // Build report data
      const reportData: ProfessionalReportData = {
        userName,
        currentAge,
        retirementAge,
        lifeExpectancy: 95,
        simulationResult,
        accounts: accounts.map((acc) => ({
          id: acc.id,
          account_name: acc.account_name,
          institution_name: acc.institution_name,
          account_type: acc.account_type,
          current_balance: Number(acc.current_balance),
          is_manual_entry: acc.is_manual_entry || false,
          account_mask: acc.account_mask,
        })),
        properties: properties.map((p) => ({
          id: p.id,
          property_name: p.property_name,
          property_type: p.property_type,
          estimated_value: Number(p.estimated_value),
          mortgage_balance: Number(p.mortgage_balance || 0),
          mortgage_interest_rate: Number(p.mortgage_interest_rate || 0),
          mortgage_monthly_payment: Number(p.mortgage_monthly_payment || 0),
          relocation_state: p.relocation_state,
          relocation_age: p.relocation_age,
          relocation_sale_price: p.relocation_sale_price ? Number(p.relocation_sale_price) : null,
          relocation_new_purchase_price: p.relocation_new_purchase_price
            ? Number(p.relocation_new_purchase_price)
            : null,
        })),
        totalNetWorth,
        totalHomeEquity,
        rateAssumptions: rateAssumptions.map((r) => ({
          category: r.category,
          name: r.name,
          historical_avg: Number(r.historical_avg),
          user_optimistic: Number(r.user_optimistic),
          user_pessimistic: Number(r.user_pessimistic),
          market_sentiment: r.market_sentiment ? Number(r.market_sentiment) : null,
        })),
        relocationScenario,
        stateTaxRules: stateTaxRules.map((s) => ({
          state_code: s.state_code,
          state_name: s.state_name,
          base_rate: Number(s.base_rate),
          top_marginal_rate: Number(s.top_marginal_rate || s.base_rate),
          rate_type: s.rate_type,
          social_security_taxable: s.social_security_taxable,
          retirement_exclusion_amount: Number(s.retirement_exclusion_amount || 0),
          property_tax_rate: Number(s.property_tax_rate || 1.0),
          col_multiplier: Number(s.col_multiplier || 1.0),
        })),
      };

      await downloadProfessionalReport(reportData);

      toast.success('Report generated!', {
        description: 'Your Professional Plan Report has been downloaded.',
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Export failed', {
        description: 'There was an error generating your report. Please try again.',
      });
    } finally {
      setGenerating(false);
    }
  }, [user, simulationResult, userName, currentAge, retirementAge, portfolioBalance, homeEquity]);

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || generating || !simulationResult}
      variant="default"
      className="gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Building2 className="h-4 w-4" />
          Bank-Ready Report
        </>
      )}
    </Button>
  );
}
