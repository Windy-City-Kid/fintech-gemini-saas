/**
 * RMD Impact Chart
 * 
 * Shows reduction in future Required Minimum Distributions due to early conversions
 */

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ConversionYear } from '@/lib/rothConversionEngine';

interface RMDImpactChartProps {
  years: ConversionYear[];
}

export function RMDImpactChart({ years }: RMDImpactChartProps) {
  const chartData = useMemo(() => {
    // Filter to only show years with RMD data (age 73+)
    const rmdYears = years.filter(y => y.rmdWithoutConversion > 0 || y.rmdWithConversion > 0);
    
    // If no RMD years in conversion window, project forward
    if (rmdYears.length === 0 && years.length > 0) {
      const lastYear = years[years.length - 1];
      const projectedData = [];
      
      // Project RMDs from age 73 to 90
      for (let age = 73; age <= 90; age++) {
        const yearsGrown = age - lastYear.age;
        const baseGrowthRate = 1.05; // 5% growth
        
        // Baseline: no conversions, full pre-tax balance grows
        const baselineBalance = lastYear.remainingPreTax * Math.pow(baseGrowthRate, yearsGrown) + 
          lastYear.cumulativeConverted * Math.pow(baseGrowthRate, yearsGrown);
        
        // With conversions: reduced pre-tax balance
        const withConversionBalance = lastYear.remainingPreTax * Math.pow(baseGrowthRate, yearsGrown);
        
        // RMD factors (simplified)
        const factor = 27.4 - (age - 73) * 0.9;
        const rmdBaseline = baselineBalance / Math.max(factor, 6);
        const rmdWithConversion = withConversionBalance / Math.max(factor, 6);
        
        projectedData.push({
          age,
          year: new Date().getFullYear() + (age - years[0].age),
          rmdBaseline,
          rmdWithConversion,
          reduction: rmdBaseline - rmdWithConversion,
          reductionPercent: rmdBaseline > 0 ? ((rmdBaseline - rmdWithConversion) / rmdBaseline) * 100 : 0,
        });
      }
      
      return projectedData;
    }
    
    return rmdYears.map((y) => ({
      age: y.age,
      year: y.year,
      rmdBaseline: y.rmdWithoutConversion,
      rmdWithConversion: y.rmdWithConversion,
      reduction: y.rmdWithoutConversion - y.rmdWithConversion,
      reductionPercent: y.rmdWithoutConversion > 0 
        ? ((y.rmdWithoutConversion - y.rmdWithConversion) / y.rmdWithoutConversion) * 100 
        : 0,
    }));
  }, [years]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-52">
        <p className="font-semibold text-sm mb-2">
          Age {label}
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">RMD (No Conversions):</span>
            <span className="font-mono text-red-600">
              {formatCurrency(data.rmdBaseline)}
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">RMD (With Conversions):</span>
            <span className="font-mono text-blue-600">
              {formatCurrency(data.rmdWithConversion)}
            </span>
          </div>
          <div className="border-t border-border pt-1.5 mt-1.5">
            <div className="flex justify-between gap-4">
              <span className="text-green-700 dark:text-green-400 font-medium">Reduction:</span>
              <span className="font-mono font-bold text-green-700 dark:text-green-400">
                {formatCurrency(data.reduction)} ({data.reductionPercent.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calculate total reduction
  const totalReduction = chartData.reduce((sum, d) => sum + d.reduction, 0);
  const avgReductionPercent = chartData.length > 0
    ? chartData.reduce((sum, d) => sum + d.reductionPercent, 0) / chartData.length
    : 0;

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <p>RMD projections will appear after conversion strategy is calculated</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rmdBaselineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="rmdWithConvGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis 
              dataKey="age" 
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            <Area
              type="monotone"
              dataKey="rmdBaseline"
              name="RMD Without Conversions"
              stroke="hsl(var(--destructive))"
              fill="url(#rmdBaselineGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="rmdWithConversion"
              name="RMD With Conversions"
              stroke="hsl(var(--primary))"
              fill="url(#rmdWithConvGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">Total RMD Reduction</p>
          <p className="text-xl font-bold font-mono text-green-600">
            {formatCurrency(totalReduction)}
          </p>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground">Average Reduction</p>
          <p className="text-xl font-bold font-mono text-green-600">
            {avgReductionPercent.toFixed(0)}%
          </p>
        </div>
      </div>
    </div>
  );
}
