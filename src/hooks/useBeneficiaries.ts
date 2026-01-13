/**
 * Hook to manage beneficiaries for estate planning
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Beneficiary {
  id: string;
  name: string;
  relationship: 'spouse' | 'child' | 'sibling' | 'other';
  allocation_percentage: number;
  receives_traditional_ira: boolean;
  estimated_marginal_rate: number;
}

export function useBeneficiaries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: beneficiaries = [], isLoading } = useQuery({
    queryKey: ['beneficiaries', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(b => ({
        id: b.id,
        name: b.name,
        relationship: b.relationship as Beneficiary['relationship'],
        allocation_percentage: Number(b.allocation_percentage),
        receives_traditional_ira: b.receives_traditional_ira || false,
        estimated_marginal_rate: Number(b.estimated_marginal_rate) || 0.32,
      }));
    },
    enabled: !!user,
  });

  const addBeneficiary = useMutation({
    mutationFn: async (beneficiary: Omit<Beneficiary, 'id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('beneficiaries')
        .insert({
          user_id: user.id,
          name: beneficiary.name,
          relationship: beneficiary.relationship,
          allocation_percentage: beneficiary.allocation_percentage,
          receives_traditional_ira: beneficiary.receives_traditional_ira,
          estimated_marginal_rate: beneficiary.estimated_marginal_rate,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      toast.success('Beneficiary added');
    },
    onError: () => {
      toast.error('Failed to add beneficiary');
    },
  });

  const updateBeneficiary = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Beneficiary> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('beneficiaries')
        .update({
          name: updates.name,
          relationship: updates.relationship,
          allocation_percentage: updates.allocation_percentage,
          receives_traditional_ira: updates.receives_traditional_ira,
          estimated_marginal_rate: updates.estimated_marginal_rate,
        })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      toast.success('Beneficiary updated');
    },
    onError: () => {
      toast.error('Failed to update beneficiary');
    },
  });

  const deleteBeneficiary = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      toast.success('Beneficiary removed');
    },
    onError: () => {
      toast.error('Failed to remove beneficiary');
    },
  });

  const totalAllocation = beneficiaries.reduce((sum, b) => sum + b.allocation_percentage, 0);
  const isValidAllocation = Math.abs(totalAllocation - 100) < 0.01 || beneficiaries.length === 0;

  return {
    beneficiaries,
    isLoading,
    totalAllocation,
    isValidAllocation,
    addBeneficiary: addBeneficiary.mutate,
    updateBeneficiary: updateBeneficiary.mutate,
    deleteBeneficiary: deleteBeneficiary.mutate,
    isAddingBeneficiary: addBeneficiary.isPending,
  };
}
