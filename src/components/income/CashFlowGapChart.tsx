import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { IncomeSource } from '@/hooks/useIncomeSources';
import { ArrowUpDown } from 'lucide-react';

interface CashFlowGapChartProps {
  sources: IncomeSource[];
  currentAge: number;
  retirementAge: number;
  annualExpenses: number;
  annualDebt: number;
  estimatedTaxes: number;
  rmdProjections?: { age: number; amount: number }[];
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number; [key: string]: unknown }>;
  label?: string | number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;
  
  const value = payload[0]?.value ?? 0;
  const isSurplus = value >= 0;
  
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2">Age {label}</p>
      <div className={`flex justify-between gap-4 ${isSurplus ? 'text-emerald-500' : 'text-rose-500'}`}>
        <span>{isSurplus ? 'Excess Income' : 'Savings Drawdown'}</span>
        <span className="font-mono">{formatCurrency(Math.abs(value))}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {isSurplus 
          ? 'Income exceeds expenses - available for saving or spending'
          : 'Expenses exceed income - withdrawing from savings'}
      </p>
    </div>
  );
};

export function CashFlowGapChart({
  sources,
  currentAge,
  retirementAge,
  annualExpenses,
  annualDebt,
  estimatedTaxes,
  rmdProjections = [],
}: CashFlowGapChartProps) {
  const chartData = useMemo(() => {
    const data: { age: number; gap: number }[] = [];
    const currentYear = new Date().getFullYear();
    const totalExpenses = annualExpenses + annualDebt + estimatedTaxes;
    
    for (let age = currentAge; age <= 100; age += 2) {
      const year = currentYear + (age - currentAge);
      let totalIncome = 0;
      
      // Sum income from each source for this age
      sources.forEach(source => {
        const startAge = source.start_year 
          ? Math.max(currentAge, currentAge + (source.start_year - currentYear))
          : currentAge;
        const endAge = source.end_year 
          ? currentAge + (source.end_year - currentYear)
          : 100;
        
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
          
          const inflationMultiplier = source.inflation_adjusted 
            ? Math.pow(1 + (source.custom_inflation_rate || 0.025), age - currentAge)
            : 1;
          
          totalIncome += annualAmount * inflationMultiplier;
        }
      });
      
      // Add RMD
      const rmdForAge = rmdProjections.find(r => r.age === age);
      if (rmdForAge) {
        totalIncome += rmdForAge.amount;
      }
      
      // Calculate gap (positive = surplus, negative = drawdown)
      const gap = totalIncome - totalExpenses;
      data.push({ age, gap });
    }
    
    return data;
  }, [sources, currentAge, retirementAge, annualExpenses, annualDebt, estimatedTaxes, rmdProjections]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpDown className="h-5 w-5 text-primary" />
          Cash Flow Surplus/Gap
        </CardTitle>
        <CardDescription>
          Green = excess income to save • Red = drawing from savings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
              
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
              <ReferenceLine 
                x={retirementAge} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: 'Retire', position: 'top', fontSize: 10 }}
              />
              
              <Bar dataKey="gap" name="Cash Flow">
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.gap >= 0 ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Excess Income (Save)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-muted-foreground">Gap (Drawdown)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
