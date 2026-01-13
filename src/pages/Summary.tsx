import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { usePlanCompletion } from '@/hooks/usePlanCompletion';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, PiggyBank, Home, CreditCard, Percent, CheckCircle2, DollarSign, Target, Wallet, Building2, Coins, Receipt, ArrowRightLeft, Landmark, ChartLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GaugeChart } from '@/components/charts/GaugeChart';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const sections = [
  { key: 'accounts', label: 'Accounts & Assets', icon: PiggyBank, path: '/accounts' },
  { key: 'realEstate', label: 'Home and Real Estate', icon: Home, path: '/real-estate' },
  { key: 'income', label: 'Income', icon: Coins, path: '/income' },
  { key: 'moneyFlows', label: 'Money Flows', icon: ArrowRightLeft, path: '/money-flows' },
  { key: 'debts', label: 'Debts', icon: CreditCard, path: '/debts' },
  { key: 'expenses', label: 'Expenses & Healthcare', icon: Receipt, path: '/expenses' },
  { key: 'estatePlanning', label: 'Estate Planning', icon: Landmark, path: '/estate-planning' },
  { key: 'rateAssumptions', label: 'Rate Assumptions', icon: ChartLine, path: '/rate-assumptions' },
];

export default function Summary() {
  const { user } = useAuth();
  const { completion, loading: completionLoading, completedCount, totalCount, completionPercentage } = usePlanCompletion();
  const [netWorth, setNetWorth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [financialSummary, setFinancialSummary] = useState({
    totalAssets: 0,
    totalDebts: 0,
    annualIncome: 0,
    annualExpenses: 0,
  });

  useEffect(() => {
    const fetchSummary = async () => {
      if (!user) return;

      try {
        // Parallel fetch
        const [accountsRes, propertiesRes, flowsRes] = await Promise.all([
          supabase.from('accounts').select('current_balance, account_type'),
          supabase.from('properties').select('estimated_value, mortgage_balance'),
          supabase.from('money_flows').select('annual_amount, account_type'),
        ]);

        const accounts = accountsRes.data || [];
        const properties = propertiesRes.data || [];
        const flows = flowsRes.data || [];

        // Calculate totals
        const totalAccountBalance = accounts.reduce((sum, a) => sum + (a.current_balance || 0), 0);
        const propertyValue = properties.reduce((sum, p) => sum + (p.estimated_value || 0), 0);
        const mortgageBalance = properties.reduce((sum, p) => sum + (p.mortgage_balance || 0), 0);

        const totalAssets = totalAccountBalance + propertyValue;
        const totalDebts = mortgageBalance;
        const netWorthCalc = totalAssets - totalDebts;

        // Income and expenses
        const incomeFlows = flows.filter(f => 
          f.account_type.toLowerCase().includes('income') || 
          f.account_type.toLowerCase().includes('salary') ||
          f.account_type.toLowerCase().includes('pension')
        );
        const expenseFlows = flows.filter(f => 
          f.account_type.toLowerCase().includes('expense')
        );

        const annualIncome = incomeFlows.reduce((sum, f) => sum + (f.annual_amount || 0), 0);
        const annualExpenses = expenseFlows.reduce((sum, f) => sum + (f.annual_amount || 0), 0);

        setNetWorth(netWorthCalc);
        setFinancialSummary({
          totalAssets,
          totalDebts,
          annualIncome,
          annualExpenses,
        });
      } catch (error) {
        console.error('Error fetching summary:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [user]);

  // 8 core sections for tracking
  const coreCompletion = useMemo(() => ({
    accounts: completion.accounts,
    realEstate: completion.realEstate,
    income: completion.income,
    moneyFlows: completion.moneyFlows,
    debts: completion.debts,
    expenses: completion.expenses,
    estatePlanning: completion.estatePlanning,
    rateAssumptions: completion.rateAssumptions,
  }), [completion]);

  const coreCompletedCount = Object.values(coreCompletion).filter(Boolean).length;
  const coreTotalCount = 8;
  const corePercentage = Math.round((coreCompletedCount / coreTotalCount) * 100);

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="My Plan Summary"
        description="Track your progress and see an overview of your financial plan"
        showManageConnections={false}
        nextPage={{ label: 'Connections', path: '/connections' }}
      >
        {/* Plan Completion Gauge + Net Worth */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Circular Progress Gauge */}
          <Card className="relative overflow-hidden border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <CardHeader className="relative pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Plan Completion
              </CardTitle>
              <CardDescription>
                {coreCompletedCount} of {coreTotalCount} sections complete
              </CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0 flex flex-col items-center">
              <GaugeChart
                value={corePercentage}
                maxValue={100}
                size="lg"
                thresholds={{ low: 33, medium: 66, high: 100 }}
                subtitle="complete"
              />
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Complete all sections for a comprehensive retirement plan
              </p>
            </CardContent>
          </Card>

          {/* Net Worth Card */}
          <Card className="relative overflow-hidden border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5" />
            <CardHeader className="relative pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-primary" />
                Estimated Net Worth
              </CardTitle>
              <CardDescription>
                Assets minus liabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="relative pt-0">
              <p className="text-4xl font-bold font-mono text-primary">
                {loading ? '...' : formatCurrency(netWorth)}
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Assets</p>
                  <p className="text-sm font-mono font-semibold text-green-600">
                    {formatCurrency(financialSummary.totalAssets)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Debts</p>
                  <p className="text-sm font-mono font-semibold text-red-600">
                    -{formatCurrency(financialSummary.totalDebts)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash Flow Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Annual Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Income</p>
                <p className="text-lg font-bold font-mono text-green-600">
                  {formatCurrency(financialSummary.annualIncome)}
                </p>
              </div>
              <div className="text-center p-3 bg-red-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Expenses</p>
                <p className="text-lg font-bold font-mono text-red-600">
                  {formatCurrency(financialSummary.annualExpenses)}
                </p>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Net</p>
                <p className={cn(
                  "text-lg font-bold font-mono",
                  financialSummary.annualIncome - financialSummary.annualExpenses >= 0 
                    ? "text-green-600" 
                    : "text-red-600"
                )}>
                  {formatCurrency(financialSummary.annualIncome - financialSummary.annualExpenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section Progress */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Setup Progress
          </h2>
          <div className="grid gap-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const isComplete = coreCompletion[section.key as keyof typeof coreCompletion];
              
              return (
                <div
                  key={section.key}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    isComplete
                      ? 'bg-primary/5 border-primary/20'
                      : 'bg-muted/30 border-border hover:bg-muted/50'
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center",
                    isComplete ? "bg-primary/20" : "bg-muted"
                  )}>
                    <Icon className={cn(
                      'h-4 w-4',
                      isComplete ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <span className={cn(
                    'text-sm font-medium flex-1',
                    isComplete ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                    {section.label}
                  </span>
                  <CheckCircle2
                    className={cn(
                      'h-5 w-5',
                      isComplete ? 'text-primary' : 'text-muted-foreground/30'
                    )}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
