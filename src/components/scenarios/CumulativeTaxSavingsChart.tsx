/**
 * Cumulative Tax Savings Chart
 * 
 * Line chart comparing Baseline Lifetime Tax vs Optimized Lifetime Tax over time
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { OptimizationResult } from '@/lib/rothOptimizationEngine';

interface CumulativeTaxSavingsChartProps {
  result: OptimizationResult;
  currentAge: number;
  lifeExpectancy: number;
}

export function CumulativeTaxSavingsChart({
  result,
  currentAge,
  lifeExpectancy,
}: CumulativeTaxSavingsChartProps) {
  const chartData = useMemo(() => {
    // Extend data to show full lifetime projection
    const data: { year: number; age: number; baseline: number; optimized: number; savings: number }[] = [];
    
    const yearData = result.cumulativeTaxByYear;
    const startYear = yearData[0]?.year || new Date().getFullYear();
    
    // Add conversion phase data
    yearData.forEach(y => {
      const age = currentAge + (y.year - startYear);
      data.push({
        year: y.year,
        age,
        baseline: y.baseline,
        optimized: y.optimized,
        savings: y.baseline - y.optimized,
      });
    });
    
    // Project forward through RMD phase
    if (data.length > 0) {
      const lastData = data[data.length - 1];
      let cumulativeBaseline = lastData.baseline;
      let cumulativeOptimized = lastData.optimized;
      
      // Simple projection based on ratio
      const baselineGrowthRate = 0.04;
      const optimizedGrowthRate = 0.025;
      
      for (let age = lastData.age + 1; age <= lifeExpectancy; age++) {
        const year = lastData.year + (age - lastData.age);
        cumulativeBaseline *= (1 + baselineGrowthRate);
        cumulativeOptimized *= (1 + optimizedGrowthRate);
        
        data.push({
          year,
          age,
          baseline: cumulativeBaseline,
          optimized: cumulativeOptimized,
          savings: cumulativeBaseline - cumulativeOptimized,
        });
      }
    }
    
    return data;
  }, [result, currentAge, lifeExpectancy]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const maxSavings = chartData.length > 0 
    ? chartData[chartData.length - 1].savings 
    : 0;

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload?: { age: number; baseline: number; optimized: number; savings: number }; [key: string]: unknown }>;
    label?: string | number;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-4 shadow-xl min-w-52">
        <p className="font-semibold text-sm mb-3">
          Age {data.age} ({data.year})
        </p>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              Baseline Taxes
            </span>
            <span className="font-mono text-red-600">
              {formatCurrency(data.baseline)}
            </span>
          </div>
          
          <div className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500" />
              Optimized Taxes
            </span>
            <span className="font-mono text-orange-600">
              {formatCurrency(data.optimized)}
            </span>
          </div>
          
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between gap-4 bg-green-500/10 -mx-4 px-4 py-2 rounded-b-lg">
              <span className="font-medium text-green-700 dark:text-green-400">
                Your Savings
              </span>
              <span className="font-mono font-bold text-green-700 dark:text-green-400">
                {formatCurrency(data.savings)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between px-2">
        <div>
          <p className="text-xs text-muted-foreground">Lifetime Tax Savings</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(result.lifetimeTaxSavings)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Projected at Age {lifeExpectancy}</p>
          <p className="text-lg font-semibold text-green-600">
            {formatCurrency(maxSavings)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="age" 
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              label={{ value: 'Age', position: 'bottom', offset: 0, className: 'text-xs fill-muted-foreground' }}
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={65}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            />
            <Area
              type="monotone"
              dataKey="savings"
              name="Tax Savings"
              fill="url(#savingsGradient)"
              stroke="hsl(var(--chart-2))"
              strokeWidth={0}
            />
            <Line
              type="monotone"
              dataKey="baseline"
              name="Baseline (No Conversions)"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="optimized"
              name="With Conversions"
              stroke="hsl(var(--warning))"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
