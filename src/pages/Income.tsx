import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { useMoneyFlows } from '@/hooks/useMoneyFlows';
import { Card, CardContent } from '@/components/ui/card';
import { Banknote, Briefcase, Building2, Gift } from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export default function Income() {
  const { flows, loading } = useMoneyFlows();
  const incomeFlows = flows.filter(f => f.account_type.toLowerCase().includes('income') || f.annual_amount > 0);
  const totalIncome = incomeFlows.reduce((sum, f) => sum + f.annual_amount, 0);

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Income"
        description="Track all sources of income"
        previousPage={{ label: 'Debts', path: '/debts' }}
        nextPage={{ label: 'Expenses and Healthcare', path: '/expenses' }}
        onManageConnections={() => window.location.href = '/connections'}
      >
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Annual Income</p>
              <p className="text-3xl font-bold font-mono">{loading ? '...' : formatCurrency(totalIncome)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Monthly Average</p>
              <p className="text-xl font-bold text-primary font-mono">{formatCurrency(totalIncome / 12)}</p>
            </div>
          </CardContent>
        </Card>

        {incomeFlows.map((flow) => (
          <CategoryCard key={flow.id} title={flow.contribution_name} subtitle={`Ages ${flow.start_age} - ${flow.end_age}`} icon={<Banknote className="h-5 w-5" />} isComplete summary={<span className="font-mono text-primary">{formatCurrency(flow.annual_amount)}/yr</span>} />
        ))}

        <CategoryCard title="Employment Income" subtitle="Salary, wages, and bonuses" icon={<Briefcase className="h-5 w-5" />} onStart={() => window.location.href = '/money-flows'} startLabel="Add" />
        <CategoryCard title="Rental Income" subtitle="Income from real estate" icon={<Building2 className="h-5 w-5" />} onStart={() => window.location.href = '/money-flows'} startLabel="Add" />
        <CategoryCard title="Other Income" subtitle="Dividends, gifts, etc." icon={<Gift className="h-5 w-5" />} onStart={() => window.location.href = '/money-flows'} startLabel="Add" />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
