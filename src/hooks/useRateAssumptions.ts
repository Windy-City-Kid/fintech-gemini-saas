import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RateAssumption {
  id: string;
  user_id: string;
  category: string;
  name: string;
  description: string | null;
  historical_avg: number;
  user_optimistic: number;
  user_pessimistic: number;
  last_updated_from_api: string | null;
  created_at: string;
  updated_at: string;
}

interface UseRateAssumptionsReturn {
  assumptions: RateAssumption[];
  isLoading: boolean;
  error: string | null;
  updateAssumption: (id: string, optimistic: number, pessimistic: number) => Promise<void>;
  syncFredData: () => Promise<void>;
  isSyncing: boolean;
  refetch: () => Promise<void>;
}

// Historical context data for Rate Inspector
export const RATE_HISTORICAL_CONTEXT: Record<string, {
  title: string;
  context: string;
  source: string;
  chartData?: { period: string; value: number }[];
}> = {
  'General-Inflation': {
    title: '10-Year Breakeven Inflation Rate',
    context: 'The 10-year breakeven inflation rate represents the market\'s expectation for average inflation over the next decade. It\'s derived from the difference between 10-year Treasury yields and 10-year TIPS yields. Historical average since 2003 is approximately 2.1%.',
    source: 'Federal Reserve Economic Data (FRED)',
    chartData: [
      { period: '2019', value: 1.8 },
      { period: '2020', value: 1.2 },
      { period: '2021', value: 2.4 },
      { period: '2022', value: 2.8 },
      { period: '2023', value: 2.3 },
      { period: '2024', value: 2.2 },
    ]
  },
  'Medical-Healthcare Costs': {
    title: 'Healthcare Cost Inflation',
    context: 'Healthcare costs have historically outpaced general inflation by 2-3% annually. The CPI for Medical Care has averaged 4-6% over the past 20 years. Fidelity estimates a 65-year-old couple retiring today may need $315,000 for healthcare in retirement.',
    source: 'Bureau of Labor Statistics, Fidelity Retiree Health Care Cost Estimate',
    chartData: [
      { period: '2019', value: 4.6 },
      { period: '2020', value: 2.8 },
      { period: '2021', value: 2.5 },
      { period: '2022', value: 4.0 },
      { period: '2023', value: 5.8 },
      { period: '2024', value: 3.2 },
    ]
  },
  'Social Security-COLA Adjustment': {
    title: 'Social Security Cost-of-Living Adjustment',
    context: 'Social Security COLA is determined annually based on the Consumer Price Index for Urban Wage Earners (CPI-W). The average COLA from 2000-2023 was approximately 2.6%. Recent years saw higher adjustments (5.9% in 2022, 8.7% in 2023) due to elevated inflation.',
    source: 'Social Security Administration',
    chartData: [
      { period: '2019', value: 2.8 },
      { period: '2020', value: 1.6 },
      { period: '2021', value: 1.3 },
      { period: '2022', value: 5.9 },
      { period: '2023', value: 8.7 },
      { period: '2024', value: 3.2 },
    ]
  },
  'Investment-Stock Returns': {
    title: 'Historical Equity Returns',
    context: 'The S&P 500 has returned approximately 10% annually on average since 1926, or about 7% after inflation. However, returns vary significantly by decade. The "Lost Decade" (2000-2009) saw negative real returns, while 2010-2019 averaged over 13% annually.',
    source: 'S&P Dow Jones Indices, Dimensional Fund Advisors',
    chartData: [
      { period: '1970s', value: 5.9 },
      { period: '1980s', value: 17.5 },
      { period: '1990s', value: 18.2 },
      { period: '2000s', value: -0.9 },
      { period: '2010s', value: 13.6 },
      { period: '2020s', value: 10.2 },
    ]
  },
  'Investment-Bond Returns': {
    title: 'Fixed Income Historical Returns',
    context: 'The Bloomberg U.S. Aggregate Bond Index has returned approximately 5-6% annually over the long term. Recent low interest rate environments compressed returns, while the 2022 rate hikes caused significant losses. Current yields offer more attractive forward returns.',
    source: 'Bloomberg, Vanguard',
    chartData: [
      { period: '1980s', value: 12.6 },
      { period: '1990s', value: 7.7 },
      { period: '2000s', value: 6.3 },
      { period: '2010s', value: 3.8 },
      { period: '2020-22', value: -2.1 },
      { period: '2023-24', value: 4.5 },
    ]
  },
  'Housing-Housing Inflation': {
    title: 'Shelter Cost Trends',
    context: 'Housing costs (including rent, property taxes, insurance, and maintenance) have historically risen 3-4% annually. The CPI Shelter component represents about 33% of core CPI. Regional variations are significant, with coastal metros seeing higher appreciation.',
    source: 'Bureau of Labor Statistics, Case-Shiller Index',
    chartData: [
      { period: '2019', value: 3.4 },
      { period: '2020', value: 2.5 },
      { period: '2021', value: 3.8 },
      { period: '2022', value: 7.5 },
      { period: '2023', value: 6.2 },
      { period: '2024', value: 4.8 },
    ]
  },
};

