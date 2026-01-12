/**
 * Guardrail Stress Test Chart
 * Visualizes trials where the spending guardrail (10% reduction) was triggered
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { ShieldAlert, TrendingDown, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface GuardrailEvent {
  yearInRetirement: number;
  activations: number;
  percentage: number;
}

interface GuardrailChartProps {
  guardrailEvents: GuardrailEvent[];
  totalIterations: number;
  loading?: boolean;
}

export function GuardrailChart({ guardrailEvents, totalIterations, loading }: GuardrailChartProps) {
  const chartData = useMemo(() => {
    if (!guardrailEvents || guardrailEvents.length === 0) return [];
    return guardrailEvents;
  }, [guardrailEvents]);

  const maxActivations = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.max(...chartData.map(d => d.activations));
  }, [chartData]);

  const totalActivations = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.activations, 0);
  }, [chartData]);

  const peakYear = useMemo(() => {
    if (chartData.length === 0) return null;
    const peak = chartData.reduce((max, d) => 
      d.activations > max.activations ? d : max
    , chartData[0]);
    return peak;
  }, [chartData]);

  if (loading) {
    return (
      <div className="stat-card">
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing guardrail events...</p>
          </div>
        </div>
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Spending Guardrails</h3>
            <p className="text-sm text-muted-foreground">Run simulation to see stress events</p>
          </div>
        </div>
        <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">
          Guardrail analysis will appear after running the simulation
        </div>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Spending Guardrails
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      When portfolio drops below 80% of retirement start value, 
                      spending is automatically reduced by 10% to preserve capital.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </h3>
            <p className="text-sm text-muted-foreground">
              Trials where 10% spending cut was triggered
            </p>
          </div>
        </div>
        
        {/* Summary stats */}
        <div className="text-right">
          <p className="text-2xl font-bold font-mono text-amber-500">
            {((totalActivations / totalIterations) * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground">trials triggered guardrails</p>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
          <p className="text-xs text-muted-foreground">Total Events</p>
          <p className="text-lg font-semibold font-mono">{totalActivations.toLocaleString()}</p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
          <p className="text-xs text-muted-foreground">Peak Year</p>
          <p className="text-lg font-semibold font-mono">
            {peakYear ? `Year ${peakYear.yearInRetirement}` : '-'}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
          <p className="text-xs text-muted-foreground">Peak %</p>
          <p className="text-lg font-semibold font-mono">
            {peakYear ? `${peakYear.percentage.toFixed(1)}%` : '-'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" vertical={false} />
            <XAxis
              dataKey="yearInRetirement"
              stroke="hsl(215, 20%, 55%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `Y${v}`}
            />
            <YAxis
              stroke="hsl(215, 20%, 55%)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${((v / totalIterations) * 100).toFixed(0)}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 12%)',
                border: '1px solid hsl(217, 33%, 20%)',
                borderRadius: '8px',
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
              }}
              formatter={(value: number) => [
                `${value.toLocaleString()} trials (${((value / totalIterations) * 100).toFixed(1)}%)`,
                'Guardrail Triggered'
              ]}
              labelFormatter={(year) => `Year ${year} of Retirement`}
            />
            <ReferenceLine
              y={totalIterations * 0.1}
              stroke="hsl(0, 70%, 50%)"
              strokeDasharray="3 3"
              label={{ 
                value: '10% threshold', 
                fill: 'hsl(0, 70%, 50%)', 
                fontSize: 10,
                position: 'right'
              }}
            />
            <Bar 
              dataKey="activations" 
              radius={[4, 4, 0, 0]}
              maxBarSize={30}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.percentage > 10 
                    ? 'hsl(0, 70%, 50%)' 
                    : entry.percentage > 5 
                      ? 'hsl(38, 92%, 50%)' 
                      : 'hsl(152, 76%, 45%)'
                  }
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(152, 76%, 45%)' }} />
          <span className="text-xs text-muted-foreground">&lt;5% trials</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
          <span className="text-xs text-muted-foreground">5-10% trials</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(0, 70%, 50%)' }} />
          <span className="text-xs text-muted-foreground">&gt;10% trials</span>
        </div>
      </div>

      {/* Safety insight */}
      <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <div className="flex items-start gap-2">
          <TrendingDown className="h-4 w-4 text-amber-500 mt-0.5" />
          <div className="text-xs text-amber-200">
            <span className="font-medium">Safety Net Active: </span>
            {totalActivations > 0 
              ? `In ${((totalActivations / totalIterations) * 100).toFixed(1)}% of trials, spending was reduced to protect your portfolio.`
              : 'Your plan has sufficient buffer - guardrails rarely triggered.'
            }
          </div>
        </div>
      </div>
    </div>
  );
}
