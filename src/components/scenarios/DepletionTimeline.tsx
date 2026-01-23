/**
 * Depletion Timeline Chart
 * 
 * Stacked bar chart showing account balances over time
 * with segments disappearing as accounts are depleted.
 * Hover reveals withdrawal amounts and marginal tax rate.
 */

import { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { DataTableDialog } from '@/components/charts/DataTableDialog';
import { cn } from '@/lib/utils';

interface AccountBalance {
  id: string;
  name: string;
  type: 'taxable' | 'pretax' | 'roth';
  balance: number;
}

interface YearlyData {
  year: number;
  age: number;
  balances: Record<string, number>;
  withdrawals: Record<string, number>;
  totalBalance: number;
  totalWithdrawal: number;
  marginalRate: number;
  depletedAccounts: string[];
}

interface DepletionTimelineProps {
  currentAge: number;
  retirementAge: number;
  yearlyData: YearlyData[];
  accountNames: string[];
  accountColors?: Record<string, string>;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

const DEFAULT_COLORS: Record<string, string> = {
  'Brokerage': '#3b82f6', // blue
  'Taxable': '#3b82f6',
  '401k': '#10b981', // emerald
  'IRA': '#8b5cf6', // violet
  'Traditional IRA': '#8b5cf6',
  'Roth IRA': '#f59e0b', // amber
  'Roth': '#f59e0b',
  'Roth 401k': '#f97316', // orange
  'HSA': '#06b6d4', // cyan
};

export function DepletionTimeline({
  currentAge,
  retirementAge,
  yearlyData,
  accountNames,
  accountColors = DEFAULT_COLORS,
}: DepletionTimelineProps) {
  interface DialogRow {
    account: string;
    balance: string;
    withdrawal: string;
    status: string;
  }

  const [dialogData, setDialogData] = useState<{
    open: boolean;
    data: DialogRow[];
    columns: { key: string; label: string }[];
    title: string;
  }>({ open: false, data: [], columns: [], title: '' });

  // Calculate summary stats
  const stats = useMemo(() => {
    const startingTotal = yearlyData.length > 0 ? yearlyData[0].totalBalance : 0;
    const endingTotal = yearlyData.length > 0 ? yearlyData[yearlyData.length - 1].totalBalance : 0;
    const totalWithdrawn = yearlyData.reduce((sum, y) => sum + y.totalWithdrawal, 0);
    
    // Find depletion ages for each account
    const depletionAges: Record<string, number | null> = {};
    accountNames.forEach(name => {
      const depletionYear = yearlyData.find(y => 
        y.depletedAccounts.includes(name) && 
        (yearlyData.indexOf(y) === 0 || !yearlyData[yearlyData.indexOf(y) - 1].depletedAccounts.includes(name))
      );
      depletionAges[name] = depletionYear?.age || null;
    });
    
    const avgMarginalRate = yearlyData.length > 0 
      ? yearlyData.reduce((sum, y) => sum + y.marginalRate, 0) / yearlyData.length 
      : 0;
    
    return { startingTotal, endingTotal, totalWithdrawn, depletionAges, avgMarginalRate };
  }, [yearlyData, accountNames]);

  interface BarClickData {
    age?: number;
    [key: string]: unknown;
  }

  const handleBarClick = (data: BarClickData) => {
    if (!data || typeof data.age !== 'number') return;
    
    const yearData = yearlyData.find(y => y.age === data.age);
    if (!yearData) return;
    
    setDialogData({
      open: true,
      title: `Account Details - Age ${yearData.age} (${yearData.year})`,
      columns: [
        { key: 'account', label: 'Account' },
        { key: 'balance', label: 'Balance' },
        { key: 'withdrawal', label: 'Withdrawal' },
        { key: 'status', label: 'Status' },
      ],
      data: accountNames.map(name => ({
        account: name,
        balance: formatCurrency(yearData.balances[name] || 0),
        withdrawal: formatCurrency(yearData.withdrawals[name] || 0),
        status: yearData.depletedAccounts.includes(name) ? '⛔ Depleted' : '✓ Active',
      })).concat([
        { account: 'TOTAL', balance: formatCurrency(yearData.totalBalance), withdrawal: formatCurrency(yearData.totalWithdrawal), status: '' },
        { account: 'Marginal Tax Rate', balance: `${(yearData.marginalRate * 100).toFixed(0)}%`, withdrawal: '', status: '' },
      ]),
    });
  };

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload?: YearlyData; [key: string]: unknown }>;
    label?: string | number;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;
    
    const age = typeof label === 'number' ? label : (typeof label === 'string' ? parseInt(label, 10) : null);
    const yearData = age !== null ? yearlyData.find(y => y.age === age) : null;
    if (!yearData) return null;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-64 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">Age {yearData.age}</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-[10px]",
              yearData.marginalRate >= 0.24 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
              yearData.marginalRate >= 0.12 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
            )}
          >
            {(yearData.marginalRate * 100).toFixed(0)}% Marginal
          </Badge>
        </div>
        
        <div className="space-y-1.5 text-xs">
          {/* Account Balances */}
          <div className="font-medium text-muted-foreground mb-1">Balances:</div>
          {accountNames.map(name => {
            const balance = yearData.balances[name] || 0;
            const isDepleted = yearData.depletedAccounts.includes(name);
            const color = accountColors[name] || '#888';
            
            return (
              <div key={name} className={cn("flex justify-between gap-4", isDepleted && "opacity-50")}>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  {name}:
                </span>
                <span className="font-mono">
                  {isDepleted ? (
                    <span className="text-destructive">Depleted</span>
                  ) : (
                    formatCurrency(balance)
                  )}
                </span>
              </div>
            );
          })}
          
          {/* Withdrawals this year */}
          {yearData.totalWithdrawal > 0 && (
            <>
              <div className="border-t border-border pt-1.5 mt-1.5">
                <div className="font-medium text-muted-foreground mb-1">Withdrawals:</div>
                {accountNames.map(name => {
                  const withdrawal = yearData.withdrawals[name] || 0;
                  if (withdrawal <= 0) return null;
                  const color = accountColors[name] || '#888';
                  
                  return (
                    <div key={name} className="flex justify-between gap-4">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {name}:
                      </span>
                      <span className="font-mono text-amber-600 dark:text-amber-400">
                        -{formatCurrency(withdrawal)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
          
          <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between font-medium">
            <span>Total Portfolio:</span>
            <span className="font-mono">{formatCurrency(yearData.totalBalance)}</span>
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-2 italic">Click for full breakdown</p>
      </div>
    );
  };

  // Retirement reference line
  const retirementIndex = yearlyData.findIndex(y => y.age === retirementAge);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-primary" />
              Depletion Timeline
            </CardTitle>
            <CardDescription className="text-xs">
              Account balances over time with withdrawal impact
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Avg. Rate: {(stats.avgMarginalRate * 100).toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground">Starting</p>
            <p className="text-sm font-bold font-mono">{formatCurrency(stats.startingTotal)}</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground">Ending</p>
            <p className="text-sm font-bold font-mono">{formatCurrency(stats.endingTotal)}</p>
          </div>
          <div className="text-center p-2 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-[10px] text-muted-foreground">Total Withdrawn</p>
            <p className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
              {formatCurrency(stats.totalWithdrawn)}
            </p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground">Depletion Count</p>
            <p className="text-sm font-bold font-mono">
              {Object.values(stats.depletionAges).filter(a => a !== null).length}/{accountNames.length}
            </p>
          </div>
        </div>

        {/* Depletion Badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {accountNames.map(name => {
            const depletionAge = stats.depletionAges[name];
            const color = accountColors[name] || '#888';
            
            return (
              <div 
                key={name}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] bg-muted/50"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span>{name}</span>
                {depletionAge ? (
                  <Badge variant="destructive" className="text-[9px] py-0 px-1">
                    Depleted @ {depletionAge}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[9px] py-0 px-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    Active
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={yearlyData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onClick={(data) => data?.activePayload?.[0]?.payload && handleBarClick(data.activePayload[0].payload)}
              style={{ cursor: 'pointer' }}
            >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                
                <XAxis 
                  dataKey="age"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickFormatter={(v) => v % 5 === 0 ? v : ''}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  width={55}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
                
                {/* Stacked Bars for each account */}
                {accountNames.map((name, index) => (
                  <Bar
                    key={name}
                    dataKey={`balances.${name}`}
                    name={name}
                    stackId="accounts"
                    fill={accountColors[name] || `hsl(${index * 60}, 70%, 50%)`}
                    radius={index === accountNames.length - 1 ? [2, 2, 0, 0] : [0, 0, 0, 0]}
                  >
                    {yearlyData.map((entry, idx) => (
                      <Cell 
                        key={`cell-${idx}`}
                        opacity={entry.depletedAccounts.includes(name) ? 0.3 : 1}
                      />
                    ))}
                  </Bar>
                ))}
                
                {/* Retirement Reference Line */}
                <ReferenceLine 
                  x={retirementAge}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        {/* Warning for early depletion */}
        {Object.entries(stats.depletionAges).some(([name, age]) => age && age < 85) && (
          <div className="mt-3 p-2 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">
              Some accounts are projected to deplete before age 85. Consider adjusting your withdrawal 
              strategy or spending to improve longevity.
            </p>
          </div>
        )}

        <DataTableDialog 
          open={dialogData.open}
          onOpenChange={(open) => setDialogData(prev => ({ ...prev, open }))}
          title={dialogData.title}
          data={dialogData.data}
          columns={dialogData.columns}
        />
      </CardContent>
    </Card>
  );
}

// ============= MOCK DATA GENERATOR FOR DEMO =============

export function generateMockDepletionData(
  currentAge: number,
  retirementAge: number,
  endAge: number = 100,
  accounts: AccountBalance[],
): { yearlyData: YearlyData[]; accountNames: string[] } {
  const yearlyData: YearlyData[] = [];
  const accountNames = accounts.map(a => a.name);
  const currentYear = new Date().getFullYear();
  
  // Track running balances
  const runningBalances: Record<string, number> = {};
  accounts.forEach(a => { runningBalances[a.name] = a.balance; });
  
  for (let age = currentAge; age <= endAge; age++) {
    const yearIndex = age - currentAge;
    const isRetired = age >= retirementAge;
    const depletedAccounts: string[] = [];
    const withdrawals: Record<string, number> = {};
    
    // Apply returns and withdrawals
    let annualNeed = isRetired ? 80000 * Math.pow(1.025, age - retirementAge) : 0;
    
    accountNames.forEach(name => {
      const account = accounts.find(a => a.name === name)!;
      const currentBalance = runningBalances[name];
      
      // Check if depleted
      if (currentBalance <= 0) {
        depletedAccounts.push(name);
        runningBalances[name] = 0;
        return;
      }
      
      // Apply return
      const returnRate = account.type === 'pretax' ? 0.06 : account.type === 'roth' ? 0.07 : 0.05;
      runningBalances[name] = currentBalance * (1 + returnRate);
      
      // Withdraw if retired and need funds
      if (isRetired && annualNeed > 0 && !depletedAccounts.includes(name)) {
        const withdrawal = Math.min(annualNeed, runningBalances[name]);
        withdrawals[name] = withdrawal;
        runningBalances[name] -= withdrawal;
        annualNeed -= withdrawal;
        
        if (runningBalances[name] <= 0) {
          depletedAccounts.push(name);
          runningBalances[name] = 0;
        }
      }
    });
    
    // Calculate marginal rate based on withdrawals from pretax
    const pretaxWithdrawal = Object.entries(withdrawals)
      .filter(([name]) => accounts.find(a => a.name === name)?.type === 'pretax')
      .reduce((sum, [, amt]) => sum + amt, 0);
    const marginalRate = pretaxWithdrawal > 50000 ? 0.22 : pretaxWithdrawal > 20000 ? 0.12 : 0.10;
    
    yearlyData.push({
      year: currentYear + yearIndex,
      age,
      balances: { ...runningBalances },
      withdrawals,
      totalBalance: Object.values(runningBalances).reduce((s, b) => s + b, 0),
      totalWithdrawal: Object.values(withdrawals).reduce((s, w) => s + w, 0),
      marginalRate,
      depletedAccounts,
    });
  }
  
  return { yearlyData, accountNames };
}
