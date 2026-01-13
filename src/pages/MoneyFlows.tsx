import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { useMoneyFlows } from '@/hooks/useMoneyFlows';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export default function MoneyFlows() {
  const { flows, loading } = useMoneyFlows();
  const totalAmount = flows.reduce((sum, f) => sum + f.annual_amount, 0);

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Money Flows"
        description="Track income, expenses, and savings over time"
        previousPage={{ label: 'Expenses and Healthcare', path: '/expenses' }}
        nextPage={{ label: 'Estate Planning', path: '/estate-planning' }}
        showManageConnections={false}
      >
        <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Annual Flows</p>
              <p className="text-3xl font-bold font-mono">{loading ? '...' : formatCurrency(totalAmount)}</p>
            </div>
            <p className="text-sm text-muted-foreground">{flows.length} configured flows</p>
          </CardContent>
        </Card>

        {flows.map((flow) => (
          <CategoryCard
            key={flow.id}
            title={flow.contribution_name}
            subtitle={`${flow.account_type} • Ages ${flow.start_age} - ${flow.end_age}`}
            icon={<ArrowLeftRight className="h-5 w-5" />}
            isComplete
            summary={<span className="font-mono text-chart-2">{formatCurrency(flow.annual_amount)}/yr</span>}
          />
        ))}

        {!loading && flows.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <ArrowLeftRight className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No money flows configured yet.</p>
            </CardContent>
          </Card>
        )}
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
