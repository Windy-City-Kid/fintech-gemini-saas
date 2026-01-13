import { useMemo, useId } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from 'recharts';
import { IncomeSource, IncomeCategory } from '@/hooks/useIncomeSources';
import { TrendingUp, Calendar, User, Minus } from 'lucide-react';
import { useSyncedChartHover } from '@/contexts/ChartHoverContext';
import { SnapCursor } from '@/components/charts/EnhancedTooltip';

interface LifetimeIncomeChartProps {
  sources: IncomeSource[];
  currentAge: number;
  retirementAge: number;
  annualExpenses: number;
  annualDebt: number;
  estimatedTaxes: number;
  rmdProjections?: { age: number; amount: number }[];
  baselineData?: Record<string, any>[];
  showDelta?: boolean;
}

const CATEGORY_COLORS: Record<IncomeCategory, string> = {
  work: '#3b82f6', // blue-500
  social_security: '#10b981', // emerald-500
  pension: '#a855f7', // purple-500
  annuity: '#f59e0b', // amber-500
  passive: '#06b6d4', // cyan-500
  windfall: '#f43f5e', // rose-500
  rmd: '#f97316', // orange-500
};

const CATEGORY_LABELS: Record<IncomeCategory, string> = {
  work: 'Work',
  social_security: 'Social Security',
  pension: 'Pension',
  annuity: 'Annuity',
  passive: 'Passive',
  windfall: 'Windfall',
  rmd: 'RMD',
};

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
};

interface EnhancedTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
  showDelta?: boolean;
  baselineData?: Record<string, any>[];
}

const EnhancedIncomeTooltip = ({ active, payload, label, showDelta, baselineData }: EnhancedTooltipProps) => {
  if (!active || !payload) return null;
  
  const data = payload[0]?.payload;
  if (!data) return null;
  
  const incomeItems = payload.filter((p: any) => p.dataKey !== 'expenseLine' && p.value > 0);
  const total = incomeItems.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
  const expenseLine = payload.find((p: any) => p.dataKey === 'expenseLine');
  const gap = expenseLine ? total - expenseLine.value : 0;
  
  // Find baseline data for delta comparison
  const baseline = baselineData?.find(b => b.age === data.age);
  const baselineTotal = baseline 
    ? Object.entries(baseline)
        .filter(([key]) => key in CATEGORY_COLORS)
        .reduce((sum, [_, val]) => sum + (Number(val) || 0), 0)
    : null;
  
  const hasData = incomeItems.length > 0;
  
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
          <p className="text-xs">No projected income</p>
        </div>
      )}

      {/* Income Breakdown */}
      {hasData && (
        <div className="space-y-2">
          {incomeItems.map((entry: any, index: number) => {
            const baselineValue = baseline?.[entry.dataKey];
            const delta = showDelta && baselineValue !== undefined ? entry.value - baselineValue : null;
            
            return (
              <div key={index} className="flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-3 h-3 rounded-sm flex-shrink-0 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate text-sm">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono font-medium">{formatCurrency(entry.value)}</span>
                  {delta !== null && delta !== 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${delta > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                      {delta > 0 ? '+' : ''}{formatCurrency(delta)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Totals */}
      {hasData && (
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          <div className="flex justify-between gap-4">
            <span className="font-medium">Total Income</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold">{formatCurrency(total)}</span>
              {showDelta && baselineTotal !== null && total !== baselineTotal && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${total > baselineTotal ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                  {total > baselineTotal ? '+' : ''}{formatCurrency(total - baselineTotal)}
                </span>
              )}
            </div>
          </div>
          {expenseLine && (
            <>
              <div className="flex justify-between gap-4 text-blue-500">
                <span>Expenses + Taxes</span>
                <span className="font-mono">{formatCurrency(expenseLine.value)}</span>
              </div>
              <div className={`flex justify-between gap-4 font-medium ${gap >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                <span>{gap >= 0 ? 'Surplus' : 'Gap'}</span>
                <span className="font-mono">{formatCurrency(Math.abs(gap))}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export function LifetimeIncomeChart({
  sources,
  currentAge,
  retirementAge,
  annualExpenses,
  annualDebt,
  estimatedTaxes,
  rmdProjections = [],
  baselineData,
  showDelta = false,
}: LifetimeIncomeChartProps) {
  const chartId = useId();
  const { hoveredAge, handleMouseMove, handleMouseLeave, isSourceChart } = useSyncedChartHover(chartId);
  
  const chartData = useMemo(() => {
    const data: Record<string, any>[] = [];
    const currentYear = new Date().getFullYear();
    
    for (let age = currentAge; age <= 100; age += 2) {
      const year = currentYear + (age - currentAge);
      const point: Record<string, any> = {
        age,
        year,
        expenseLine: annualExpenses + annualDebt + estimatedTaxes,
      };
      
      // Initialize all categories to 0
      (Object.keys(CATEGORY_COLORS) as IncomeCategory[]).forEach(cat => {
        point[cat] = 0;
      });
      
      // Sum income from each source for this age
      sources.forEach(source => {
        const startAge = source.start_year 
          ? Math.max(currentAge, currentAge + (source.start_year - currentYear))
          : currentAge;
        const endAge = source.end_year 
          ? currentAge + (source.end_year - currentYear)
          : 100;
        
        // Check milestone-based dates
        let isActive = age >= startAge && age <= endAge;
        
        if (source.start_milestone === 'retirement' && age < retirementAge) {
          isActive = false;
        }
        if (source.end_milestone === 'retirement' && age >= retirementAge) {
          isActive = false;
        }
        
        if (isActive) {
          const annualAmount = source.frequency === 'monthly' 
            ? source.amount * 12 
            : source.amount;
          
          // Apply inflation if configured
          const inflationMultiplier = source.inflation_adjusted 
            ? Math.pow(1 + (source.custom_inflation_rate || 0.025), age - currentAge)
            : 1;
          
          point[source.category] += annualAmount * inflationMultiplier;
        }
      });
      
      // Add RMD projections
      const rmdForAge = rmdProjections.find(r => r.age === age);
      if (rmdForAge) {
        point.rmd = rmdForAge.amount;
      }
      
      data.push(point);
    }
    
    return data;
  }, [sources, currentAge, retirementAge, annualExpenses, annualDebt, estimatedTaxes, rmdProjections]);

  const activeCategories = useMemo(() => {
    const categories = new Set<IncomeCategory>();
    sources.forEach(s => categories.add(s.category));
    if (rmdProjections.length > 0) categories.add('rmd');
    return Array.from(categories);
  }, [sources, rmdProjections]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Lifetime Income Projection
        </CardTitle>
        <CardDescription>
          Stacked income by category with expense overlay (blue line)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={chartData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <XAxis 
                dataKey="age" 
                tickFormatter={(v) => `${v}`}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                width={60}
              />
              <Tooltip 
                content={<EnhancedIncomeTooltip showDelta={showDelta} baselineData={baselineData} />}
                cursor={<SnapCursor />}
                isAnimationActive={false}
              />
              <Legend />
              
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
              
              {activeCategories.map(category => (
                <Bar
                  key={category}
                  dataKey={category}
                  name={CATEGORY_LABELS[category]}
                  fill={CATEGORY_COLORS[category]}
                  stackId="income"
                />
              ))}
              
              <Line
                type="monotone"
                dataKey="expenseLine"
                name="Expenses + Taxes"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                strokeDasharray="5 5"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
