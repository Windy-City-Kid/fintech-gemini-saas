import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, PiggyBank, Home, CreditCard, Percent, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanProgress {
  connections: boolean;
  accounts: boolean;
  realEstate: boolean;
  debts: boolean;
  income: boolean;
  expenses: boolean;
  moneyFlows: boolean;
  estatePlanning: boolean;
  rateAssumptions: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function Summary() {
  const { user } = useAuth();
  const [netWorth, setNetWorth] = useState(0);
  const [progress, setProgress] = useState<PlanProgress>({
    connections: false,
    accounts: false,
    realEstate: false,
    debts: false,
    income: false,
    expenses: false,
    moneyFlows: false,
    estatePlanning: false,
    rateAssumptions: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      try {
        // Fetch accounts
        const { data: accounts } = await supabase
          .from('accounts')
          .select('current_balance')
          .eq('user_id', user.id);

        // Fetch properties
        const { data: properties } = await supabase
          .from('properties')
          .select('estimated_value, mortgage_balance')
          .eq('user_id', user.id);

        // Fetch money flows
        const { data: moneyFlows } = await supabase
          .from('money_flows')
          .select('id')
          .eq('user_id', user.id);

        // Fetch rate assumptions
        const { data: rates } = await supabase
          .from('rate_assumptions')
          .select('id')
          .eq('user_id', user.id);

        // Fetch profile for estate planning
        const { data: profile } = await supabase
          .from('profiles')
          .select('legacy_goal_amount, spouse_name')
          .eq('user_id', user.id)
          .single();

        // Calculate net worth
        const accountsTotal = accounts?.reduce((sum, a) => sum + (a.current_balance || 0), 0) || 0;
        const propertyValue = properties?.reduce((sum, p) => sum + (p.estimated_value || 0), 0) || 0;
        const mortgageBalance = properties?.reduce((sum, p) => sum + (p.mortgage_balance || 0), 0) || 0;
        setNetWorth(accountsTotal + propertyValue - mortgageBalance);

        // Update progress
        setProgress({
          connections: (accounts?.length || 0) > 0,
          accounts: (accounts?.length || 0) > 0,
          realEstate: (properties?.length || 0) > 0,
          debts: mortgageBalance > 0,
          income: (moneyFlows?.filter(m => m).length || 0) > 0,
          expenses: false, // Would need expenses table
          moneyFlows: (moneyFlows?.length || 0) > 0,
          estatePlanning: !!(profile?.legacy_goal_amount || profile?.spouse_name),
          rateAssumptions: (rates?.length || 0) > 0,
        });
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  const completedSteps = Object.values(progress).filter(Boolean).length;
  const totalSteps = Object.keys(progress).length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  const sections = [
    { key: 'connections', label: 'Connections', icon: TrendingUp },
    { key: 'accounts', label: 'Accounts & Assets', icon: PiggyBank },
    { key: 'realEstate', label: 'Home and Real Estate', icon: Home },
    { key: 'debts', label: 'Debts', icon: CreditCard },
    { key: 'income', label: 'Income', icon: TrendingUp },
    { key: 'expenses', label: 'Expenses and Healthcare', icon: TrendingUp },
    { key: 'moneyFlows', label: 'Money Flows', icon: TrendingUp },
    { key: 'estatePlanning', label: 'Estate Planning', icon: TrendingUp },
    { key: 'rateAssumptions', label: 'Rate Assumptions', icon: Percent },
  ];

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="My Plan Summary"
        description="Track your progress and see an overview of your financial plan"
        showManageConnections={false}
        nextPage={{ label: 'Connections', path: '/connections' }}
      >
        {/* Net Worth Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Estimated Net Worth</p>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {loading ? '...' : formatCurrency(netWorth)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Plan Progress</p>
                <p className="text-2xl font-bold text-primary">{progressPercent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <div className="grid gap-3">
          <h2 className="text-lg font-semibold text-foreground">Setup Progress</h2>
          <div className="grid gap-2">
            {sections.map((section) => (
              <div
                key={section.key}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border',
                  progress[section.key as keyof PlanProgress]
                    ? 'bg-primary/5 border-primary/20'
                    : 'bg-muted/30 border-border'
                )}
              >
                <CheckCircle2
                  className={cn(
                    'h-5 w-5',
                    progress[section.key as keyof PlanProgress]
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                />
                <span
                  className={cn(
                    'text-sm font-medium',
                    progress[section.key as keyof PlanProgress]
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  )}
                >
                  {section.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
