/**
 * Lifetime Tax Comparison Chart
 * 
 * Side-by-side comparison of taxes with and without conversions
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
  Cell,
} from 'recharts';

interface RothLifetimeTaxChartProps {
  lifetimeTaxWithConversions: number;
  lifetimeTaxBaseline: number;
  conversionTaxPaid: number;
}

export function RothLifetimeTaxChart({
  lifetimeTaxWithConversions,
  lifetimeTaxBaseline,
  conversionTaxPaid,
}: RothLifetimeTaxChartProps) {
  const chartData = useMemo(() => {
    const savings = lifetimeTaxBaseline - lifetimeTaxWithConversions;
    const savingsPercent = lifetimeTaxBaseline > 0 
      ? (savings / lifetimeTaxBaseline) * 100 
      : 0;

    return [
      {
        name: 'No Conversions',
        conversionTax: 0,
        rmdTax: lifetimeTaxBaseline,
        total: lifetimeTaxBaseline,
        type: 'baseline',
      },
      {
        name: 'With Conversions',
        conversionTax: conversionTaxPaid,
        rmdTax: lifetimeTaxWithConversions - conversionTaxPaid,
        total: lifetimeTaxWithConversions,
        savings,
        savingsPercent,
        type: 'strategy',
      },
    ];
  }, [lifetimeTaxWithConversions, lifetimeTaxBaseline, conversionTaxPaid]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  interface TooltipPayloadItem {
    payload?: {
      name: string;
      conversionTax: number;
      rmdTax: number;
      total: number;
      savings?: number;
      savingsPercent?: number;
      type: string;
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
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-48">
        <p className="font-semibold text-sm mb-2">{label}</p>
        <div className="space-y-1.5 text-xs">
          {data.conversionTax > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Conversion Tax:</span>
              <span className="font-mono text-orange-600">
                {formatCurrency(data.conversionTax)}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">RMD/Distribution Tax:</span>
            <span className="font-mono text-red-600">
              {formatCurrency(data.rmdTax)}
            </span>
          </div>
          <div className="border-t border-border pt-1.5 mt-1.5">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground font-medium">Total Lifetime Tax:</span>
              <span className="font-mono font-bold">
                {formatCurrency(data.total)}
              </span>
            </div>
          </div>
          {data.savings !== undefined && data.savings > 0 && (
            <div className="pt-1.5 mt-1.5 bg-green-500/10 -mx-3 px-3 py-2 rounded-b-lg">
              <div className="flex justify-between gap-4">
                <span className="text-green-700 dark:text-green-400 font-medium">Savings:</span>
                <span className="font-mono font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(data.savings)} ({data.savingsPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const savings = lifetimeTaxBaseline - lifetimeTaxWithConversions;

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            layout="vertical"
            margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
            <XAxis 
              type="number"
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis 
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              width={120}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            <Bar
              dataKey="conversionTax"
              name="Conversion Tax (Now)"
              stackId="tax"
              fill="hsl(var(--warning))"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="rmdTax"
              name="Future RMD Tax"
              stackId="tax"
              fill="hsl(var(--destructive))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Baseline Lifetime Tax</p>
          <p className="text-lg font-bold font-mono text-red-600">
            {formatCurrency(lifetimeTaxBaseline)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">With Conversions</p>
          <p className="text-lg font-bold font-mono text-orange-600">
            {formatCurrency(lifetimeTaxWithConversions)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Your Savings</p>
          <p className="text-lg font-bold font-mono text-green-600">
            {formatCurrency(savings)}
          </p>
        </div>
      </div>
    </div>
  );
}
