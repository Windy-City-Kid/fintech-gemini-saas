import { useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MoneyFlow {
  id: string;
  contribution_name: string;
  account_type: string;
  annual_amount: number;
  is_income_linked: boolean;
  income_link_percentage: number | null;
  start_age: number;
  end_age: number;
  excess_income_enabled: boolean;
  excess_save_percentage: number | null;
  excess_target_account: string | null;
}

interface MoneyFlowsTileProps {
  currentAge: number;
  monthlySpending: number;
  onManageClick?: () => void;
}

export function MoneyFlowsTile({ currentAge, monthlySpending, onManageClick }: MoneyFlowsTileProps) {
  const { user } = useAuth();
  const [flows, setFlows] = useState<MoneyFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlows = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('money_flows')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setFlows(data || []);
      } catch (err) {
        console.error('Error fetching money flows:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFlows();
  }, [user]);

  // Calculate totals for current year
  const activeContributions = flows.filter(
    f => currentAge >= f.start_age && currentAge <= f.end_age && f.annual_amount > 0
  );
  
  const totalContributions = activeContributions.reduce((sum, f) => sum + Number(f.annual_amount), 0);
  const incomeLinkedContributions = activeContributions.filter(f => f.is_income_linked);
  const annualWithdrawals = monthlySpending * 12;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const netFlow = totalContributions - annualWithdrawals;

  return (
    <Card className="stat-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            Money Flows
          </CardTitle>
          {onManageClick && (
            <Button variant="ghost" size="sm" onClick={onManageClick}>
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contributions */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-sm font-medium">Total Contributions</p>
              <p className="text-xs text-muted-foreground">
                {activeContributions.length} active • {incomeLinkedContributions.length} income-linked
              </p>
            </div>
          </div>
          <p className="text-lg font-bold font-mono text-emerald-500">
            +{formatCurrency(totalContributions)}
          </p>
        </div>

        {/* Withdrawals */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-center gap-3">
            <ArrowDownCircle className="h-5 w-5 text-rose-500" />
            <div>
              <p className="text-sm font-medium">Projected Withdrawals</p>
              <p className="text-xs text-muted-foreground">Based on retirement spending</p>
            </div>
          </div>
          <p className="text-lg font-bold font-mono text-rose-500">
            -{formatCurrency(annualWithdrawals)}
          </p>
        </div>

        {/* Net Flow */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="flex items-center gap-3">
            <TrendingUp className={`h-5 w-5 ${netFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`} />
            <div>
              <p className="text-sm font-medium">Net Annual Flow</p>
              <p className="text-xs text-muted-foreground">
                {netFlow >= 0 ? 'Building wealth' : 'Drawing down'}
              </p>
            </div>
          </div>
          <p className={`text-lg font-bold font-mono ${netFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
          </p>
        </div>

        {/* Withdrawal Hierarchy Info */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Withdrawal Priority</p>
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 font-medium">1. Taxable</span>
            <span className="text-muted-foreground">→</span>
            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 font-medium">2. Pre-tax</span>
            <span className="text-muted-foreground">→</span>
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 font-medium">3. Roth</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
