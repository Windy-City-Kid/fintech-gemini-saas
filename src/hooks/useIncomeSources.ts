import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type IncomeCategory = 'work' | 'social_security' | 'pension' | 'annuity' | 'passive' | 'windfall' | 'rmd';

export interface IncomeSource {
  id: string;
  user_id: string;
  category: IncomeCategory;
  subcategory: string | null;
  name: string;
  description: string | null;
  amount: number;
  frequency: 'monthly' | 'annual' | 'one_time';
  start_month: number | null;
  start_year: number;
  end_month: number | null;
  end_year: number | null;
  start_milestone: string | null;
  end_milestone: string | null;
  pia_amount: number | null;
  claiming_age: number | null;
  fra: number;
  pension_type: string | null;
  cola_rate: number | null;
  survivor_percentage: number | null;
  annuity_type: string | null;
  guaranteed_period_years: number | null;
  windfall_type: string | null;
  expected_date: string | null;
  probability_percentage: number;
  inflation_adjusted: boolean;
  custom_inflation_rate: number | null;
  is_taxable: boolean;
  tax_treatment: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type IncomeSourceInsert = Omit<IncomeSource, 'id' | 'user_id' | 'created_at' | 'updated_at'> & {
  user_id?: string;
};

export interface IncomeSummaryByCategory {
  category: IncomeCategory;
  totalAnnual: number;
  sources: IncomeSource[];
}

export function useIncomeSources() {
  const { user } = useAuth();
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('income_sources')
        .select('*')
        .order('category', { ascending: true })
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setSources((data || []) as IncomeSource[]);
      setError(null);
    } catch (err) {
      console.error('Error fetching income sources:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch income sources');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const addSource = useCallback(async (source: IncomeSourceInsert) => {
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('income_sources')
      .insert([{ ...source, user_id: user.id }])
      .select()
      .single();

    if (error) throw error;
    setSources(prev => [...prev, data as IncomeSource]);
    return data as IncomeSource;
  }, [user]);

  const updateSource = useCallback(async (id: string, updates: Partial<IncomeSourceInsert>) => {
    const { data, error } = await supabase
      .from('income_sources')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setSources(prev => prev.map(s => s.id === id ? (data as IncomeSource) : s));
    return data as IncomeSource;
  }, []);

  const deleteSource = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('income_sources')
      .delete()
      .eq('id', id);

    if (error) throw error;
    setSources(prev => prev.filter(s => s.id !== id));
  }, []);

  const getByCategory = useCallback((category: IncomeCategory): IncomeSource[] => {
    return sources.filter(s => s.category === category && s.is_active);
  }, [sources]);

  const getSummaryByCategory = useCallback((): IncomeSummaryByCategory[] => {
    const categories: IncomeCategory[] = ['work', 'social_security', 'pension', 'annuity', 'passive', 'windfall', 'rmd'];
    
    return categories.map(category => {
      const categorySources = sources.filter(s => s.category === category && s.is_active);
      const totalAnnual = categorySources.reduce((sum, s) => {
        const annualAmount = s.frequency === 'monthly' ? s.amount * 12 : s.amount;
        return sum + annualAmount;
      }, 0);
      
      return {
        category,
        totalAnnual,
        sources: categorySources,
      };
    });
  }, [sources]);

  const getTotalAnnualIncome = useCallback((excludeRMD = false): number => {
    return sources
      .filter(s => s.is_active && (!excludeRMD || s.category !== 'rmd'))
      .reduce((sum, s) => {
        const annualAmount = s.frequency === 'monthly' ? s.amount * 12 : s.amount;
        return sum + annualAmount;
      }, 0);
  }, [sources]);

  return {
    sources,
    loading,
    error,
    refetch: fetchSources,
    addSource,
    updateSource,
    deleteSource,
    getByCategory,
    getSummaryByCategory,
    getTotalAnnualIncome,
  };
}
