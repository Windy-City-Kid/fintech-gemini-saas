/**
 * Social Security Strategy Comparison Chart
 * 
 * Line chart overlaying three strategies:
 * - Earliest (both at 62)
 * - Balanced (both at FRA)
 * - Optimal (higher earner delays)
 * 
 * With break-even markers and dynamic tooltips
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClaimingStrategy } from '@/lib/socialSecurityOptimizer';

interface SSStrategyComparisonChartProps {
  earliest: ClaimingStrategy;
  balanced: ClaimingStrategy;
  optimal: ClaimingStrategy;
  customStrategy?: ClaimingStrategy;
  currentAge: number;
}

export function SSStrategyComparisonChart({
  earliest,
  balanced,
  optimal,
  customStrategy,
  currentAge,
}: SSStrategyComparisonChartProps) {
  // Build chart data from cumulative benefits
  const chartData = useMemo(() => {
    const data: Array<{
      age: number;
      earliest: number;
      balanced: number;
      optimal: number;
      custom?: number;
    }> = [];

    const maxLength = Math.max(
      earliest.benefitsByAge.length,
      balanced.benefitsByAge.length,
      optimal.benefitsByAge.length
    );

    for (let i = 0; i < maxLength; i++) {
      const age = currentAge + i;
      data.push({
        age,
        earliest: earliest.benefitsByAge[i]?.cumulativeBenefit || 0,
        balanced: balanced.benefitsByAge[i]?.cumulativeBenefit || 0,
        optimal: optimal.benefitsByAge[i]?.cumulativeBenefit || 0,
        custom: customStrategy?.benefitsByAge[i]?.cumulativeBenefit,
      });
    }

    return data;
  }, [earliest, balanced, optimal, customStrategy, currentAge]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  interface TooltipEntry {
    name: string;
    value: number;
    color?: string;
    [key: string]: unknown;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string | number;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4 min-w-[220px]">
        <div className="font-semibold text-foreground mb-2">Age {label}</div>
        <div className="space-y-2">
          {payload.map((entry: TooltipEntry) => (
            <div key={entry.name} className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground capitalize">
                  {entry.name === 'custom' ? 'Your Strategy' : entry.name}
                </span>
              </div>
              <span className="font-mono text-sm font-medium">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
        
        {/* Show which strategy is winning */}
        {payload.length > 1 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              {(() => {
                const values = payload.map((p: TooltipEntry) => ({ name: p.name, value: p.value }));
                const winner = values.reduce((a, b) => a.value > b.value ? a : b);
                return `${winner.name === 'custom' ? 'Your Strategy' : winner.name} leads by ${formatCurrency(winner.value - Math.min(...values.map((v) => v.value)))}`;
              })()}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Find break-even points for reference lines
  const breakEvenPoints = useMemo(() => {
    const points: Array<{ age: number; label: string }> = [];
    
    // Find where optimal crosses earliest
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].optimal > chartData[i].earliest && 
          chartData[i - 1].optimal <= chartData[i - 1].earliest) {
        points.push({ age: chartData[i].age, label: 'Optimal vs Early' });
        break;
      }
    }
    
    // Find where balanced crosses earliest
    for (let i = 1; i < chartData.length; i++) {
      if (chartData[i].balanced > chartData[i].earliest && 
          chartData[i - 1].balanced <= chartData[i - 1].earliest) {
        points.push({ age: chartData[i].age, label: 'Balanced vs Early' });
        break;
      }
    }
    
    return points;
  }, [chartData]);

  return (
    <div className="space-y-4">
      {/* Break-even badges */}
      <div className="flex flex-wrap gap-2">
        {breakEvenPoints.map((point, i) => (
          <Badge key={i} variant="outline" className="font-normal">
            <span className="w-2 h-2 rounded-full bg-chart-4 mr-2" />
            Break-even ({point.label}): Age {point.age}
          </Badge>
        ))}
      </div>

      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis
              dataKey="age"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(age) => `${age}`}
              label={{ value: 'Age', position: 'bottom', offset: 0, fontSize: 12 }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatCurrency}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              height={36}
              formatter={(value) => value === 'custom' ? 'Your Strategy' : value.charAt(0).toUpperCase() + value.slice(1)}
            />

            {/* Break-even reference lines */}
            {breakEvenPoints.map((point, i) => (
              <ReferenceLine
                key={i}
                x={point.age}
                stroke="hsl(var(--chart-4))"
                strokeDasharray="5 5"
                strokeWidth={2}
              />
            ))}

            {/* Strategy lines */}
            <Line
              type="monotone"
              dataKey="earliest"
              name="earliest"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="balanced"
              name="balanced"
              stroke="hsl(var(--chart-3))"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="optimal"
              name="optimal"
              stroke="hsl(var(--chart-2))"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />
            {customStrategy && (
              <Line
                type="monotone"
                dataKey="custom"
                name="custom"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Strategy summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Earliest (Age 62)</p>
                <p className="text-lg font-bold font-mono">
                  {formatCurrency(earliest.lifetimeBenefits)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="text-sm font-mono">${earliest.monthlyBenefitAtClaim.combined.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-chart-3/10 border-chart-3/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Balanced (FRA)</p>
                <p className="text-lg font-bold font-mono text-chart-3">
                  {formatCurrency(balanced.lifetimeBenefits)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="text-sm font-mono">${balanced.monthlyBenefitAtClaim.combined.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-chart-2/10 border-chart-2/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Optimal (Delay 70)</p>
                <p className="text-lg font-bold font-mono text-chart-2">
                  {formatCurrency(optimal.lifetimeBenefits)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Monthly</p>
                <p className="text-sm font-mono">${optimal.monthlyBenefitAtClaim.combined.toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
