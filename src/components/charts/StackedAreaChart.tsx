import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { DataTableDialog } from './DataTableDialog';

interface DataPoint {
  year: number;
  age: number;
  [key: string]: number;
}

interface CategoryConfig {
  key: string;
  label: string;
  color: string;
  description?: string;
}

interface StackedAreaChartProps {
  data: DataPoint[];
  categories: CategoryConfig[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  enableDrillDown?: boolean;
  formatValue?: (value: number) => string;
}

const defaultFormatValue = (value: number) => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: number;
  categories: CategoryConfig[];
  formatValue: (value: number) => string;
  data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label, categories, formatValue, data }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = data.find(d => d.age === label);
  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
      <div className="font-semibold text-foreground border-b border-border pb-2 mb-2">
        Age {label} {dataPoint?.year ? `(${dataPoint.year})` : ''}
      </div>
      <div className="space-y-1.5">
        {payload.reverse().map((entry, index) => {
          const category = categories.find(c => c.key === entry.dataKey);
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {category?.label || entry.name}
                </span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {formatValue(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border mt-2 pt-2 flex justify-between">
        <span className="text-sm font-semibold text-foreground">Total</span>
        <span className="text-sm font-bold text-primary">{formatValue(total)}</span>
      </div>
      <div className="text-xs text-muted-foreground mt-2 italic">
        Click to view detailed breakdown
      </div>
    </div>
  );
};

export function StackedAreaChart({
  data,
  categories,
  title,
  height = 300,
  showLegend = true,
  enableDrillDown = true,
  formatValue = defaultFormatValue,
}: StackedAreaChartProps) {
  const [selectedYear, setSelectedYear] = useState<DataPoint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const chartData = useMemo(() => {
    return data.map(point => ({
      ...point,
      displayLabel: `${point.age}`,
    }));
  }, [data]);

  const handleClick = (data: any) => {
    if (!enableDrillDown || !data?.activePayload?.[0]?.payload) return;
    setSelectedYear(data.activePayload[0].payload);
    setDialogOpen(true);
  };

  const tableColumns = useMemo(() => [
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'percentage', label: '% of Total' },
  ], []);

  const tableData = useMemo(() => {
    if (!selectedYear) return [];
    const total = categories.reduce((sum, cat) => sum + (selectedYear[cat.key] || 0), 0);
    return categories.map(cat => ({
      category: cat.label,
      amount: formatValue(selectedYear[cat.key] || 0),
      percentage: total > 0 ? `${((selectedYear[cat.key] || 0) / total * 100).toFixed(1)}%` : '0%',
    }));
  }, [selectedYear, categories, formatValue]);

  return (
    <>
      <div className="w-full">
        {title && (
          <h3 className="text-sm font-medium text-foreground mb-3">{title}</h3>
        )}
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onClick={handleClick}
            style={{ cursor: enableDrillDown ? 'pointer' : 'default' }}
          >
            <defs>
              {categories.map((cat) => (
                <linearGradient key={cat.key} id={`gradient-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={cat.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={cat.color} stopOpacity={0.2} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis 
              dataKey="age" 
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
            />
            <YAxis 
              tickFormatter={formatValue}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              width={60}
            />
            <Tooltip 
              content={
                <CustomTooltip 
                  categories={categories} 
                  formatValue={formatValue}
                  data={data}
                />
              }
            />
            {showLegend && (
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                iconType="rect"
                iconSize={10}
              />
            )}
            {categories.map((cat) => (
              <Area
                key={cat.key}
                type="monotone"
                dataKey={cat.key}
                name={cat.label}
                stackId="1"
                stroke={cat.color}
                fill={`url(#gradient-${cat.key})`}
                strokeWidth={1.5}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DataTableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedYear ? `Age ${selectedYear.age} (${selectedYear.year}) Breakdown` : 'Breakdown'}
        columns={tableColumns}
        data={tableData}
      />
    </>
  );
}
