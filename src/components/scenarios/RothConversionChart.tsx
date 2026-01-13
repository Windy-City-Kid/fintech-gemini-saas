/**
 * Annual Conversion Strategy Bar Chart
 * 
 * Shows exactly how much to convert each year with tax breakdown
 */

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ConversionYear } from '@/lib/rothConversionEngine';

interface RothConversionChartProps {
  years: ConversionYear[];
}

export function RothConversionChart({ years }: RothConversionChartProps) {
  const chartData = useMemo(() => {
    return years.map((y) => ({
      age: y.age,
      year: y.year,
      conversion: y.conversionAmount,
      federalTax: y.federalTax,
      stateTax: y.stateTax,
      effectiveRate: y.effectiveRate * 100,
      cumulativeConverted: y.cumulativeConverted,
      rothBalance: y.projectedRothBalance,
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
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-48">
        <p className="font-semibold text-sm mb-2">
          Age {label} ({data.year})
        </p>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Convert:</span>
            <span className="font-mono font-medium text-primary">
              {formatCurrency(data.conversion)}
            </span>
          </div>
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
          <div className="border-t border-border pt-1.5 mt-1.5">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Effective Rate:</span>
              <span className="font-mono font-medium">
                {data.effectiveRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Roth Balance:</span>
              <span className="font-mono text-green-600">
                {formatCurrency(data.rothBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calculate average for reference line
  const avgConversion = years.length > 0
    ? years.reduce((sum, y) => sum + y.conversionAmount, 0) / years.length
    : 0;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="age" 
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v) => `${v}`}
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
          <ReferenceLine 
            y={avgConversion} 
            stroke="hsl(var(--muted-foreground))" 
            strokeDasharray="5 5"
            label={{ 
              value: `Avg: ${formatCurrency(avgConversion)}`, 
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
                fill={`hsl(var(--primary) / ${0.5 + (entry.effectiveRate / 50)})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
