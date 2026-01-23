/**
 * Hook for managing multiple scenarios with comparison capabilities
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Scenario {
  id: string;
  scenario_name: string;
  current_age: number | null;
  retirement_age: number;
  annual_contribution: number;
  inflation_rate: number;
  expected_return: number;
  monthly_retirement_spending: number;
  is_active: boolean;
  is_baseline: boolean;
  forecast_mode: 'optimistic' | 'average' | 'pessimistic';
  cached_success_rate: number | null;
  cached_estate_value: number | null;
  total_lifetime_taxes: number;
  created_at: string;
  updated_at: string;
}

export interface ScenarioComparison {
  id: string;
  name: string;
  successRate: number;
  estateValue: number;
  lifetimeTaxes: number;
  isBaseline: boolean;
  forecastMode: 'optimistic' | 'average' | 'pessimistic';
  netWorthProjection: number[];
}

const MAX_SCENARIOS = 10;

export function useScenarios() {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch all scenarios
  const fetchScenarios = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('is_baseline', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Type assertion for the new columns
      const typedData = (data || []).map(s => ({
        ...s,
        is_baseline: s.is_baseline ?? false,
        forecast_mode: (s.forecast_mode as 'optimistic' | 'average' | 'pessimistic') ?? 'average',
        cached_success_rate: s.cached_success_rate ?? null,
        cached_estate_value: s.cached_estate_value ?? null,
        total_lifetime_taxes: s.total_lifetime_taxes ?? 0,
      })) as Scenario[];
      
      setScenarios(typedData);
      
      // Auto-select baseline if exists
      const baseline = typedData.find(s => s.is_baseline);
      if (baseline && selectedIds.length === 0) {
        setSelectedIds([baseline.id]);
      }
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast.error('Failed to load scenarios');
    } finally {
      setLoading(false);
    }
  }, [user, selectedIds.length]);

  useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  // Create new scenario
  const createScenario = async (name: string, copyFromId?: string) => {
    if (!user) return null;
    
    if (scenarios.length >= MAX_SCENARIOS) {
      toast.error(`Maximum ${MAX_SCENARIOS} scenarios allowed`);
      return null;
    }

    try {
      let newScenario: Partial<Scenario> = {
        scenario_name: name,
        is_baseline: scenarios.length === 0, // First scenario is baseline
      };

      // Copy from existing scenario if specified
      if (copyFromId) {
        const source = scenarios.find(s => s.id === copyFromId);
        if (source) {
          newScenario = {
            ...newScenario,
            current_age: source.current_age,
            retirement_age: source.retirement_age,
            annual_contribution: source.annual_contribution,
            inflation_rate: source.inflation_rate,
            expected_return: source.expected_return,
            monthly_retirement_spending: source.monthly_retirement_spending,
          };
        }
      }

      const { data, error } = await supabase
        .from('scenarios')
        .insert([{ ...newScenario, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Scenario created');
      await fetchScenarios();
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Failed to create scenario', { description: errorMessage });
      return null;
    }
  };

  // Delete scenario
  const deleteScenario = async (id: string) => {
    if (!user) return;
    
    const scenario = scenarios.find(s => s.id === id);
    if (scenario?.is_baseline) {
      toast.error('Cannot delete baseline scenario');
      return;
    }

    try {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Scenario deleted');
      setSelectedIds(prev => prev.filter(sId => sId !== id));
      await fetchScenarios();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Failed to delete scenario', { description: errorMessage });
    }
  };

  // Set baseline scenario
  const setBaseline = async (id: string) => {
    if (!user) return;

    try {
      // Clear existing baseline
      await supabase
        .from('scenarios')
        .update({ is_baseline: false })
        .neq('id', id);

      // Set new baseline
      const { error } = await supabase
        .from('scenarios')
        .update({ is_baseline: true })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Baseline updated');
      await fetchScenarios();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Failed to update baseline', { description: errorMessage });
    }
  };

  // Update forecast mode
  const setForecastMode = async (id: string, mode: 'optimistic' | 'average' | 'pessimistic') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('scenarios')
        .update({ forecast_mode: mode })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state immediately
      setScenarios(prev => prev.map(s => 
        s.id === id ? { ...s, forecast_mode: mode } : s
      ));
    } catch (error) {
      console.error('Failed to update forecast mode:', error);
      toast.error('Failed to update forecast mode');
    }
  };

  // Cache simulation results
  const cacheResults = async (id: string, successRate: number, estateValue: number, lifetimeTaxes: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('scenarios')
        .update({
          cached_success_rate: successRate,
          cached_estate_value: estateValue,
          total_lifetime_taxes: lifetimeTaxes,
        })
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setScenarios(prev => prev.map(s => 
        s.id === id ? { 
          ...s, 
          cached_success_rate: successRate, 
          cached_estate_value: estateValue,
          total_lifetime_taxes: lifetimeTaxes,
        } : s
      ));
    } catch (error) {
      console.error('Failed to cache results:', error);
    }
  };

  // Toggle scenario selection for comparison (max 3)
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(sId => sId !== id);
      }
      if (prev.length >= 3) {
        toast.info('Maximum 3 scenarios can be compared');
        return prev;
      }
      return [...prev, id];
    });
  };

  // Get selected scenarios for comparison
  const selectedScenarios = scenarios.filter(s => selectedIds.includes(s.id));
  const baselineScenario = scenarios.find(s => s.is_baseline);

  return {
    scenarios,
    loading,
    selectedIds,
    selectedScenarios,
    baselineScenario,
    maxScenarios: MAX_SCENARIOS,
    createScenario,
    deleteScenario,
    setBaseline,
    setForecastMode,
    cacheResults,
    toggleSelection,
    setSelectedIds,
    refresh: fetchScenarios,
  };
}
