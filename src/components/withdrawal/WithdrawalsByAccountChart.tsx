import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { WithdrawalChartData } from '@/lib/withdrawalEngine';
import { TrendingDown, AlertTriangle } from 'lucide-react';

interface WithdrawalsByAccountChartProps {
  chartData: WithdrawalChartData[];
  retirementAge: number;
  accountNames: string[];
}

// Color palette for accounts
const ACCOUNT_COLORS: string[] = [
  'hsl(210, 100%, 55%)', // Blue
  'hsl(30, 100%, 50%)',  // Orange
  'hsl(150, 70%, 45%)',  // Green
  'hsl(280, 70%, 55%)',  // Purple
  'hsl(350, 80%, 55%)',  // Red
  'hsl(180, 70%, 45%)',  // Teal
  'hsl(45, 90%, 50%)',   // Yellow
  'hsl(320, 70%, 55%)',  // Pink
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value);

export function WithdrawalsByAccountChart({
  chartData,
  retirementAge,
  accountNames,
}: WithdrawalsByAccountChartProps) {
  // Build chart config dynamically
  const chartConfig = useMemo(() => {
    const config: ChartConfig = {
      unfunded: {
        label: 'Unfunded (Debt)',
        color: 'hsl(0, 70%, 45%)',
      },
    };
    
    accountNames.forEach((name, idx) => {
      config[name] = {
        label: name,
        color: ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length],
      };
    });
    
    return config;
  }, [accountNames]);

  // Transform data for stacked bar chart
  const transformedData = useMemo(() => {
    return chartData.map(d => ({
      age: d.age,
      year: d.year,
      ...d.byAccount,
      unfunded: d.unfunded,
      total: Object.values(d.byAccount).reduce((sum, v) => sum + v, 0) + d.unfunded,
    }));
  }, [chartData]);

  const hasWithdrawals = transformedData.some(d => d.total > 0);
  const hasUnfunded = transformedData.some(d => d.unfunded > 0);
  const totalWithdrawals = transformedData.reduce((sum, d) => sum + d.total, 0);
  const totalUnfunded = transformedData.reduce((sum, d) => sum + d.unfunded, 0);

  if (!hasWithdrawals) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-primary" />
            Withdrawals by Account
          </CardTitle>
          <CardDescription>
            Year-by-year breakdown of account withdrawals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No withdrawal projections available</p>
              <p className="text-xs mt-1">Add accounts and run cash flow analysis</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Withdrawals by Account
            </CardTitle>
            <CardDescription>
              Year-by-year breakdown showing which accounts fund your retirement
            </CardDescription>
          </div>
          
          {hasUnfunded && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                {formatCurrency(totalUnfunded)} unfunded
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total Withdrawals</p>
            <p className="text-lg font-bold font-mono">{formatCurrency(totalWithdrawals)}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Years Drawing</p>
            <p className="text-lg font-bold font-mono">
              {transformedData.filter(d => d.total > 0).length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Peak Withdrawal</p>
            <p className="text-lg font-bold font-mono">
              {formatCurrency(Math.max(...transformedData.map(d => d.total)))}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${totalUnfunded > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
            <p className="text-xs text-muted-foreground">Unfunded Gaps</p>
            <p className={`text-lg font-bold font-mono ${totalUnfunded > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
              {totalUnfunded > 0 ? formatCurrency(totalUnfunded) : '$0'}
            </p>
          </div>
        </div>

        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={transformedData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="age" 
                tick={{ fontSize: 12 }}
                tickFormatter={(age) => `${age}`}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
              />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  
                  const data = transformedData.find(d => d.age === label);
                  
                  return (
                    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-medium mb-2">Age {label} ({data?.year})</p>
                      <div className="space-y-1">
                        {payload.filter(p => (p.value as number) > 0).map((entry, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm">
                            <div 
                              className="w-3 h-3 rounded" 
                              style={{ backgroundColor: entry.color }}
                            />
                            <span className="flex-1">{entry.name}:</span>
                            <span className="font-mono font-medium">
                              {formatCurrency(entry.value as number)}
                            </span>
                          </div>
                        ))}
                        <div className="border-t border-border pt-1 mt-1">
                          <div className="flex justify-between text-sm font-medium">
                            <span>Total:</span>
                            <span className="font-mono">
                              {formatCurrency(data?.total || 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend />
              
              {/* Retirement age line */}
              <ReferenceLine 
                x={retirementAge} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ value: 'Retirement', position: 'top', fontSize: 10 }}
              />
              
              {/* Stack bars for each account */}
              {accountNames.map((name, idx) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="withdrawals"
                  fill={ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length]}
                  name={name}
                />
              ))}
              
              {/* Unfunded gaps on top */}
              {hasUnfunded && (
                <Bar
                  dataKey="unfunded"
                  stackId="withdrawals"
                  fill="hsl(0, 70%, 45%)"
                  name="Unfunded (Debt)"
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Legend explanation */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground">
            <strong>How to read:</strong> Each bar shows the total withdrawn that year, 
            colored by source account. RMDs are included in Tax-Deferred withdrawals. 
            Red sections indicate gaps that couldn&apos;t be covered (adding to &quot;Lifetime Debt&quot;).
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
