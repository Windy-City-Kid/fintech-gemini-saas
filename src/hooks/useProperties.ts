import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface Property {
  id: string;
  property_name: string;
  property_type: string;
  estimated_value: number;
  mortgage_balance: number;
  mortgage_interest_rate: number;
  mortgage_monthly_payment: number;
  mortgage_term_months: number;
  mortgage_start_date: string | null;
  plaid_account_id: string | null;
  is_manual_entry: boolean;
  relocation_age: number | null;
  relocation_sale_price: number | null;
  relocation_new_purchase_price: number | null;
  relocation_new_mortgage_amount: number | null;
  relocation_new_interest_rate: number | null;
  relocation_new_term_months: number | null;
  relocation_state: string | null;
}

export interface PropertyFormData {
  property_name: string;
  property_type: string;
  estimated_value: number;
  mortgage_balance: number;
  mortgage_interest_rate: number;
  mortgage_monthly_payment: number;
  mortgage_term_months: number;
  relocation_age?: number | null;
  relocation_sale_price?: number | null;
  relocation_new_purchase_price?: number | null;
  relocation_new_mortgage_amount?: number | null;
  relocation_new_interest_rate?: number | null;
  relocation_new_term_months?: number | null;
  relocation_state?: string | null;
}

export function useProperties() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProperties = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast({
        title: 'Error',
        description: 'Failed to load properties',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const addProperty = async (property: PropertyFormData) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('properties')
        .insert({
          user_id: user.id,
          ...property,
        })
        .select()
        .single();

      if (error) throw error;
      
      setProperties(prev => [...prev, data]);
      toast({
        title: 'Success',
        description: 'Property added successfully',
      });
      return data;
    } catch (error) {
      console.error('Error adding property:', error);
      toast({
        title: 'Error',
        description: 'Failed to add property',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateProperty = async (id: string, updates: Partial<PropertyFormData>) => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setProperties(prev => prev.map(p => p.id === id ? data : p));
      toast({
        title: 'Success',
        description: 'Property updated successfully',
      });
      return data;
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: 'Error',
        description: 'Failed to update property',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setProperties(prev => prev.filter(p => p.id !== id));
      toast({
        title: 'Success',
        description: 'Property deleted successfully',
      });
      return true;
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete property',
        variant: 'destructive',
      });
      return false;
    }
  };

  const syncLiabilities = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('fetch-liabilities', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Synced ${data.mortgages_count || 0} mortgage(s) from your accounts`,
      });

      await fetchProperties();
      return data;
    } catch (error) {
      console.error('Error syncing liabilities:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync mortgage data',
        variant: 'destructive',
      });
      return null;
    }
  };

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const primaryResidence = properties.find(p => p.property_type === 'primary_residence');
  const otherProperties = properties.filter(p => p.property_type !== 'primary_residence');

  const totalEquity = properties.reduce((sum, p) => {
    return sum + (p.estimated_value - p.mortgage_balance);
  }, 0);

  const totalMortgageBalance = properties.reduce((sum, p) => sum + p.mortgage_balance, 0);
  const totalPropertyValue = properties.reduce((sum, p) => sum + p.estimated_value, 0);

  return {
    properties,
    primaryResidence,
    otherProperties,
    totalEquity,
    totalMortgageBalance,
    totalPropertyValue,
    isLoading,
    addProperty,
    updateProperty,
    deleteProperty,
    syncLiabilities,
    refresh: fetchProperties,
  };
}
