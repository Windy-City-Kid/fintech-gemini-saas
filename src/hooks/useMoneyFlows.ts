import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MoneyFlow {
  id: string;
  contribution_name: string;
  account_type: string;
  annual_amount: number;
  is_income_linked: boolean;
  income_link_percentage: number | null;
  start_age: number;
  end_age: number;
  excess_income_enabled: boolean;
  excess_save_percentage: number | null;
  excess_target_account: string | null;
}

export interface MoneyFlowsSummary {
  totalContributions: number;
  incomeLinkedCount: number;
  activeFlows: MoneyFlow[];
  excessIncomeEnabled: boolean;
  excessPercentage: number;
  excessTargetAccount: string;
}

export function useMoneyFlows(currentAge?: number) {
  const { user } = useAuth();
  const [flows, setFlows] = useState<MoneyFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFlows = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('money_flows')
        .select('*')
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setFlows(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching money flows:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch money flows');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  // Calculate summary based on current age
  const getSummary = useCallback((): MoneyFlowsSummary => {
    const age = currentAge || 35;
    const activeFlows = flows.filter(
      f => age >= f.start_age && age <= f.end_age && f.annual_amount > 0
    );
    
    const totalContributions = activeFlows.reduce(
      (sum, f) => sum + Number(f.annual_amount), 
      0
    );
    
    const incomeLinkedCount = activeFlows.filter(f => f.is_income_linked).length;
    
    const excessFlow = flows.find(f => f.excess_income_enabled);
    
    return {
      totalContributions,
      incomeLinkedCount,
      activeFlows,
      excessIncomeEnabled: !!excessFlow,
      excessPercentage: Number(excessFlow?.excess_save_percentage) || 50,
      excessTargetAccount: excessFlow?.excess_target_account || 'Brokerage',
    };
  }, [flows, currentAge]);

  return {
    flows,
    loading,
    error,
    refetch: fetchFlows,
    getSummary,
  };
}
