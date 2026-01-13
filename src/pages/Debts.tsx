import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard, Home, Car, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Debt {
  id: string;
  name: string;
  type: string;
  balance: number;
  interestRate: number;
  monthlyPayment: number;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

const getDebtIcon = (type: string) => {
  switch (type) {
    case 'mortgage':
      return <Home className="h-5 w-5" />;
    case 'auto':
      return <Car className="h-5 w-5" />;
    case 'student':
      return <GraduationCap className="h-5 w-5" />;
    default:
      return <CreditCard className="h-5 w-5" />;
  }
};

export default function Debts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebts = async () => {
      if (!user) return;
      try {
        // For now, we'll pull mortgage data from properties
        const { data: properties, error } = await supabase
          .from('properties')
          .select('id, property_name, mortgage_balance, mortgage_interest_rate, mortgage_monthly_payment')
          .eq('user_id', user.id)
          .not('mortgage_balance', 'is', null);

        if (error) throw error;

        const mortgageDebts: Debt[] = (properties || [])
          .filter(p => p.mortgage_balance && p.mortgage_balance > 0)
          .map(p => ({
            id: p.id,
            name: `${p.property_name} Mortgage`,
            type: 'mortgage',
            balance: p.mortgage_balance || 0,
            interestRate: p.mortgage_interest_rate || 0,
            monthlyPayment: p.mortgage_monthly_payment || 0,
          }));

        setDebts(mortgageDebts);
      } catch (error) {
        console.error('Error fetching debts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDebts();
  }, [user]);

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
  const totalMonthlyPayment = debts.reduce((sum, d) => sum + d.monthlyPayment, 0);

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Debts"
        description="Track and manage your outstanding debts"
        previousPage={{ label: 'Home and Real Estate', path: '/real-estate' }}
        nextPage={{ label: 'Income', path: '/income' }}
        onManageConnections={() => navigate('/connections')}
      >
        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Debt</p>
                <p className="text-3xl font-bold text-foreground font-mono">
                  {loading ? '...' : formatCurrency(totalDebt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Monthly Payments</p>
                <p className="text-xl font-bold text-destructive font-mono">
                  {formatCurrency(totalMonthlyPayment)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mortgages */}
        {debts.filter(d => d.type === 'mortgage').length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Home className="h-5 w-5" />
              Mortgages
            </h2>
            {debts.filter(d => d.type === 'mortgage').map((debt) => (
              <CategoryCard
                key={debt.id}
                title={debt.name}
                subtitle={`${debt.interestRate.toFixed(2)}% APR`}
                icon={getDebtIcon(debt.type)}
                isComplete
                summary={<span className="font-mono text-destructive">{formatCurrency(debt.balance)}</span>}
              >
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Balance</p>
                    <p className="font-medium font-mono">{formatCurrency(debt.balance)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{debt.interestRate.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Monthly Payment</p>
                    <p className="font-medium font-mono">{formatCurrency(debt.monthlyPayment)}</p>
                  </div>
                </div>
              </CategoryCard>
            ))}
          </div>
        )}

        {/* Other Debt Types - Start Buttons */}
        <CategoryCard
          title="Credit Cards"
          subtitle="Track credit card balances and payments"
          icon={<CreditCard className="h-5 w-5" />}
          onStart={() => {}}
          startLabel="Add Credit Cards"
        />

        <CategoryCard
          title="Auto Loans"
          subtitle="Vehicle financing and payments"
          icon={<Car className="h-5 w-5" />}
          onStart={() => {}}
          startLabel="Add Auto Loan"
        />

        <CategoryCard
          title="Student Loans"
          subtitle="Education debt tracking"
          icon={<GraduationCap className="h-5 w-5" />}
          onStart={() => {}}
          startLabel="Add Student Loans"
        />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
