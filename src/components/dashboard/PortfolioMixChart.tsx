import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PortfolioMixChartProps {
  onRefresh?: () => void;
}

interface Allocation {
  Stocks: number;
  Bonds: number;
  Cash: number;
  Other: number;
}

const COLORS: Record<string, string> = {
  Stocks: 'hsl(152, 76%, 45%)',
  Bonds: 'hsl(199, 89%, 48%)',
  Cash: 'hsl(38, 92%, 50%)',
  Other: 'hsl(262, 83%, 58%)',
};

export function PortfolioMixChart({ onRefresh }: PortfolioMixChartProps) {
  const [allocation, setAllocation] = useState<Allocation>({ Stocks: 0, Bonds: 0, Cash: 0, Other: 0 });
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);

  const fetchHoldings = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('fetch-holdings', {
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.allocation) {
        setAllocation(data.allocation);
        setHasData(data.holdings_count > 0);
        if (data.holdings_count > 0) {
          toast.success(`Synced ${data.holdings_count} holdings`);
        }
      }

      onRefresh?.();
    } catch (error) {
      console.error('Error fetching holdings:', error);
      toast.error('Failed to fetch investment holdings');
    } finally {
      setLoading(false);
    }
  };

  // Load cached holdings from database on mount
  useEffect(() => {
    const loadCachedHoldings = async () => {
      const { data: holdings, error } = await supabase
        .from('holdings')
        .select('asset_class, market_value');

      if (!error && holdings && holdings.length > 0) {
        const cached = holdings.reduce((acc, h) => {
          const key = h.asset_class as keyof Allocation;
          if (key in acc) {
            acc[key] += Number(h.market_value);
          } else {
            acc.Other += Number(h.market_value);
          }
          return acc;
        }, { Stocks: 0, Bonds: 0, Cash: 0, Other: 0 });
        
        setAllocation(cached);
        setHasData(true);
      }
    };

    loadCachedHoldings();
  }, []);

  const chartData = Object.entries(allocation)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const totalValue = Object.values(allocation).reduce((sum, val) => sum + val, 0);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value: number) => {
    if (totalValue === 0) return '0%';
    return `${((value / totalValue) * 100).toFixed(1)}%`;
  };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Portfolio Mix
          </h3>
          <p className="text-sm text-muted-foreground">Investment asset allocation</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchHoldings}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      {!hasData ? (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-4">
          <p>Link investment accounts to see allocation</p>
          <Button variant="outline" size="sm" onClick={fetchHoldings} disabled={loading}>
            {loading ? 'Syncing...' : 'Sync Holdings'}
          </Button>
        </div>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name] || COLORS.Other} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 12%)',
                    border: '1px solid hsl(217, 33%, 20%)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
                  }}
                  formatter={(value: number) => [formatValue(value), 'Value']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with percentages */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: COLORS[entry.name] || COLORS.Other }}
                />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
                <span className="text-sm font-medium ml-auto">{formatPercent(entry.value)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Investments</span>
              <span className="text-lg font-semibold">{formatValue(totalValue)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
