/**
 * useGuardrails Hook
 * 
 * Manages Guyton-Klinger spending guardrails state,
 * integrating with portfolio data and scenarios.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  GuardrailStatus,
  MarketShockResult,
  GuardrailConfig,
  calculateGuardrailStatus,
  simulateMarketShock,
  calculateSafeSpendingTarget,
  generateGuardrailNudge,
  DEFAULT_CONFIG,
} from '@/lib/guardrailsEngine';

interface Account {
  id: string;
  current_balance: number;
  account_type: string;
}

interface Scenario {
  id: string;
  monthly_retirement_spending: number | null;
  current_age: number | null;
  retirement_age: number;
}

interface UseGuardrailsResult {
  status: GuardrailStatus | null;
  shockResult: MarketShockResult | null;
  isLoading: boolean;
  portfolioValue: number;
  initialPortfolioValue: number;
  monthlySpending: number;
  config: GuardrailConfig;
  nudgeMessage: string | null;
  simulateShock: (shockPercent: number) => void;
  updateConfig: (config: Partial<GuardrailConfig>) => void;
  refresh: () => Promise<void>;
}

export function useGuardrails(): UseGuardrailsResult {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<GuardrailConfig>(DEFAULT_CONFIG);
  const [shockPercent, setShockPercent] = useState<number | null>(null);
  const [legacyGoal, setLegacyGoal] = useState<number | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Fetch accounts
      const { data: accountsData } = await supabase
        .from('accounts')
        .select('id, current_balance, account_type')
        .eq('user_id', user.id);
      
      // Fetch active scenario
      const { data: scenariosData } = await supabase
        .from('scenarios')
        .select('id, monthly_retirement_spending, current_age, retirement_age')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);
      
      // Fetch profile for legacy goal
      const { data: profileData } = await supabase
        .from('profiles')
        .select('legacy_goal_amount')
        .eq('user_id', user.id)
        .single();
      
      if (accountsData) setAccounts(accountsData);
      if (scenariosData && scenariosData[0]) setScenario(scenariosData[0]);
      if (profileData) setLegacyGoal(profileData.legacy_goal_amount);
    } catch (error) {
      console.error('Failed to fetch guardrails data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate portfolio value
  const portfolioValue = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  }, [accounts]);

  // Initial portfolio value (use current as baseline for now)
  // In production, this would come from a stored "retirement start" snapshot
  const initialPortfolioValue = useMemo(() => {
    // For now, we'll estimate based on current value
    // Ideally, this is stored when retirement begins
    return portfolioValue;
  }, [portfolioValue]);

  // Monthly spending from scenario
  const monthlySpending = useMemo(() => {
    return scenario?.monthly_retirement_spending || 5000;
  }, [scenario]);

  // Calculate guardrail status
  const status = useMemo(() => {
    if (portfolioValue <= 0) return null;
    
    return calculateGuardrailStatus(
      portfolioValue,
      initialPortfolioValue,
      monthlySpending,
      config
    );
  }, [portfolioValue, initialPortfolioValue, monthlySpending, config]);

  // Calculate shock result if shock is enabled
  const shockResult = useMemo(() => {
    if (shockPercent === null || portfolioValue <= 0) return null;
    
    return simulateMarketShock(
      portfolioValue,
      initialPortfolioValue,
      monthlySpending,
      shockPercent,
      config
    );
  }, [portfolioValue, initialPortfolioValue, monthlySpending, shockPercent, config]);

  // Generate nudge message
  const nudgeMessage = useMemo(() => {
    if (!status) return null;
    return generateGuardrailNudge(status, legacyGoal || undefined, true);
  }, [status, legacyGoal]);

  // Simulate market shock
  const simulateShock = useCallback((percent: number) => {
    setShockPercent(percent > 0 ? percent : null);
  }, []);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<GuardrailConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  return {
    status,
    shockResult,
    isLoading,
    portfolioValue,
    initialPortfolioValue,
    monthlySpending,
    config,
    nudgeMessage,
    simulateShock,
    updateConfig,
    refresh: fetchData,
  };
}
