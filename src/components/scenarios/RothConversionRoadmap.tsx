/**
 * Roth Conversion Roadmap - Bar chart showing exact dollar amounts per year
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
  ReferenceLine,
  Cell,
  Legend,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { ConversionYear } from '@/lib/rothOptimizationEngine';

interface RothConversionRoadmapProps {
  years: ConversionYear[];
  showIRMAAWarnings?: boolean;
}

export function RothConversionRoadmap({ 
  years,
  showIRMAAWarnings = true,
}: RothConversionRoadmapProps) {
  const chartData = useMemo(() => {
    return years.map((y) => ({
      age: y.age,
      year: y.year,
      conversion: y.conversionAmount,
      federalTax: y.federalTax,
      stateTax: y.stateTax,
      totalTax: y.taxBill,
      effectiveRate: y.effectiveRate * 100,
      marginalRate: y.marginalRate * 100,
      rothBalance: y.projectedRothBalance,
      irmaaCliff: y.irmaaImpact.crossedCliff,
      irmaaSurcharge: y.irmaaImpact.surcharge,
      irmaaBracket: y.irmaaImpact.bracketLabel,
    }));
  }, [years]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const avgConversion = years.length > 0
    ? years.reduce((sum, y) => sum + y.conversionAmount, 0) / years.length
    : 0;

  const totalConversion = years.reduce((sum, y) => sum + y.conversionAmount, 0);
  const totalTaxes = years.reduce((sum, y) => sum + y.taxBill, 0);

  interface TooltipPayloadItem {
    payload?: {
      age: number;
      year: number;
      conversion: number;
      federalTax: number;
      stateTax: number;
      totalTax: number;
      effectiveRate: number;
      marginalRate: number;
      rothBalance: number;
      irmaaCliff: boolean;
      irmaaSurcharge: number;
      irmaaBracket: string;
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
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-sm">
            Age {label} ({data.year})
          </p>
          {data.irmaaCliff && showIRMAAWarnings && (
            <Badge variant="destructive" className="text-xs">
              IRMAA Cliff
            </Badge>
          )}
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Conversion Amount:</span>
            <span className="font-mono font-bold text-primary">
              {formatCurrency(data.conversion)}
            </span>
          </div>
          
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Federal Tax:</span>
              <span className="font-mono text-orange-600">
                {formatCurrency(data.federalTax)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">State Tax:</span>
              <span className="font-mono text-amber-600">
                {formatCurrency(data.stateTax)}
              </span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t border-dashed border-border mt-1">
              <span className="text-muted-foreground font-medium">Total Tax:</span>
              <span className="font-mono font-medium text-red-600">
                {formatCurrency(data.totalTax)}
              </span>
            </div>
          </div>
          
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Effective Rate:</span>
              <span className="font-mono">{data.effectiveRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Marginal Rate:</span>
              <span className="font-mono">{data.marginalRate.toFixed(0)}%</span>
            </div>
          </div>
          
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Roth Balance:</span>
              <span className="font-mono font-medium text-green-600">
                {formatCurrency(data.rothBalance)}
              </span>
            </div>
          </div>
          
          {showIRMAAWarnings && data.irmaaSurcharge > 0 && (
            <div className="bg-amber-500/10 -mx-4 px-4 py-2 mt-2 rounded-b-lg">
              <div className="flex justify-between gap-4">
                <span className="text-amber-700 dark:text-amber-400">IRMAA Bracket:</span>
                <span className="font-mono text-amber-700 dark:text-amber-400">
                  {data.irmaaBracket}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-amber-700 dark:text-amber-400">Annual Surcharge:</span>
                <span className="font-mono font-medium text-amber-700 dark:text-amber-400">
                  +{formatCurrency(data.irmaaSurcharge)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 px-2">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total to Convert</p>
          <p className="text-lg font-bold font-mono text-primary">
            {formatCurrency(totalConversion)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Total Tax Cost</p>
          <p className="text-lg font-bold font-mono text-orange-600">
            {formatCurrency(totalTaxes)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Avg per Year</p>
          <p className="text-lg font-bold font-mono text-muted-foreground">
            {formatCurrency(avgConversion)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
          >
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
            <ReferenceLine 
              y={avgConversion} 
              stroke="hsl(var(--muted-foreground))" 
              strokeDasharray="5 5"
              label={{ 
                value: `Avg`, 
                position: 'right',
                className: 'text-xs fill-muted-foreground',
              }}
            />
            <Bar
              dataKey="conversion"
              name="Conversion Amount"
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.irmaaCliff && showIRMAAWarnings 
                    ? 'hsl(var(--warning))' 
                    : `hsl(var(--primary) / ${0.6 + (index / chartData.length) * 0.4})`
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
