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
import { Home, TrendingUp } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PropertyData {
  estimated_value: number;
  mortgage_balance: number | null;
  mortgage_interest_rate: number | null;
  mortgage_monthly_payment: number | null;
  relocation_age: number | null;
  relocation_sale_price: number | null;
  relocation_new_purchase_price: number | null;
  relocation_new_mortgage_amount: number | null;
}

interface HomeEquityChartProps {
  property: PropertyData | null;
  currentAge: number;
  retirementAge: number;
  appreciationRate?: number; // Default 4.4% per year
}

export function HomeEquityChart({ 
  property, 
  currentAge, 
  retirementAge,
  appreciationRate = 0.044 
}: HomeEquityChartProps) {
  const chartData = useMemo(() => {
    if (!property) return [];
    
    const data: Array<{
      age: number;
      homeValue: number;
      mortgageBalance: number;
      equity: number;
    }> = [];
    
    let homeValue = property.estimated_value;
    let mortgageBalance = property.mortgage_balance || 0;
    const monthlyRate = (property.mortgage_interest_rate || 0) / 100 / 12;
    const monthlyPayment = property.mortgage_monthly_payment || 0;
    
    // Project until age 100
    const endAge = 100;
    
    for (let age = currentAge; age <= endAge; age++) {
      // Check for relocation
      if (property.relocation_age && age === property.relocation_age) {
        // Sell current home, buy new one
        homeValue = property.relocation_new_purchase_price || homeValue;
        mortgageBalance = property.relocation_new_mortgage_amount || 0;
      }
      
      const equity = Math.max(0, homeValue - mortgageBalance);
      
      data.push({
        age,
        homeValue: Math.round(homeValue),
        mortgageBalance: Math.round(mortgageBalance),
        equity: Math.round(equity),
      });
      
      // Apply annual appreciation
      homeValue *= (1 + appreciationRate);
      
      // Amortize mortgage for 12 months
      if (mortgageBalance > 0 && monthlyPayment > 0) {
        for (let month = 0; month < 12; month++) {
          if (mortgageBalance <= 0) break;
          const interestPayment = mortgageBalance * monthlyRate;
          const principalPayment = Math.min(monthlyPayment - interestPayment, mortgageBalance);
          mortgageBalance = Math.max(0, mortgageBalance - principalPayment);
        }
      }
    }
    
    return data;
  }, [property, currentAge, appreciationRate]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (!property) {
    return (
      <div className="stat-card">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Home className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Home Equity Projection</h3>
            <p className="text-sm text-muted-foreground">Add a property to see projections</p>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No property data available</p>
        </div>
      </div>
    );
  }

  const retirementEquity = chartData.find(d => d.age === retirementAge)?.equity || 0;
  const finalEquity = chartData[chartData.length - 1]?.equity || 0;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Home className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Home Equity Projection
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Projects home value growth at {(appreciationRate * 100).toFixed(1)}% annually 
                      with mortgage amortization until payoff.
                    </p>
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            </h3>
            <p className="text-sm text-muted-foreground">Home value, mortgage & equity over time</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono text-accent">
            {formatCurrency(retirementEquity)}
          </p>
          <p className="text-sm text-muted-foreground">equity at retirement</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradientEquity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradientHomeValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(215, 20%, 55%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(215, 20%, 55%)" stopOpacity={0} />
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
                  homeValue: 'Home Value',
                  mortgageBalance: 'Mortgage Balance',
                  equity: 'Home Equity',
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
            
            {/* Home Value area */}
            <Area
              type="monotone"
              dataKey="homeValue"
              stroke="hsl(215, 20%, 55%)"
              strokeWidth={1}
              fill="url(#gradientHomeValue)"
              fillOpacity={1}
            />
            
            {/* Mortgage Balance area (inverted visually) */}
            <Area
              type="monotone"
              dataKey="mortgageBalance"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={1}
              strokeDasharray="4 2"
              fill="none"
            />
            
            {/* Equity area */}
            <Area
              type="monotone"
              dataKey="equity"
              stroke="hsl(38, 92%, 50%)"
              strokeWidth={2}
              fill="url(#gradientEquity)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-muted-foreground" />
          <span className="text-xs text-muted-foreground">Home Value</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-destructive" style={{ borderBottom: '2px dashed' }} />
          <span className="text-xs text-muted-foreground">Mortgage</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent/50" />
          <span className="text-xs text-muted-foreground">Equity</span>
        </div>
      </div>
    </div>
  );
}
