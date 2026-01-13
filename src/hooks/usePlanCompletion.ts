import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CategoryCompletion {
  summary: boolean;
  connections: boolean;
  accounts: boolean;
  realEstate: boolean;
  debts: boolean;
  income: boolean;
  expenses: boolean;
  moneyFlows: boolean;
  estatePlanning: boolean;
  rateAssumptions: boolean;
}

export function usePlanCompletion() {
  const { user } = useAuth();
  const [completion, setCompletion] = useState<CategoryCompletion>({
    summary: false,
    connections: false,
    accounts: false,
    realEstate: false,
    debts: false,
    income: false,
    expenses: false,
    moneyFlows: false,
    estatePlanning: false,
    rateAssumptions: false,
  });
  const [loading, setLoading] = useState(true);

  const checkCompletion = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Parallel fetches for all data
      const [
        accountsRes,
        propertiesRes,
        flowsRes,
        profileRes,
        ratesRes,
        scenariosRes,
      ] = await Promise.all([
        supabase.from('accounts').select('id, account_type, current_balance').limit(100),
        supabase.from('properties').select('id, estimated_value, mortgage_balance').limit(50),
        supabase.from('money_flows').select('id, account_type, annual_amount').limit(100),
        supabase.from('profiles').select('*').maybeSingle(),
        supabase.from('rate_assumptions').select('id').limit(10),
        supabase.from('scenarios').select('id, current_age').limit(10),
      ]);

      const accounts = accountsRes.data || [];
      const properties = propertiesRes.data || [];
      const flows = flowsRes.data || [];
      const profile = profileRes.data;
      const rates = ratesRes.data || [];
      const scenarios = scenariosRes.data || [];

      // Determine completion status for each category
      const hasAccounts = accounts.length > 0;
      const hasProperties = properties.length > 0;
      const hasDebts = properties.some(p => (p.mortgage_balance || 0) > 0) || 
                      accounts.some(a => a.account_type === 'Other' && a.current_balance < 0);
      const hasIncome = flows.some(f => f.account_type.toLowerCase().includes('income') || 
                                       f.account_type.toLowerCase().includes('salary') ||
                                       f.account_type.toLowerCase().includes('pension') ||
                                       f.account_type.toLowerCase().includes('social security'));
      const hasExpenses = flows.some(f => f.account_type.toLowerCase().includes('expense'));
      const hasMoneyFlows = flows.length > 0;
      const hasEstatePlanning = !!(profile?.legacy_goal_amount && profile.legacy_goal_amount > 0);
      const hasRateAssumptions = rates.length > 0;
      const hasScenarioSetup = scenarios.some(s => s.current_age && s.current_age > 0);

      // Connections are considered complete if there are any synced accounts (non-manual)
      const hasConnections = accounts.length > 0;

      setCompletion({
        summary: hasScenarioSetup,
        connections: hasConnections,
        accounts: hasAccounts,
        realEstate: hasProperties,
        debts: hasDebts || hasProperties, // Debts complete if mortgages exist or explicitly no debts
        income: hasIncome,
        expenses: hasExpenses,
        moneyFlows: hasMoneyFlows,
        estatePlanning: hasEstatePlanning,
        rateAssumptions: hasRateAssumptions,
      });
    } catch (err) {
      console.error('Error checking plan completion:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkCompletion();
  }, [checkCompletion]);

  const completedCount = Object.values(completion).filter(Boolean).length;
  const totalCount = Object.keys(completion).length;
  const completionPercentage = Math.round((completedCount / totalCount) * 100);

  return {
    completion,
    loading,
    refetch: checkCompletion,
    completedCount,
    totalCount,
    completionPercentage,
  };
}
