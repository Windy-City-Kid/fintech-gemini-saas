/**
 * Estate Data Hook
 * Aggregates portfolio, property, and profile data for estate planning
 * Now includes Monte Carlo integration for probabilistic projections
 */

import { useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProperties } from './useProperties';
import { useBeneficiaries } from './useBeneficiaries';
import { useCharitableBequests } from './useCharitableBequests';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { 
  EstateAsset, 
  Beneficiary as EstateBeneficiary, 
  CharitableBequest,
  projectEstate,
  EstateProjectionResult,
  calculateStepUpBasis,
  calculateHeir10YearTaxLiability,
} from '@/lib/estateCalculator';
import { toast } from 'sonner';

export interface EstateProfile {
  legacyGoal: number;
  stateCode: string;
  isMarried: boolean;
  longevityAge: number;
}

export interface EstatePercentiles {
  p10: number;
  p50: number;
  p90: number;
}

export function useEstateData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { properties } = useProperties();
  const { beneficiaries: dbBeneficiaries } = useBeneficiaries();
  const { bequests: dbBequests } = useCharitableBequests();
  const { result: mcResult, isRunning: isSimulationRunning, runSimulation } = useMonteCarloWorker();

  // Fetch accounts directly
  const { data: accounts = [] } = useQuery({
    queryKey: ['estate-accounts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select('id, account_name, account_type, current_balance')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch profile and scenario data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['estate-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('legacy_goal_amount, spouse_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch active scenario for state code and simulation params
  const { data: scenario, isLoading: scenarioLoading } = useQuery({
    queryKey: ['estate-scenario', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('scenarios')
        .select('primary_life_expectancy, current_age, retirement_age, monthly_retirement_spending, is_married, primary_pia, spouse_pia, primary_claiming_age, spouse_claiming_age')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Convert charitable bequests to estate calculator format
  const charitableBequests = useMemo((): CharitableBequest[] => {
    return dbBequests.map(b => ({
      name: b.organization_name,
      amount: b.amount,
      isPercentage: b.is_percentage,
    }));
  }, [dbBequests]);

  // Convert portfolio holdings to estate assets
  const estateAssets = useMemo((): EstateAsset[] => {
    const assets: EstateAsset[] = [];
    
    // Add investment accounts
    accounts.forEach(account => {
      let type: EstateAsset['type'] = 'other';
      if (account.account_type === 'IRA') type = 'ira';
      else if (account.account_type === '401k') type = '401k';
      else if (account.account_type === 'Brokerage') type = 'brokerage';
      else if (account.account_type === 'Cash' || account.account_type === 'Checking' || account.account_type === 'Savings') type = 'cash';
      
      assets.push({
        name: account.account_name,
        value: account.current_balance,
        costBasis: account.current_balance * 0.7, // Estimate 30% gain
        type,
        accountId: account.id,
      });
    });
    
    // Add properties
    if (properties) {
      properties.forEach(property => {
        const equity = property.estimated_value - (property.mortgage_balance || 0);
        assets.push({
          name: property.property_name,
          value: equity,
          costBasis: equity * 0.5, // Estimate 50% appreciation
          type: 'real_estate',
        });
      });
    }
    
    return assets;
  }, [accounts, properties]);

  // Calculate total estate value
  const totalEstateValue = useMemo(() => {
    return estateAssets.reduce((sum, asset) => sum + asset.value, 0);
  }, [estateAssets]);

  // Traditional IRA/401k balance for 10-year rule
  const traditionalIraBalance = useMemo(() => {
    return estateAssets
      .filter(a => a.type === 'ira' || a.type === '401k')
      .reduce((sum, a) => sum + a.value, 0);
  }, [estateAssets]);

  // Step-up basis calculation
  const stepUpBasis = useMemo(() => {
    return calculateStepUpBasis(estateAssets);
  }, [estateAssets]);

  // Convert beneficiaries to estate calculator format
  const beneficiaries = useMemo((): EstateBeneficiary[] => {
    const list: EstateBeneficiary[] = [];
    
    // Add from database beneficiaries
    dbBeneficiaries.forEach(b => {
      list.push({
        name: b.name,
        relationship: b.relationship,
        percentage: b.allocation_percentage,
      });
    });
    
    // If no beneficiaries but has spouse, add spouse as default
    if (list.length === 0 && profile?.spouse_name) {
      list.push({
        name: profile.spouse_name,
        relationship: 'spouse',
        percentage: 100,
      });
    }
    
    return list;
  }, [dbBeneficiaries, profile]);

  // Calculate estate projection
  const estateProjection = useMemo((): EstateProjectionResult | null => {
    if (estateAssets.length === 0) return null;
    
    return projectEstate({
      totalAssets: totalEstateValue,
      stateCode: 'CA', // Default, should come from user settings
      isMarried: !!profile?.spouse_name,
      charitableBequests,
      assets: estateAssets,
      beneficiaries,
    });
  }, [totalEstateValue, profile, charitableBequests, estateAssets, beneficiaries]);

  // Extract estate percentiles from Monte Carlo results
  const estatePercentiles = useMemo((): EstatePercentiles | null => {
    if (!mcResult?.percentiles) return null;
    
    // Use the ending balance percentiles as estate value projections
    const longevityIndex = (scenario?.primary_life_expectancy || 100) - (scenario?.current_age || 55);
    const p5Array = mcResult.percentiles.p5 || [];
    const p50Array = mcResult.percentiles.p50 || [];
    const p95Array = mcResult.percentiles.p95 || [];
    
    return {
      p10: p5Array[Math.min(longevityIndex, p5Array.length - 1)] || 0,
      p50: p50Array[Math.min(longevityIndex, p50Array.length - 1)] || 0,
      p90: p95Array[Math.min(longevityIndex, p95Array.length - 1)] || 0,
    };
  }, [mcResult, scenario]);

  // Calculate heir 10-year tax liabilities
  const heirTaxLiabilities = useMemo(() => {
    return dbBeneficiaries
      .filter(b => b.relationship !== 'spouse' && b.receives_traditional_ira)
      .map(b => ({
        name: b.name,
        iraShare: traditionalIraBalance * (b.allocation_percentage / 100),
        taxLiability: calculateHeir10YearTaxLiability(
          traditionalIraBalance * (b.allocation_percentage / 100),
          false,
          b.estimated_marginal_rate
        ),
      }));
  }, [dbBeneficiaries, traditionalIraBalance]);

  // Update legacy goal
  const updateLegacyGoal = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ legacy_goal_amount: amount })
        .eq('user_id', user.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estate-profile'] });
      toast.success('Legacy goal updated');
    },
    onError: () => {
      toast.error('Failed to update legacy goal');
    },
  });

  return {
    isLoading: profileLoading || scenarioLoading,
    legacyGoal: profile?.legacy_goal_amount || 0,
    totalEstateValue,
    estateAssets,
    beneficiaries,
    charitableBequests,
    estateProjection,
    longevityAge: scenario?.primary_life_expectancy || 100,
    isMarried: !!profile?.spouse_name,
    updateLegacyGoal: updateLegacyGoal.mutate,
    traditionalIraBalance,
    stepUpBasis,
    heirTaxLiabilities,
    // Monte Carlo integration
    estatePercentiles,
    isSimulationRunning,
    runSimulation,
    scenario,
  };
}
