/**
 * Tax-Adjusted Net Worth Chart
 * 
 * Shows "True Spendable Wealth" by discounting traditional IRA balances
 * by their estimated future tax rate
 */

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConversionYear } from '@/lib/rothOptimizationEngine';

interface TaxAdjustedNetWorthChartProps {
  years: ConversionYear[];
  lifeExpectancy: number;
  currentAge: number;
}

export function TaxAdjustedNetWorthChart({
  years,
  lifeExpectancy,
  currentAge,
}: TaxAdjustedNetWorthChartProps) {
  const [showTaxAdjusted, setShowTaxAdjusted] = useState(true);
  const [futureTaxRate, setFutureTaxRate] = useState(0.22);

  const chartData = useMemo(() => {
    // Build data from conversion years and project forward
    const data: {
      age: number;
      year: number;
      rothBalance: number;
      preTaxBalance: number;
      taxAdjustedPreTax: number;
      totalNominal: number;
      totalTaxAdjusted: number;
    }[] = [];

    years.forEach(y => {
      const taxAdjustedPreTax = y.remainingPreTax * (1 - futureTaxRate);
      data.push({
        age: y.age,
        year: y.year,
        rothBalance: y.projectedRothBalance,
        preTaxBalance: y.remainingPreTax,
        taxAdjustedPreTax,
        totalNominal: y.projectedRothBalance + y.remainingPreTax,
        totalTaxAdjusted: y.projectedRothBalance + taxAdjustedPreTax,
      });
    });

    // Project forward to life expectancy
    if (data.length > 0) {
      const lastData = data[data.length - 1];
      let rothBalance = lastData.rothBalance;
      let preTaxBalance = lastData.preTaxBalance;

      for (let age = lastData.age + 1; age <= lifeExpectancy; age++) {
        rothBalance *= 1.07;
        preTaxBalance *= 1.05;
        const taxAdjustedPreTax = preTaxBalance * (1 - futureTaxRate);

        data.push({
          age,
          year: lastData.year + (age - lastData.age),
          rothBalance,
          preTaxBalance,
          taxAdjustedPreTax,
          totalNominal: rothBalance + preTaxBalance,
          totalTaxAdjusted: rothBalance + taxAdjustedPreTax,
        });
      }
    }

    return data;
  }, [years, lifeExpectancy, futureTaxRate]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const lastDataPoint = chartData[chartData.length - 1];
  const taxImpact = lastDataPoint 
    ? lastDataPoint.totalNominal - lastDataPoint.totalTaxAdjusted 
    : 0;

  interface TooltipPayloadItem {
    payload?: {
      age: number;
      year: number;
      rothBalance: number;
      preTaxBalance: number;
      taxAdjustedPreTax: number;
      totalNominal: number;
      totalTaxAdjusted: number;
    };
    [key: string]: unknown;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string | number;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;

    const data = payload[0]?.payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-4 shadow-xl min-w-56">
        <p className="font-semibold text-sm mb-3">
          Age {data.age} ({data.year})
        </p>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              Roth (Tax-Free)
            </span>
            <span className="font-mono text-green-600">
              {formatCurrency(data.rothBalance)}
            </span>
          </div>
          
          <div className="flex justify-between gap-4">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              Pre-Tax {showTaxAdjusted ? '(Adjusted)' : '(Nominal)'}
            </span>
            <span className="font-mono text-blue-600">
              {formatCurrency(showTaxAdjusted ? data.taxAdjustedPreTax : data.preTaxBalance)}
            </span>
          </div>
          
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between gap-4">
              <span className="font-medium">Total Spendable</span>
              <span className="font-mono font-bold">
                {formatCurrency(showTaxAdjusted ? data.totalTaxAdjusted : data.totalNominal)}
              </span>
            </div>
            
            {showTaxAdjusted && (
              <div className="text-muted-foreground mt-1">
                <span className="italic">
                  Nominal: {formatCurrency(data.totalNominal)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <Switch
            id="tax-adjusted"
            checked={showTaxAdjusted}
            onCheckedChange={setShowTaxAdjusted}
          />
          <Label htmlFor="tax-adjusted" className="text-sm flex items-center gap-2">
            Show Tax-Adjusted Values
            <TooltipProvider>
              <UITooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-64">
                  <p className="text-xs">
                    Tax-adjusted values discount pre-tax account balances by their 
                    estimated future tax rate ({(futureTaxRate * 100).toFixed(0)}%) 
                    to show &quot;True Spendable Wealth&quot;
                  </p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </Label>
        </div>

        {showTaxAdjusted && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">
              Future Tax Rate:
            </Label>
            <select
              value={futureTaxRate}
              onChange={(e) => setFutureTaxRate(parseFloat(e.target.value))}
              className="text-xs border rounded px-2 py-1 bg-background"
            >
              <option value={0.12}>12%</option>
              <option value={0.22}>22%</option>
              <option value={0.24}>24%</option>
              <option value={0.32}>32%</option>
            </select>
          </div>
        )}
      </div>

      {/* Tax Impact Summary */}
      {showTaxAdjusted && lastDataPoint && (
        <div className="flex items-center gap-2 px-2">
          <Badge variant="outline" className="text-xs">
            Hidden Tax Liability at Age {lifeExpectancy}:
          </Badge>
          <span className="text-sm font-mono font-medium text-red-600">
            -{formatCurrency(taxImpact)}
          </span>
        </div>
      )}

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart 
            data={chartData} 
            margin={{ top: 10, right: 20, left: 10, bottom: 20 }}
          >
            <defs>
              <linearGradient id="rothGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="preTaxGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
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
              dataKey={showTaxAdjusted ? "taxAdjustedPreTax" : "preTaxBalance"}
              name={showTaxAdjusted ? "Pre-Tax (Tax-Adjusted)" : "Pre-Tax (Nominal)"}
              stackId="1"
              stroke="#3b82f6"
              fill="url(#preTaxGradient)"
            />
            <Area
              type="monotone"
              dataKey="rothBalance"
              name="Roth (Tax-Free)"
              stackId="1"
              stroke="#22c55e"
              fill="url(#rothGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
