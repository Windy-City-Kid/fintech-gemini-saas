import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { SimulationResult } from '@/hooks/useMonteCarloSimulation';
import { AskAIButton } from '@/components/advisor/AskAIButton';

interface MonteCarloChartProps {
  result: SimulationResult | null;
  retirementAge: number;
  loading?: boolean;
}

export function MonteCarloChart({ result, retirementAge, loading }: MonteCarloChartProps) {
  const chartData = useMemo(() => {
    if (!result) return [];
    
    return result.ages.map((age, i) => ({
      age,
      p5: result.percentiles.p5[i],
      p25: result.percentiles.p25[i],
      p50: result.percentiles.p50[i],
      p75: result.percentiles.p75[i],
      p95: result.percentiles.p95[i],
    }));
  }, [result]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Running 5,000 simulations...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        Click "Run Simulation" to generate Monte Carlo projections
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <AskAIButton
          chartType="monteCarlo"
          chartTitle="Monte Carlo Simulation"
          chartData={{
            successRate: result.successRate,
            medianEndingValue: result.percentiles.p50[result.percentiles.p50.length - 1],
            worstCase: result.percentiles.p5[result.percentiles.p5.length - 1],
            bestCase: result.percentiles.p95[result.percentiles.p95.length - 1],
            retirementAge,
            ageRange: `${result.ages[0]} to ${result.ages[result.ages.length - 1]}`,
          }}
        />
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradientP95" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientP75" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradientP50" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
            
            <XAxis
              dataKey="age"
              stroke="hsl(215, 20%, 55%)"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(215, 20%, 55%)"
              fontSize={12}
              tickLine={false}
              tickFormatter={formatCurrency}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 12%)',
                border: '1px solid hsl(217, 33%, 20%)',
                borderRadius: '8px',
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
              }}
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  p95: '95th Percentile (Optimistic)',
                  p75: '75th Percentile',
                  p50: 'Median Outcome',
                  p25: '25th Percentile',
                  p5: '5th Percentile (Pessimistic)',
                };
                return [formatCurrency(value), labels[name] || name];
              }}
              labelFormatter={(age) => `Age ${age}`}
            />
            
            <ReferenceLine
              x={retirementAge}
              stroke="hsl(38, 92%, 50%)"
              strokeDasharray="5 5"
              label={{ value: 'Retirement', fill: 'hsl(38, 92%, 50%)', fontSize: 12 }}
            />
            
            {/* 5th to 95th percentile band */}
            <Area
              type="monotone"
              dataKey="p95"
              stroke="none"
              fill="url(#gradientP95)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="p5"
              stroke="none"
              fill="hsl(222, 47%, 11%)"
              fillOpacity={1}
            />
            
            {/* 25th to 75th percentile band */}
            <Area
              type="monotone"
              dataKey="p75"
              stroke="hsl(152, 76%, 45%)"
              strokeWidth={1}
              strokeOpacity={0.3}
              fill="url(#gradientP75)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="p25"
              stroke="hsl(152, 76%, 45%)"
              strokeWidth={1}
              strokeOpacity={0.3}
              fill="hsl(222, 47%, 11%)"
              fillOpacity={1}
            />
            
            {/* Median line */}
            <Area
              type="monotone"
              dataKey="p50"
              stroke="hsl(152, 76%, 45%)"
              strokeWidth={2}
              fill="url(#gradientP50)"
              fillOpacity={0.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
