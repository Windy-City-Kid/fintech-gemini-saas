/**
 * Hook to manage charitable bequests for estate planning
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CharitableBequest {
  id: string;
  organization_name: string;
  amount: number;
  is_percentage: boolean;
}

export function useCharitableBequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: bequests = [], isLoading } = useQuery({
    queryKey: ['charitable-bequests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('charitable_bequests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(b => ({
        id: b.id,
        organization_name: b.organization_name,
        amount: Number(b.amount),
        is_percentage: b.is_percentage || false,
      }));
    },
    enabled: !!user,
  });

  const addBequest = useMutation({
    mutationFn: async (bequest: Omit<CharitableBequest, 'id'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('charitable_bequests')
        .insert({
          user_id: user.id,
          organization_name: bequest.organization_name,
          amount: bequest.amount,
          is_percentage: bequest.is_percentage,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charitable-bequests'] });
      toast.success('Charitable bequest added');
    },
    onError: () => {
      toast.error('Failed to add charitable bequest');
    },
  });

  const updateBequest = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CharitableBequest> & { id: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('charitable_bequests')
        .update({
          organization_name: updates.organization_name,
          amount: updates.amount,
          is_percentage: updates.is_percentage,
        })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charitable-bequests'] });
      toast.success('Bequest updated');
    },
    onError: () => {
      toast.error('Failed to update bequest');
    },
  });

  const deleteBequest = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('charitable_bequests')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charitable-bequests'] });
      toast.success('Bequest removed');
    },
    onError: () => {
      toast.error('Failed to remove bequest');
    },
  });

  return {
    bequests,
    isLoading,
    addBequest: addBequest.mutate,
    updateBequest: updateBequest.mutate,
    deleteBequest: deleteBequest.mutate,
    isAddingBequest: addBequest.isPending,
  };
}
