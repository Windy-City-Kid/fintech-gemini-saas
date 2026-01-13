/**
 * Estate Data Hook
 * Aggregates portfolio, property, and profile data for estate planning
 */

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProperties } from './useProperties';
import { 
  EstateAsset, 
  Beneficiary, 
  CharitableBequest,
  projectEstate,
  EstateProjectionResult,
} from '@/lib/estateCalculator';
import { toast } from 'sonner';

export interface EstateProfile {
  legacyGoal: number;
  stateCode: string;
  isMarried: boolean;
  longevityAge: number;
}

export function useEstateData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { properties } = useProperties();

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

  // Fetch active scenario for state code
  const { data: scenario, isLoading: scenarioLoading } = useQuery({
    queryKey: ['estate-scenario', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('scenarios')
        .select('primary_life_expectancy')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch charitable bequests (stored in a simple table or as JSON in profile)
  const { data: bequests = [] } = useQuery({
    queryKey: ['charitable-bequests', user?.id],
    queryFn: async () => {
      // For now, return empty array - can be extended with a dedicated table
      return [] as CharitableBequest[];
    },
    enabled: !!user,
  });

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

  // Default beneficiaries (can be extended with a dedicated table)
  const beneficiaries = useMemo((): Beneficiary[] => {
    const list: Beneficiary[] = [];
    
    if (profile?.spouse_name) {
      list.push({
        name: profile.spouse_name,
        relationship: 'spouse',
        percentage: 100,
      });
    }
    
    return list;
  }, [profile]);

  // Calculate estate projection
  const estateProjection = useMemo((): EstateProjectionResult | null => {
    if (estateAssets.length === 0) return null;
    
    return projectEstate({
      totalAssets: totalEstateValue,
      stateCode: 'CA', // Default, should come from user settings
      isMarried: !!profile?.spouse_name,
      charitableBequests: bequests,
      assets: estateAssets,
      beneficiaries,
    });
  }, [totalEstateValue, profile, bequests, estateAssets, beneficiaries]);

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
    charitableBequests: bequests,
    estateProjection,
    longevityAge: scenario?.primary_life_expectancy || 100,
    isMarried: !!profile?.spouse_name,
    updateLegacyGoal: updateLegacyGoal.mutate,
  };
}
