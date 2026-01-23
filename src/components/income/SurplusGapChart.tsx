import { useMemo, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { AnnualCashFlowSummary } from '@/lib/cashFlowEngine';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, User, Minus } from 'lucide-react';
import { useSyncedChartHover } from '@/contexts/ChartHoverContext';
import { SnapCursor } from '@/components/charts/EnhancedTooltip';

interface SurplusGapChartProps {
  annualSummaries: AnnualCashFlowSummary[];
  currentAge: number;
  retirementAge: number;
  baselineData?: AnnualCashFlowSummary[];
  showDelta?: boolean;
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

interface GapTooltipPayloadItem {
  dataKey?: string;
  value?: number;
  payload?: AnnualCashFlowSummary;
  name?: string;
  color?: string;
  [key: string]: unknown;
}

interface EnhancedGapTooltipProps {
  active?: boolean;
  payload?: GapTooltipPayloadItem[];
  label?: string | number;
  showDelta?: boolean;
  baselineData?: AnnualCashFlowSummary[];
}

const EnhancedGapTooltip = ({ active, payload, label, showDelta, baselineData }: EnhancedGapTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  const totalSurplus = data.savedSurplus + data.unsavedSurplus;
  const totalGap = Math.abs(data.fundedGap) + Math.abs(data.unfundedGap);
  const hasData = totalSurplus > 0 || totalGap > 0;
  
  // Find baseline for delta
  const baseline = baselineData?.find(b => b.age === data.age);
  
  return (
    <div 
      className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-4 text-sm min-w-[220px] animate-scale-in"
      style={{ transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{data.year}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="text-xs">Age {data.age}</span>
        </div>
      </div>

      {/* Empty State */}
      {!hasData && (
        <div className="py-4 text-center text-muted-foreground">
          <Minus className="h-5 w-5 mx-auto mb-1 opacity-50" />
          <p className="text-xs">No projected activity</p>
        </div>
      )}
      
      {totalSurplus > 0 && (
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-emerald-500">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="font-medium text-xs uppercase tracking-wide">Excess Income</span>
          </div>
          {data.savedSurplus > 0 && (
            <div className="flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm transition-transform group-hover:scale-110" style={{ backgroundColor: COLORS.savedSurplus }} />
                <span className="text-sm">Saved to account</span>
              </div>
              <span className="font-mono font-medium">{formatCurrency(data.savedSurplus)}</span>
            </div>
          )}
          {data.unsavedSurplus > 0 && (
            <div className="flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm transition-transform group-hover:scale-110" style={{ backgroundColor: COLORS.unsavedSurplus }} />
                <span className="text-sm">Lifestyle spending</span>
              </div>
              <span className="font-mono font-medium">{formatCurrency(data.unsavedSurplus)}</span>
            </div>
          )}
        </div>
      )}
      
      {totalGap > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-orange-500">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="font-medium text-xs uppercase tracking-wide">Cash Shortfall</span>
          </div>
          {Math.abs(data.fundedGap) > 0 && (
            <div className="flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm transition-transform group-hover:scale-110" style={{ backgroundColor: COLORS.fundedGap }} />
                <span className="text-sm">Funded from savings</span>
              </div>
              <span className="font-mono font-medium">{formatCurrency(Math.abs(data.fundedGap))}</span>
            </div>
          )}
          {Math.abs(data.unfundedGap) > 0 && (
            <div className="flex items-center justify-between gap-3 group">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm transition-transform group-hover:scale-110" style={{ backgroundColor: COLORS.unfundedGap }} />
                <span className="text-sm">Unfunded (debt)</span>
              </div>
              <span className="font-mono font-medium text-red-500">{formatCurrency(Math.abs(data.unfundedGap))}</span>
            </div>
          )}
        </div>
      )}
      
      {data.cumulativeDebt > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex justify-between gap-4 text-red-500 font-medium">
            <span>Cumulative Debt</span>
            <span className="font-mono font-bold">{formatCurrency(data.cumulativeDebt)}</span>
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
  baselineData,
  showDelta = false,
}: SurplusGapChartProps) {
  const chartId = useId();
  const { hoveredAge, handleMouseMove, handleMouseLeave, isSourceChart } = useSyncedChartHover(chartId);
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
            <BarChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
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
              <Tooltip 
                content={<EnhancedGapTooltip showDelta={showDelta} baselineData={baselineData} />}
                cursor={<SnapCursor />}
                isAnimationActive={false}
              />
              
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={2} />
              <ReferenceLine 
                x={retirementAge} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: 'Retire', position: 'top', fontSize: 10 }}
              />
              
              {/* Synced hover line */}
              {hoveredAge !== null && !isSourceChart && (
                <ReferenceLine 
                  x={hoveredAge} 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  style={{ opacity: 0.6, transition: 'all 150ms ease-out' }}
                />
              )}
              
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
