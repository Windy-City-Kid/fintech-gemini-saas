import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Line, ComposedChart } from 'recharts';
import { IncomeSource, IncomeCategory } from '@/hooks/useIncomeSources';
import { TrendingUp } from 'lucide-react';

interface LifetimeIncomeChartProps {
  sources: IncomeSource[];
  currentAge: number;
  retirementAge: number;
  annualExpenses: number;
  annualDebt: number;
  estimatedTaxes: number;
  rmdProjections?: { age: number; amount: number }[];
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  
  const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
  const expenseLine = payload.find((p: any) => p.dataKey === 'expenseLine');
  const gap = expenseLine ? total - expenseLine.value : 0;
  
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">Age {label}</p>
      {payload
        .filter((entry: any) => entry.dataKey !== 'expenseLine' && entry.value > 0)
        .map((entry: any, index: number) => (
          <div key={index} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}</span>
            <span className="font-mono">{formatCurrency(entry.value)}</span>
          </div>
        ))}
      <div className="border-t border-border mt-2 pt-2">
        <div className="flex justify-between gap-4 font-medium">
          <span>Total Income</span>
          <span className="font-mono">{formatCurrency(total)}</span>
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
}: LifetimeIncomeChartProps) {
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
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <ReferenceLine 
                x={retirementAge} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: 'Retire', position: 'top', fontSize: 10 }}
              />
              
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
