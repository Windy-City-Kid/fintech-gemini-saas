/**
 * useGuardrails Hook
 * 
 * Manages Guyton-Klinger spending guardrails state,
 * integrating with portfolio data, scenarios, and real-time Plaid sync.
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

interface GuardrailSnapshot {
  id: string;
  portfolio_value: number;
  initial_portfolio_value: number;
  monthly_spending: number;
  zone: 'prosperity' | 'safe' | 'caution';
  created_at: string;
  triggered_by: string;
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
  latestSnapshot: GuardrailSnapshot | null;
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
  const [latestSnapshot, setLatestSnapshot] = useState<GuardrailSnapshot | null>(null);

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
      
      // Fetch latest guardrail snapshot from webhook sync
      const { data: snapshotData } = await supabase
        .from('guardrail_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (accountsData) setAccounts(accountsData);
      if (scenariosData && scenariosData[0]) setScenario(scenariosData[0]);
      if (profileData) setLegacyGoal(profileData.legacy_goal_amount);
      if (snapshotData) setLatestSnapshot(snapshotData as unknown as GuardrailSnapshot);
    } catch (error) {
      console.error('Failed to fetch guardrails data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Subscribe to realtime guardrail updates from Plaid sync
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('guardrail-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guardrail_snapshots',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('📊 New guardrail snapshot received:', payload);
          setLatestSnapshot(payload.new as unknown as GuardrailSnapshot);
          // Refresh accounts data to sync with latest balances
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchData]);

  // Calculate portfolio value - prefer snapshot if available and recent
  const portfolioValue = useMemo(() => {
    // If we have a recent snapshot from webhook, use that
    if (latestSnapshot) {
      const snapshotAge = Date.now() - new Date(latestSnapshot.created_at).getTime();
      const ONE_HOUR = 60 * 60 * 1000;
      if (snapshotAge < ONE_HOUR) {
        return latestSnapshot.portfolio_value;
      }
    }
    // Otherwise calculate from accounts
    return accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0);
  }, [accounts, latestSnapshot]);

  // Initial portfolio value - use snapshot history or current
  const initialPortfolioValue = useMemo(() => {
    if (latestSnapshot) {
      return latestSnapshot.initial_portfolio_value;
    }
    return portfolioValue;
  }, [portfolioValue, latestSnapshot]);

  // Monthly spending from scenario
  const monthlySpending = useMemo(() => {
    if (latestSnapshot) {
      return latestSnapshot.monthly_spending;
    }
    return scenario?.monthly_retirement_spending || 5000;
  }, [scenario, latestSnapshot]);

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
    latestSnapshot,
    simulateShock,
    updateConfig,
    refresh: fetchData,
  };
}
