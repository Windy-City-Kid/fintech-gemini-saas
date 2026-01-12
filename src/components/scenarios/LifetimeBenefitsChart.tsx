import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend } from 'recharts';
import { ClaimingScenario } from '@/lib/socialSecurityCalculator';

interface LifetimeBenefitsChartProps {
  scenarios: ClaimingScenario[];
  currentClaimingAge: number;
  lifeExpectancy: number;
}

export function LifetimeBenefitsChart({ 
  scenarios, 
  currentClaimingAge,
  lifeExpectancy,
}: LifetimeBenefitsChartProps) {
  // Filter to show key ages: 62, 64, 66, 67, 68, 70
  const chartData = useMemo(() => {
    const keyAges = [62, 64, 66, 67, 68, 70];
    return scenarios
      .filter(s => keyAges.includes(s.claimingAge))
      .map(scenario => ({
        age: scenario.claimingAge,
        lifetime: scenario.lifetimeBenefits,
        monthly: scenario.monthlyBenefit,
        breakeven: scenario.breakEvenAge,
        adjustment: scenario.adjustedBenefit,
        isSelected: scenario.claimingAge === currentClaimingAge,
        label: scenario.claimingAge === 62 ? 'Early' 
             : scenario.claimingAge === 67 ? 'FRA' 
             : scenario.claimingAge === 70 ? 'Delayed' 
             : `Age ${scenario.claimingAge}`,
      }));
  }, [scenarios, currentClaimingAge]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const maxBenefit = Math.max(...chartData.map(d => d.lifetime));
  const optimalAge = chartData.find(d => d.lifetime === maxBenefit)?.age;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    
    const data = payload[0].payload;
    const isOptimal = data.age === optimalAge;
    
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-foreground">Age {data.age}</span>
          {isOptimal && (
            <span className="px-2 py-0.5 rounded-full bg-chart-2/20 text-chart-2 text-xs font-medium">
              Optimal
            </span>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Lifetime Total:</span>
            <span className="font-mono font-semibold text-primary">{formatCurrency(data.lifetime)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Benefit:</span>
            <span className="font-mono">${data.monthly.toFixed(0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Adjustment:</span>
            <span className={`font-mono ${data.adjustment >= 1 ? 'text-chart-2' : 'text-destructive'}`}>
              {((data.adjustment - 1) * 100).toFixed(1)}%
            </span>
          </div>
          {data.breakeven > 0 && (
            <div className="flex justify-between pt-1 border-t border-border mt-1">
              <span className="text-muted-foreground">Break-even:</span>
              <span className="font-mono">Age {data.breakeven}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[62, 67, 70].map(age => {
          const scenario = chartData.find(d => d.age === age);
          if (!scenario) return null;
          
          const isOptimal = age === optimalAge;
          const isSelected = age === currentClaimingAge;
          
          return (
            <div 
              key={age}
              className={`p-4 rounded-lg border transition-all ${
                isSelected 
                  ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                  : isOptimal 
                    ? 'bg-chart-2/10 border-chart-2/50' 
                    : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground">{scenario.label}</span>
                {isOptimal && <span className="text-xs text-chart-2 font-medium">Best</span>}
              </div>
              <div className={`text-xl font-bold font-mono ${
                isSelected ? 'text-primary' : isOptimal ? 'text-chart-2' : 'text-foreground'
              }`}>
                {formatCurrency(scenario.lifetime)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ${scenario.monthly.toFixed(0)}/mo
              </div>
            </div>
          );
        })}
      </div>

      {/* Bar Chart */}
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis 
              dataKey="age" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(age) => `Age ${age}`}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={formatCurrency}
              width={80}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="lifetime" 
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={
                    entry.isSelected 
                      ? 'hsl(var(--primary))' 
                      : entry.age === optimalAge 
                        ? 'hsl(var(--chart-2))' 
                        : 'hsl(var(--muted-foreground) / 0.3)'
                  }
                  stroke={entry.isSelected ? 'hsl(var(--primary))' : 'transparent'}
                  strokeWidth={2}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakeven Analysis */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-chart-4" />
          Breakeven Analysis
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {chartData.filter(d => d.breakeven > 0).map(d => (
            <div key={d.age} className="flex justify-between">
              <span className="text-muted-foreground">Age {d.age} vs earlier:</span>
              <span className="font-mono">Age {d.breakeven}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Breakeven age is when cumulative benefits from later claiming exceed earlier claiming.
          If you expect to live beyond the breakeven age, delaying is advantageous.
        </p>
      </div>
    </div>
  );
}
