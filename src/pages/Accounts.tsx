import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { PiggyBank, Wallet, TrendingUp, Landmark } from 'lucide-react';
import { AddAccountDialog } from '@/components/dashboard/AddAccountDialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Account {
  id: string;
  account_name: string;
  institution_name: string;
  current_balance: number;
  account_type: string;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const getAccountIcon = (type: string) => {
  switch (type) {
    case '401k': case 'IRA': return <TrendingUp className="h-5 w-5" />;
    case 'Savings': case 'Checking': case 'Cash': return <Wallet className="h-5 w-5" />;
    case 'Brokerage': return <Landmark className="h-5 w-5" />;
    default: return <PiggyBank className="h-5 w-5" />;
  }
};

export default function Accounts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAccounts = async () => {
    if (!user) return;
    const { data } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('account_type');
    setAccounts(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); }, [user]);

  const totalBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Accounts & Assets"
        description="Track all your financial accounts in one place"
        previousPage={{ label: 'Connections', path: '/connections' }}
        nextPage={{ label: 'Home and Real Estate', path: '/real-estate' }}
        onManageConnections={() => navigate('/connections')}
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Account Balance</p>
              <p className="text-3xl font-bold font-mono">{loading ? '...' : formatCurrency(totalBalance)}</p>
            </div>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <PiggyBank className="h-4 w-4" /> Add Account
            </Button>
          </CardContent>
        </Card>

        {accounts.map((account) => (
          <CategoryCard
            key={account.id}
            title={account.account_name}
            subtitle={account.institution_name}
            icon={getAccountIcon(account.account_type)}
            isComplete
            summary={<span className="font-mono text-primary">{formatCurrency(account.current_balance)}</span>}
          />
        ))}

        {!loading && accounts.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <PiggyBank className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No accounts added yet.</p>
            </CardContent>
          </Card>
        )}

        <AddAccountDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={() => { fetchAccounts(); setDialogOpen(false); }} />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
