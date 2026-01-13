import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { AnnualCashFlowSummary } from '@/lib/cashFlowEngine';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface SurplusGapChartProps {
  annualSummaries: AnnualCashFlowSummary[];
  currentAge: number;
  retirementAge: number;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
};

// Color palette for the 4 bar types
const COLORS = {
  savedSurplus: '#10b981', // Emerald - green bars
  unsavedSurplus: '#84cc16', // Lime - light green/yellow bars
  fundedGap: '#f97316', // Orange - funded gaps
  unfundedGap: '#dc2626', // Red - unfunded gaps (lifetime debt)
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  const totalSurplus = data.savedSurplus + data.unsavedSurplus;
  const totalGap = data.fundedGap + data.unfundedGap;
  
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">Age {data.age} ({data.year})</p>
      
      {totalSurplus > 0 && (
        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-2 text-emerald-500">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-medium">Excess Income</span>
          </div>
          {data.savedSurplus > 0 && (
            <div className="flex justify-between gap-4 text-emerald-600">
              <span className="text-xs">Saved to account</span>
              <span className="font-mono">{formatCurrency(data.savedSurplus)}</span>
            </div>
          )}
          {data.unsavedSurplus > 0 && (
            <div className="flex justify-between gap-4 text-lime-600">
              <span className="text-xs">Lifestyle spending</span>
              <span className="font-mono">{formatCurrency(data.unsavedSurplus)}</span>
            </div>
          )}
        </div>
      )}
      
      {totalGap > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-orange-500">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="font-medium">Cash Shortfall</span>
          </div>
          {data.fundedGap > 0 && (
            <div className="flex justify-between gap-4 text-orange-600">
              <span className="text-xs">Funded from savings</span>
              <span className="font-mono">{formatCurrency(data.fundedGap)}</span>
            </div>
          )}
          {data.unfundedGap > 0 && (
            <div className="flex justify-between gap-4 text-red-600">
              <span className="text-xs">Unfunded (debt)</span>
              <span className="font-mono">{formatCurrency(data.unfundedGap)}</span>
            </div>
          )}
        </div>
      )}
      
      {data.cumulativeDebt > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <div className="flex justify-between gap-4 text-red-500 font-medium">
            <span>Cumulative Debt</span>
            <span className="font-mono">{formatCurrency(data.cumulativeDebt)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export function SurplusGapChart({
  annualSummaries,
  currentAge,
  retirementAge,
}: SurplusGapChartProps) {
  // Prepare chart data - sample every 2 years for readability
  const chartData = useMemo(() => {
    return annualSummaries
      .filter((_, index) => index % 2 === 0)
      .map(summary => ({
        age: summary.age,
        year: summary.year,
        // Positive values (above zero line)
        savedSurplus: summary.savedSurplus,
        unsavedSurplus: summary.unsavedSurplus,
        // Negative values (below zero line)
        fundedGap: -summary.fundedGap,
        unfundedGap: -summary.unfundedGap,
        // For tooltip
        cumulativeDebt: summary.cumulativeDebt,
      }));
  }, [annualSummaries]);
  
  // Calculate summary statistics
  const stats = useMemo(() => {
    const totalSaved = annualSummaries.reduce((sum, s) => sum + s.savedSurplus, 0);
    const totalUnsaved = annualSummaries.reduce((sum, s) => sum + s.unsavedSurplus, 0);
    const totalFunded = annualSummaries.reduce((sum, s) => sum + s.fundedGap, 0);
    const totalUnfunded = annualSummaries.reduce((sum, s) => sum + s.unfundedGap, 0);
    
    return { totalSaved, totalUnsaved, totalFunded, totalUnfunded };
  }, [annualSummaries]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Surplus vs. Gap Analysis
        </CardTitle>
        <CardDescription>
          Annual cash flow breakdown from age {currentAge} to 100
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground">Saved Surplus</p>
            <p className="text-lg font-bold font-mono text-emerald-500">
              {formatCurrency(stats.totalSaved)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-lime-500/10 border border-lime-500/20">
            <p className="text-xs text-muted-foreground">Extra Spending</p>
            <p className="text-lg font-bold font-mono text-lime-600">
              {formatCurrency(stats.totalUnsaved)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <p className="text-xs text-muted-foreground">Funded Gaps</p>
            <p className="text-lg font-bold font-mono text-orange-500">
              {formatCurrency(stats.totalFunded)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${stats.totalUnfunded > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/50 border-border'} border`}>
            <p className="text-xs text-muted-foreground">Lifetime Debt</p>
            <p className={`text-lg font-bold font-mono ${stats.totalUnfunded > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {formatCurrency(stats.totalUnfunded)}
            </p>
          </div>
        </div>
        
        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis 
                dataKey="age" 
                tickFormatter={(v) => `${v}`}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 11 }}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
              <ReferenceLine 
                x={retirementAge} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: 'Retire', position: 'top', fontSize: 10 }}
              />
              
              {/* Positive bars (surplus) - stacked */}
              <Bar 
                dataKey="savedSurplus" 
                name="Saved Surplus"
                fill={COLORS.savedSurplus}
                stackId="positive"
              />
              <Bar 
                dataKey="unsavedSurplus" 
                name="Lifestyle Spending"
                fill={COLORS.unsavedSurplus}
                stackId="positive"
              />
              
              {/* Negative bars (gaps) - stacked */}
              <Bar 
                dataKey="fundedGap" 
                name="Funded Gap"
                fill={COLORS.fundedGap}
                stackId="negative"
              />
              <Bar 
                dataKey="unfundedGap" 
                name="Unfunded Gap"
                fill={COLORS.unfundedGap}
                stackId="negative"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.savedSurplus }} />
            <span>Saved Surplus</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.unsavedSurplus }} />
            <span>Lifestyle Spending</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.fundedGap }} />
            <span>Funded from Savings</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS.unfundedGap }} />
            <span>Unfunded (Debt)</span>
          </div>
        </div>
        
        {/* Warning if lifetime debt exists */}
        {stats.totalUnfunded > 0 && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-600">Lifetime Debt Warning</p>
              <p className="text-sm text-muted-foreground">
                Your plan shows {formatCurrency(stats.totalUnfunded)} in unfunded gaps. 
                This occurs when savings are exhausted but expenses remain. Consider 
                reducing expenses, increasing savings, or delaying retirement.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
