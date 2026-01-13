import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StateTaxRule {
  id: string;
  state_code: string;
  state_name: string;
  base_rate: number;
  top_marginal_rate: number;
  rate_type: 'flat' | 'graduated' | 'none';
  social_security_taxable: boolean;
  ss_exemption_threshold_joint: number | null;
  retirement_exclusion_amount: number;
  pension_exclusion_type: 'none' | 'federal' | 'state' | 'private' | 'all';
  retirement_friendliness: 'excellent' | 'good' | 'neutral' | 'poor';
  col_multiplier: number;
  property_tax_rate: number;
  notes: string | null;
}

export function useStateTaxRules() {
  const { data: rules, isLoading } = useQuery({
    queryKey: ['state-tax-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('state_tax_rules')
        .select('*')
        .order('state_name');
      
      if (error) throw error;
      return data as StateTaxRule[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (reference data)
  });

  const getRule = (stateCode: string): StateTaxRule | undefined => {
    return rules?.find(r => r.state_code === stateCode);
  };

  const noIncomeTaxStates = rules?.filter(r => r.rate_type === 'none') || [];
  const excellentStates = rules?.filter(r => r.retirement_friendliness === 'excellent') || [];

  return {
    rules: rules || [],
    isLoading,
    getRule,
    noIncomeTaxStates,
    excellentStates,
  };
}

// State tax calculation helper for simulation
export function calculateStateTax(
  rule: StateTaxRule | undefined,
  taxableIncome: number,
  ssIncome: number,
  pensionIncome: number,
  age: number
): number {
  if (!rule || rule.rate_type === 'none') return 0;

  let adjustedIncome = taxableIncome;

  // Exclude Social Security if state doesn't tax it
  if (!rule.social_security_taxable) {
    adjustedIncome -= ssIncome;
  }

  // Apply retirement exclusion
  if (rule.retirement_exclusion_amount > 0 && age >= 60) {
    const exclusion = Math.min(pensionIncome, rule.retirement_exclusion_amount);
    adjustedIncome -= exclusion;
  }

  // Apply pension exclusion by type
  if (rule.pension_exclusion_type === 'all') {
    adjustedIncome -= pensionIncome;
  }

  adjustedIncome = Math.max(0, adjustedIncome);

  // Apply base rate (simplified - graduated states use top marginal)
  return adjustedIncome * (rule.base_rate / 100);
}
