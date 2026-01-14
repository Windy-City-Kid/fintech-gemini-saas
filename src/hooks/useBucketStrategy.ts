/**
 * Hook for managing Three-Bucket Retirement Strategy
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { usePortfolioData } from './usePortfolioData';
import { useIncomeSources } from './useIncomeSources';
import { 
  analyzeBuckets, 
  calculateMonthlyPaycheck,
  BucketAnalysis, 
  PaycheckBreakdown,
  RefillCondition,
} from '@/lib/bucketEngine';
import { calculateAllocation } from '@/lib/assetClassification';

export interface BucketSettings {
  id: string;
  bucket1_target_years: number;
  bucket2_target_years: number;
  bucket3_target_years: number;
  bucket1_current_value: number;
  bucket2_current_value: number;
  bucket3_current_value: number;
  refill_enabled: boolean;
  refill_threshold_percentage: number;
  bucket3_ytd_return: number;
  bucket2_ytd_return: number;
  last_refill_date: string | null;
  last_refill_amount: number;
  last_refill_source: string | null;
}

export interface RefillHistoryEntry {
  id: string;
  refill_date: string;
  source_bucket: string;
  source_return_at_refill: number;
  amount: number;
  condition_triggered: RefillCondition;
  bucket1_balance_after: number;
  created_at: string;
}

const DEFAULT_SETTINGS: Omit<BucketSettings, 'id'> = {
  bucket1_target_years: 2,
  bucket2_target_years: 5,
  bucket3_target_years: 15,
  bucket1_current_value: 0,
  bucket2_current_value: 0,
  bucket3_current_value: 0,
  refill_enabled: true,
  refill_threshold_percentage: 80,
  bucket3_ytd_return: 8, // Example positive return
  bucket2_ytd_return: 3, // Example positive return
  last_refill_date: null,
  last_refill_amount: 0,
  last_refill_source: null,
};

export function useBucketStrategy() {
  const { user } = useAuth();
  const { allocation, totalBalance: portfolioValue, isLoading: portfolioLoading } = usePortfolioData();
  const { sources: incomeSources, loading: incomeLoading } = useIncomeSources();
  
  const [settings, setSettings] = useState<BucketSettings | null>(null);
  const [refillHistory, setRefillHistory] = useState<RefillHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [annualExpenses, setAnnualExpenses] = useState(60000); // Default - should come from user profile

  // Fetch bucket settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    try {
      // Try to get existing settings
      const { data, error } = await supabase
        .from('bucket_settings')
        .select('*')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings(data as BucketSettings);
      } else {
        // Create default settings
        const { data: newSettings, error: insertError } = await supabase
          .from('bucket_settings')
          .insert([{ user_id: user.id, ...DEFAULT_SETTINGS }])
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(newSettings as BucketSettings);
      }
    } catch (error) {
      console.error('Error fetching bucket settings:', error);
      toast.error('Failed to load bucket settings');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch refill history
  const fetchRefillHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('refill_history')
        .select('*')
        .order('refill_date', { ascending: false })
        .limit(12); // Last 12 refills

      if (error) throw error;
      setRefillHistory((data || []) as RefillHistoryEntry[]);
    } catch (error) {
      console.error('Error fetching refill history:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
    fetchRefillHistory();
  }, [fetchSettings, fetchRefillHistory]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<BucketSettings>) => {
    if (!user || !settings) return;

    try {
      const { error } = await supabase
        .from('bucket_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Bucket settings updated');
    } catch (error) {
      console.error('Error updating bucket settings:', error);
      toast.error('Failed to update settings');
    }
  }, [user, settings]);

  // Execute a refill action
  const executeRefill = useCallback(async (
    sourceBucket: 'growth' | 'bonds',
    amount: number,
    condition: RefillCondition,
  ) => {
    if (!user || !settings) return;

    try {
      const sourceReturn = sourceBucket === 'growth' 
        ? settings.bucket3_ytd_return 
        : settings.bucket2_ytd_return;
      
      const newBucket1Value = settings.bucket1_current_value + amount;

      // Record in refill history
      const { error: historyError } = await supabase
        .from('refill_history')
        .insert([{
          user_id: user.id,
          source_bucket: sourceBucket === 'growth' ? 'bucket3' : 'bucket2',
          source_return_at_refill: sourceReturn,
          amount,
          condition_triggered: condition,
          bucket1_balance_after: newBucket1Value,
        }]);

      if (historyError) throw historyError;

      // Update bucket settings
      const bucketUpdates: Partial<BucketSettings> = {
        bucket1_current_value: newBucket1Value,
        last_refill_date: new Date().toISOString().split('T')[0],
        last_refill_amount: amount,
        last_refill_source: sourceBucket === 'growth' ? 'bucket3' : 'bucket2',
      };

      if (sourceBucket === 'growth') {
        bucketUpdates.bucket3_current_value = settings.bucket3_current_value - amount;
      } else {
        bucketUpdates.bucket2_current_value = settings.bucket2_current_value - amount;
      }

      await updateSettings(bucketUpdates);
      await fetchRefillHistory();

      toast.success(`Refilled $${amount.toLocaleString()} from ${sourceBucket === 'growth' ? 'Growth' : 'Bonds'} bucket`);
    } catch (error) {
      console.error('Error executing refill:', error);
      toast.error('Failed to execute refill');
    }
  }, [user, settings, updateSettings, fetchRefillHistory]);

  // Calculate bucket analysis from portfolio data
  const bucketAnalysis: BucketAnalysis | null = useMemo(() => {
    if (!settings || !allocation) return null;

    const targetYears = {
      cash: settings.bucket1_target_years,
      bonds: settings.bucket2_target_years,
      growth: settings.bucket3_target_years,
    };

    const ytdReturns = {
      cash: 1, // Cash typically earns small positive return
      bonds: settings.bucket2_ytd_return,
      growth: settings.bucket3_ytd_return,
    };

    return analyzeBuckets(
      allocation,
      portfolioValue,
      annualExpenses,
      targetYears,
      ytdReturns,
    );
  }, [settings, allocation, portfolioValue, annualExpenses]);

  // Calculate monthly paycheck
  const paycheck: PaycheckBreakdown | null = useMemo(() => {
    if (!bucketAnalysis) return null;

    // Get guaranteed income sources (SS, Pension, Annuity)
    const guaranteedCategories = ['social_security', 'pension', 'annuity'];
    const guaranteedSources = incomeSources
      .filter(s => guaranteedCategories.includes(s.category) && s.is_active)
      .map(s => ({
        name: s.name,
        monthlyAmount: s.frequency === 'monthly' ? s.amount : s.amount / 12,
      }));

    // Calculate bucket withdrawal needed to meet expenses
    const monthlyExpenses = annualExpenses / 12;
    const guaranteedTotal = guaranteedSources.reduce((sum, s) => sum + s.monthlyAmount, 0);
    const bucketWithdrawal = Math.max(0, monthlyExpenses - guaranteedTotal);

    return calculateMonthlyPaycheck(guaranteedSources, bucketWithdrawal);
  }, [bucketAnalysis, incomeSources, annualExpenses]);

  return {
    // Data
    settings,
    bucketAnalysis,
    paycheck,
    refillHistory,
    loading: loading || portfolioLoading || incomeLoading,
    annualExpenses,

    // Actions
    updateSettings,
    executeRefill,
    setAnnualExpenses,
    refetch: fetchSettings,
  };
}
