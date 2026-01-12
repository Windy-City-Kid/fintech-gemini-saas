/**
 * Portfolio Data Bridge Hook
 * Fetches account balances and holdings allocation, pipes into Monte Carlo simulation
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAllocation, allocationToPercentages, AssetAllocation } from '@/lib/assetClassification';

export interface PortfolioData {
  totalBalance: number;
  allocation: AssetAllocation;
  allocationPercentages: AssetAllocation;
  holdingsCount: number;
  accountsCount: number;
  lastSyncedAt: string | null;
  isLoading: boolean;
  error: string | null;
}

export function usePortfolioData() {
  const { user } = useAuth();
  const [data, setData] = useState<PortfolioData>({
    totalBalance: 0,
    allocation: {
      domesticStocks: 0,
      intlStocks: 0,
      bonds: 0,
      realEstate: 0,
      cash: 0,
    },
    allocationPercentages: {
      domesticStocks: 0.4,
      intlStocks: 0.2,
      bonds: 0.3,
      realEstate: 0.05,
      cash: 0.05,
    },
    holdingsCount: 0,
    accountsCount: 0,
    lastSyncedAt: null,
    isLoading: true,
    error: null,
  });

  const fetchPortfolioData = useCallback(async () => {
    if (!user) {
      setData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch accounts and holdings in parallel
      const [accountsRes, holdingsRes] = await Promise.all([
        supabase
          .from('accounts')
          .select('current_balance, last_synced_at')
          .order('last_synced_at', { ascending: false }),
        supabase
          .from('holdings')
          .select('ticker_symbol, security_name, asset_class, market_value'),
      ]);

      if (accountsRes.error) throw accountsRes.error;
      if (holdingsRes.error) throw holdingsRes.error;

      const accounts = accountsRes.data || [];
      const holdings = holdingsRes.data || [];

      // Calculate total balance from accounts
      const totalBalance = accounts.reduce(
        (sum, acc) => sum + Number(acc.current_balance),
        0
      );

      // Calculate allocation from holdings using the new classifier
      const allocation = calculateAllocation(holdings);
      const allocationPercentages = allocationToPercentages(allocation);

      // Get latest sync time
      const lastSyncedAt = accounts.length > 0 
        ? accounts[0].last_synced_at 
        : null;

      setData({
        totalBalance,
        allocation,
        allocationPercentages,
        holdingsCount: holdings.length,
        accountsCount: accounts.length,
        lastSyncedAt,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Error fetching portfolio data:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to fetch portfolio data',
      }));
    }
  }, [user]);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return {
    ...data,
    refetch: fetchPortfolioData,
  };
}
