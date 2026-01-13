import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PlanContext {
  accounts: Array<{
    type: string;
    balance: number;
    institution: string;
  }>;
  totalNetWorth: number;
  portfolioAllocation: {
    stocks: number;
    bonds: number;
    cash: number;
    other: number;
  };
  incomeSources: Array<{
    name: string;
    category: string;
    annualAmount: number;
    startYear: number;
    endYear?: number;
  }>;
  monthlyIncome: number;
  currentAge: number;
  retirementAge: number;
  ssClaimingAge: number;
  ssPIA: number;
  monthlySpending: number;
  successRate: number;
  estateValueAt100: number;
  withdrawalRate: number;
  currentState: string;
  annualStateTax: number;
  annualFederalTax: number;
  healthCondition?: string;
  medicareChoice?: string;
  isMarried: boolean;
  spouseAge?: number;
  legacyGoal: number;
}

export function usePlanContext() {
  const { user } = useAuth();
  const [planContext, setPlanContext] = useState<PlanContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlanContext = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel
      const [
        accountsResult,
        incomeResult,
        scenarioResult,
        profileResult,
      ] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('income_sources').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('scenarios').select('*').eq('user_id', user.id).eq('is_active', true).single(),
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
      ]);

      const accounts = accountsResult.data || [];
      const incomeSources = incomeResult.data || [];
      const scenario = scenarioResult.data;
      const profile = profileResult.data;

      // Calculate totals
      const totalNetWorth = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
      
      // Portfolio allocation (simplified)
      const iraBalance = accounts
        .filter(a => a.account_type === 'IRA' || a.account_type === '401k')
        .reduce((sum, a) => sum + a.current_balance, 0);
      const brokerageBalance = accounts
        .filter(a => a.account_type === 'Brokerage')
        .reduce((sum, a) => sum + a.current_balance, 0);
      const cashBalance = accounts
        .filter(a => a.account_type === 'Cash' || a.account_type === 'Savings' || a.account_type === 'Checking')
        .reduce((sum, a) => sum + a.current_balance, 0);

      // Monthly income from sources
      const monthlyIncome = incomeSources.reduce((sum, src) => {
        const annual = src.amount || 0;
        const freq = src.frequency || 'annual';
        if (freq === 'monthly') return sum + annual;
        if (freq === 'weekly') return sum + (annual * 52 / 12);
        return sum + (annual / 12);
      }, 0);

      // Estimate taxes (simplified)
      const annualIncome = monthlyIncome * 12;
      const federalTax = annualIncome > 100000 ? annualIncome * 0.24 : annualIncome * 0.22;
      const stateTax = annualIncome * 0.05; // Default 5%

      const context: PlanContext = {
        accounts: accounts.map(a => ({
          type: a.account_type,
          balance: a.current_balance || 0,
          institution: a.institution_name,
        })),
        totalNetWorth,
        portfolioAllocation: {
          stocks: totalNetWorth > 0 ? ((iraBalance + brokerageBalance) * 0.7 / totalNetWorth) * 100 : 60,
          bonds: totalNetWorth > 0 ? ((iraBalance + brokerageBalance) * 0.3 / totalNetWorth) * 100 : 30,
          cash: totalNetWorth > 0 ? (cashBalance / totalNetWorth) * 100 : 10,
          other: 0,
        },
        incomeSources: incomeSources.map(src => ({
          name: src.name,
          category: src.category,
          annualAmount: src.frequency === 'monthly' ? (src.amount || 0) * 12 : (src.amount || 0),
          startYear: src.start_year,
          endYear: src.end_year || undefined,
        })),
        monthlyIncome,
        currentAge: scenario?.current_age || 55,
        retirementAge: scenario?.retirement_age || 65,
        ssClaimingAge: scenario?.primary_claiming_age || 67,
        ssPIA: scenario?.primary_pia || 2500,
        monthlySpending: scenario?.monthly_retirement_spending || 5000,
        successRate: scenario?.cached_success_rate || 75,
        estateValueAt100: scenario?.cached_estate_value || totalNetWorth * 1.5,
        withdrawalRate: scenario?.monthly_retirement_spending && totalNetWorth > 0
          ? ((scenario.monthly_retirement_spending * 12) / totalNetWorth) * 100
          : 4,
        currentState: 'CA', // Default - could be enhanced with location data
        annualStateTax: stateTax,
        annualFederalTax: federalTax,
        healthCondition: profile?.health_condition || 'good',
        medicareChoice: profile?.medicare_choice || 'Original Medicare',
        isMarried: scenario?.is_married || false,
        spouseAge: scenario?.spouse_current_age || undefined,
        legacyGoal: profile?.legacy_goal_amount || 500000,
      };

      setPlanContext(context);
    } catch (error) {
      console.error('Error fetching plan context:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPlanContext();
  }, [fetchPlanContext]);

  return { planContext, isLoading, refetch: fetchPlanContext };
}