export function useRateAssumptions(): UseRateAssumptionsReturn {
  const { user } = useAuth();
  const [assumptions, setAssumptions] = useState<RateAssumption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchAssumptions = useCallback(async () => {
    if (!user) {
      setAssumptions([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('rate_assumptions')
        .select('*')
        .eq('user_id', user.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // If no assumptions exist, create defaults
      if (!data || data.length === 0) {
        const defaults: Omit<RateAssumption, 'id' | 'created_at' | 'updated_at' | 'last_updated_from_api'>[] = [
          { user_id: user.id, category: 'General', name: 'Inflation', description: 'General price level increase based on CPI', historical_avg: 2.5, user_optimistic: 2.0, user_pessimistic: 4.0 },
          { user_id: user.id, category: 'Medical', name: 'Healthcare Costs', description: 'Annual increase in healthcare expenses', historical_avg: 5.5, user_optimistic: 4.0, user_pessimistic: 7.0 },
          { user_id: user.id, category: 'Social Security', name: 'COLA Adjustment', description: 'Cost of Living Adjustment for Social Security benefits', historical_avg: 2.6, user_optimistic: 2.0, user_pessimistic: 3.5 },
          { user_id: user.id, category: 'Investment', name: 'Stock Returns', description: 'Expected annual return on equity investments', historical_avg: 7.0, user_optimistic: 8.0, user_pessimistic: 5.0 },
          { user_id: user.id, category: 'Investment', name: 'Bond Returns', description: 'Expected annual return on fixed income investments', historical_avg: 4.0, user_optimistic: 5.0, user_pessimistic: 2.5 },
          { user_id: user.id, category: 'Housing', name: 'Housing Inflation', description: 'Annual increase in housing-related costs', historical_avg: 3.5, user_optimistic: 2.5, user_pessimistic: 5.0 },
        ];

        const { data: insertedData, error: insertError } = await supabase
          .from('rate_assumptions')
          .insert(defaults)
          .select();

        if (insertError) {
          throw insertError;
        }

        setAssumptions(insertedData as RateAssumption[]);
      } else {
        setAssumptions(data as RateAssumption[]);
      }
    } catch (err) {
      console.error('Error fetching rate assumptions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rate assumptions');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const updateAssumption = useCallback(async (id: string, optimistic: number, pessimistic: number) => {
    try {
      const { error: updateError } = await supabase
        .from('rate_assumptions')
        .update({
          user_optimistic: optimistic,
          user_pessimistic: pessimistic
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // Update local state
      setAssumptions(prev => prev.map(a => 
        a.id === id ? { ...a, user_optimistic: optimistic, user_pessimistic: pessimistic } : a
      ));

      toast.success('Rate assumption updated');
    } catch (err) {
      console.error('Error updating rate assumption:', err);
      toast.error('Failed to update rate assumption');
    }
  }, []);

  const syncFredData = useCallback(async () => {
    if (!user) return;

    try {
      setIsSyncing(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error: invokeError } = await supabase.functions.invoke('sync-economic-data', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data?.success) {
        toast.success(`Updated inflation rate to ${data.data.value}% from FRED (${data.data.date})`);
        await fetchAssumptions();
      } else {
        throw new Error(data?.error || 'Failed to sync data');
      }
    } catch (err) {
      console.error('Error syncing FRED data:', err);
      toast.error('Failed to sync economic data from FRED');
    } finally {
      setIsSyncing(false);
    }
  }, [user, fetchAssumptions]);

  useEffect(() => {
    fetchAssumptions();
  }, [fetchAssumptions]);

  return {
    assumptions,
    isLoading,
    error,
    updateAssumption,
    syncFredData,
    isSyncing,
    refetch: fetchAssumptions,
  };
}
