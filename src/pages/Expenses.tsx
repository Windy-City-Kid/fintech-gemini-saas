import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { useMoneyFlows } from '@/hooks/useMoneyFlows';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, ShoppingCart, Home, Stethoscope } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export default function Expenses() {
  const { flows, loading } = useMoneyFlows();
  const navigate = useNavigate();
  const expenseFlows = flows.filter(f => f.account_type.toLowerCase().includes('expense'));
  const totalExpenses = expenseFlows.reduce((sum, f) => sum + f.annual_amount, 0);

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Expenses and Healthcare"
        description="Track your regular expenses and healthcare costs"
        previousPage={{ label: 'Income', path: '/income' }}
        nextPage={{ label: 'Money Flows', path: '/money-flows' }}
        onManageConnections={() => navigate('/connections')}
      >
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Annual Expenses</p>
              <p className="text-3xl font-bold font-mono">{loading ? '...' : formatCurrency(totalExpenses)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Monthly Average</p>
              <p className="text-xl font-bold text-warning font-mono">{formatCurrency(totalExpenses / 12)}</p>
            </div>
          </CardContent>
        </Card>

        {expenseFlows.map((flow) => (
          <CategoryCard key={flow.id} title={flow.contribution_name} subtitle={`Ages ${flow.start_age} - ${flow.end_age}`} icon={<ShoppingCart className="h-5 w-5" />} isComplete summary={<span className="font-mono text-warning">{formatCurrency(flow.annual_amount)}/yr</span>} />
        ))}

        <CategoryCard title="Medicare Planning" subtitle="Medicare premiums and IRMAA" icon={<Heart className="h-5 w-5" />} onStart={() => navigate('/scenarios')} startLabel="Plan" />
        <CategoryCard title="Healthcare Expenses" subtitle="Medical costs and long-term care" icon={<Stethoscope className="h-5 w-5" />} onStart={() => navigate('/money-flows')} startLabel="Add" />
        <CategoryCard title="Living Expenses" subtitle="Housing, utilities, daily costs" icon={<Home className="h-5 w-5" />} onStart={() => navigate('/money-flows')} startLabel="Add" />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
