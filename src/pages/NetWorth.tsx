import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AccountsList } from '@/components/dashboard/AccountsList';
import { NetWorthChart } from '@/components/dashboard/NetWorthChart';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Account {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  current_balance: number;
  is_manual_entry: boolean;
}

export default function NetWorth() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const totalNetWorth = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Net Worth</h1>
        <p className="text-muted-foreground">Track all your assets and liabilities</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <NetWorthChart totalNetWorth={totalNetWorth} />
        <AllocationChart accounts={accounts} />
      </div>

      {/* Accounts List */}
      <AccountsList accounts={accounts} onRefresh={fetchAccounts} />
    </DashboardLayout>
  );
}
