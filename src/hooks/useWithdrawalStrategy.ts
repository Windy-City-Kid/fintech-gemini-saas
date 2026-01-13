/**
 * Hook for managing withdrawal strategy configuration and execution
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  WithdrawalAccount, 
  WithdrawalOrder, 
  AccountTaxType,
  projectLifetimeWithdrawals,
  AnnualWithdrawalSummary,
  getWithdrawalChartData,
  WithdrawalChartData,
} from '@/lib/withdrawalEngine';

export type WithdrawalOrderStrategy = 'traditional' | 'reverse' | 'custom';

export interface WithdrawalSettings {
  orderStrategy: WithdrawalOrderStrategy;
  customOrder: WithdrawalOrder[];
  excludedAccountIds: string[];
}

const DEFAULT_SETTINGS: WithdrawalSettings = {
  orderStrategy: 'traditional',
  customOrder: [],
  excludedAccountIds: [],
};

export function useWithdrawalStrategy(currentAge?: number, birthYear?: number) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<WithdrawalSettings>(DEFAULT_SETTINGS);
  const [accounts, setAccounts] = useState<WithdrawalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [projections, setProjections] = useState<AnnualWithdrawalSummary[]>([]);

  // Map account types from DB to withdrawal engine types
  const mapAccountType = (dbType: string): AccountTaxType => {
    const typeMap: Record<string, AccountTaxType> = {
      '401k': 'pretax',
      'IRA': 'pretax',
      'Brokerage': 'taxable',
      'Cash': 'taxable',
      'Savings': 'taxable',
      'Checking': 'taxable',
      'HSA': 'pretax', // Treated as pre-tax for withdrawals
      'Roth': 'roth',
      'Roth IRA': 'roth',
      'Roth 401k': 'roth',
      'Other': 'taxable',
    };
    return typeMap[dbType] || 'taxable';
  };

  // Fetch accounts and settings
  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Fetch accounts
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('id, account_name, account_type, current_balance');

      if (accountError) throw accountError;

      // Get withdrawal settings from scenario (store in scenarios table for now)
      const { data: scenarioData } = await supabase
        .from('scenarios')
        .select('withdrawal_order')
        .eq('is_baseline', true)
        .maybeSingle();

      // Build withdrawal accounts
      const withdrawalAccounts: WithdrawalAccount[] = (accountData || []).map(acc => ({
        id: acc.id,
        name: acc.account_name,
        type: mapAccountType(acc.account_type),
        balance: Number(acc.current_balance) || 0,
        expectedReturn: 0.06, // Default - could be customized per account
        excludeFromWithdrawals: false,
      }));

      setAccounts(withdrawalAccounts);

      // Parse custom order from scenario if exists
      if (scenarioData?.withdrawal_order) {
        const customOrder = (scenarioData.withdrawal_order as string[]).map((id, idx) => ({
          accountId: id,
          priority: idx,
        }));
        setSettings(prev => ({
          ...prev,
          customOrder,
          orderStrategy: customOrder.length > 0 ? 'custom' : 'traditional',
        }));
      }
    } catch (error) {
      console.error('Error fetching withdrawal data:', error);
      toast.error('Failed to load withdrawal settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update order strategy
  const updateOrderStrategy = useCallback(async (strategy: WithdrawalOrderStrategy) => {
    setSettings(prev => ({ ...prev, orderStrategy: strategy }));
  }, []);

  // Update custom order (from drag-and-drop)
  const updateCustomOrder = useCallback(async (newOrder: WithdrawalOrder[]) => {
    if (!user) return;

    try {
      // Save to baseline scenario
      const { data: scenario } = await supabase
        .from('scenarios')
        .select('id')
        .eq('is_baseline', true)
        .maybeSingle();

      if (scenario) {
        const orderIds = newOrder
          .sort((a, b) => a.priority - b.priority)
          .map(o => o.accountId);

        await supabase
          .from('scenarios')
          .update({ withdrawal_order: orderIds })
          .eq('id', scenario.id);
      }

      setSettings(prev => ({
        ...prev,
        customOrder: newOrder,
        orderStrategy: 'custom',
      }));
      
      toast.success('Withdrawal order updated');
    } catch (error) {
      console.error('Error saving withdrawal order:', error);
      toast.error('Failed to save withdrawal order');
    }
  }, [user]);

  // Toggle account exclusion
  const toggleAccountExclusion = useCallback((accountId: string) => {
    setAccounts(prev => prev.map(acc => 
      acc.id === accountId 
        ? { ...acc, excludeFromWithdrawals: !acc.excludeFromWithdrawals }
        : acc
    ));
  }, []);

  // Build accounts with exclusions applied
  const accountsWithExclusions = useMemo(() => {
    return accounts.map(acc => ({
      ...acc,
      excludeFromWithdrawals: settings.excludedAccountIds.includes(acc.id) || acc.excludeFromWithdrawals,
    }));
  }, [accounts, settings.excludedAccountIds]);

  // Get sorted accounts based on current strategy
  const sortedAccounts = useMemo(() => {
    const eligible = accountsWithExclusions.filter(a => a.balance > 0);
    
    if (settings.orderStrategy === 'custom' && settings.customOrder.length > 0) {
      return [...eligible].sort((a, b) => {
        const priorityA = settings.customOrder.find(o => o.accountId === a.id)?.priority ?? 999;
        const priorityB = settings.customOrder.find(o => o.accountId === b.id)?.priority ?? 999;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.expectedReturn - b.expectedReturn;
      });
    }
    
    const typeOrder = settings.orderStrategy === 'reverse'
      ? ['roth', 'pretax', 'taxable']
      : ['taxable', 'pretax', 'roth'];
    
    return [...eligible].sort((a, b) => {
      const typeIndexA = typeOrder.indexOf(a.type);
      const typeIndexB = typeOrder.indexOf(b.type);
      if (typeIndexA !== typeIndexB) return typeIndexA - typeIndexB;
      return a.expectedReturn - b.expectedReturn;
    });
  }, [accountsWithExclusions, settings]);

  // Calculate projections
  const calculateProjections = useCallback((
    endAge: number,
    annualSpendingGaps: { year: number; age: number; gap: number }[],
    excessSettings?: { enabled: boolean; savePercentage: number; targetAccountId: string },
  ) => {
    if (!currentAge || !birthYear || accounts.length === 0) return;

    const results = projectLifetimeWithdrawals(
      currentAge,
      birthYear,
      endAge,
      accountsWithExclusions,
      annualSpendingGaps,
      settings.customOrder,
      settings.orderStrategy,
      excessSettings,
    );

    setProjections(results);
  }, [currentAge, birthYear, accounts, accountsWithExclusions, settings]);

  // Get chart data
  const chartData: WithdrawalChartData[] = useMemo(() => {
    return getWithdrawalChartData(projections);
  }, [projections]);

  // Summary stats
  const summary = useMemo(() => {
    if (projections.length === 0) {
      return {
        totalWithdrawals: 0,
        totalRMDs: 0,
        totalUnfunded: 0,
        yearsWithWithdrawals: 0,
        yearsWithUnfunded: 0,
        accountDepletionAges: {} as Record<string, number | null>,
      };
    }

    const accountDepletionAges: Record<string, number | null> = {};
    accounts.forEach(acc => {
      const depletionYear = projections.find(p => 
        p.endingBalances.find(b => b.accountId === acc.id)?.balance === 0
      );
      accountDepletionAges[acc.name] = depletionYear?.age || null;
    });

    return {
      totalWithdrawals: projections.reduce((sum, p) => sum + p.totalWithdrawals + p.totalRMD, 0),
      totalRMDs: projections.reduce((sum, p) => sum + p.totalRMD, 0),
      totalUnfunded: projections.reduce((sum, p) => sum + p.unfundedGap, 0),
      yearsWithWithdrawals: projections.filter(p => p.totalWithdrawals > 0 || p.totalRMD > 0).length,
      yearsWithUnfunded: projections.filter(p => p.unfundedGap > 0).length,
      accountDepletionAges,
    };
  }, [projections, accounts]);

  return {
    // Data
    accounts,
    sortedAccounts,
    settings,
    projections,
    chartData,
    summary,
    loading,

    // Actions
    updateOrderStrategy,
    updateCustomOrder,
    toggleAccountExclusion,
    calculateProjections,
    refetch: fetchData,
  };
}
