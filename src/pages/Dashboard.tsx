import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, PiggyBank, Target } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { AccountsList } from '@/components/dashboard/AccountsList';
import { NetWorthChart } from '@/components/dashboard/NetWorthChart';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { PortfolioMixChart } from '@/components/dashboard/PortfolioMixChart';
import { PlaidSyncOverlay } from '@/components/dashboard/PlaidSyncOverlay';
import { usePlaidLink } from '@/hooks/usePlaidLink';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Account {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  current_balance: number;
  is_manual_entry: boolean;
  account_mask?: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Initialize Plaid hook to handle OAuth redirects
  const { isSyncing, isResuming } = usePlaidLink(() => {
    // Refresh accounts after successful Plaid connection
    fetchAccounts();
  });

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
  const retirementAccounts = accounts.filter(acc => ['401k', 'IRA', 'HSA'].includes(acc.account_type));
  const retirementTotal = retirementAccounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
  const cashAccounts = accounts.filter(acc => ['Cash', 'Savings', 'Checking'].includes(acc.account_type));
  const cashTotal = cashAccounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <DashboardLayout>
      {/* Plaid Sync Overlay */}
      <PlaidSyncOverlay 
        isVisible={isSyncing || isResuming} 
        message={isResuming ? 'Resuming Bank Connection...' : 'Syncing Bank Data...'}
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your financial health</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Net Worth"
          value={formatCurrency(totalNetWorth)}
          change={accounts.length > 0 ? "+2.4% this month" : "Add accounts to track"}
          changeType={accounts.length > 0 ? "positive" : "neutral"}
          icon={<Wallet className="h-6 w-6 text-primary" />}
        />
        <StatCard
          title="Retirement Savings"
          value={formatCurrency(retirementTotal)}
          change={`${retirementAccounts.length} accounts`}
          changeType="neutral"
          icon={<PiggyBank className="h-6 w-6 text-chart-2" />}
        />
        <StatCard
          title="Cash & Savings"
          value={formatCurrency(cashTotal)}
          change={`${cashAccounts.length} accounts`}
          changeType="neutral"
          icon={<Target className="h-6 w-6 text-chart-4" />}
        />
        <StatCard
          title="Monthly Contribution"
          value="$2,500"
          change="On track"
          changeType="positive"
          icon={<TrendingUp className="h-6 w-6 text-chart-3" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <NetWorthChart totalNetWorth={totalNetWorth} />
        <PortfolioMixChart onRefresh={fetchAccounts} />
        <AllocationChart accounts={accounts} />
      </div>

      {/* Accounts List */}
      <AccountsList accounts={accounts} onRefresh={fetchAccounts} />
    </DashboardLayout>
  );
}
