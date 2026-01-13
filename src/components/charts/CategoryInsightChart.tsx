import { useMemo, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableDialog } from './DataTableDialog';

interface CategoryData {
  year: number;
  age: number;
  [key: string]: number;
}

interface SubCategory {
  key: string;
  label: string;
  color: string;
}

export type CategoryType = 'income' | 'expenses' | 'debt';

interface CategoryInsightChartProps {
  type: CategoryType;
  data: CategoryData[];
  subCategories: SubCategory[];
  currentAge: number;
  retirementAge: number;
  title?: string;
  infoTooltip?: string;
}

const CATEGORY_CONFIG = {
  income: {
    title: 'Income Sources',
    icon: TrendingUp,
    accentColor: 'hsl(var(--chart-2))',
    gradientFrom: 'rgba(16, 185, 129, 0.8)',
    gradientTo: 'rgba(16, 185, 129, 0.1)',
  },
  expenses: {
    title: 'Expense Categories',
    icon: TrendingDown,
    accentColor: 'hsl(var(--chart-1))',
    gradientFrom: 'rgba(239, 68, 68, 0.8)',
    gradientTo: 'rgba(239, 68, 68, 0.1)',
  },
  debt: {
    title: 'Debt Obligations',
    icon: Minus,
    accentColor: 'hsl(var(--chart-4))',
    gradientFrom: 'rgba(245, 158, 11, 0.8)',
    gradientTo: 'rgba(245, 158, 11, 0.1)',
  },
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
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
  subCategories: SubCategory[];
  data: CategoryData[];
  type: CategoryType;
}

const CustomTooltip = ({ active, payload, label, subCategories, data, type }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = data.find(d => d.age === label);
  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
  const typeLabel = type === 'income' ? 'Income' : type === 'expenses' ? 'Expenses' : 'Debt';

  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 min-w-[220px]">
      <div className="font-semibold text-foreground border-b border-border pb-2 mb-2">
        Age {label} {dataPoint?.year ? `(${dataPoint.year})` : ''}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const subCat = subCategories.find(c => c.key === entry.dataKey);
          const percentage = total > 0 ? ((entry.value || 0) / total * 100).toFixed(0) : 0;
          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">
                  {subCat?.label || entry.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(entry.value)}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({percentage}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border mt-2 pt-2 flex justify-between">
        <span className="text-sm font-semibold text-foreground">Total {typeLabel}</span>
        <span className="text-sm font-bold" style={{ color: CATEGORY_CONFIG[type].accentColor }}>
          {formatCurrency(total)}
        </span>
      </div>
      <div className="text-xs text-muted-foreground mt-2 text-center italic">
        Click bar for detailed breakdown
      </div>
    </div>
  );
};

export function CategoryInsightChart({
  type,
  data,
  subCategories,
  currentAge,
  retirementAge,
  title,
  infoTooltip,
}: CategoryInsightChartProps) {
  const [selectedData, setSelectedData] = useState<CategoryData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const config = CATEGORY_CONFIG[type];
  const Icon = config.icon;

  // Sample data at key ages for the compact view
  const chartData = useMemo(() => {
    if (!data.length) return [];
    
    // Show data at 5-year intervals for cleaner visualization
    return data.filter((_, index) => index % 5 === 0 || index === data.length - 1);
  }, [data]);

  const totalAtRetirement = useMemo(() => {
    const retirementData = data.find(d => d.age === retirementAge);
    if (!retirementData) return 0;
    return subCategories.reduce((sum, cat) => sum + (retirementData[cat.key] || 0), 0);
  }, [data, retirementAge, subCategories]);

  const handleBarClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      setSelectedData(data.activePayload[0].payload);
      setDialogOpen(true);
    }
  };

  const tableColumns = useMemo(() => [
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Annual Amount', align: 'right' as const },
    { key: 'monthly', label: 'Monthly', align: 'right' as const },
    { key: 'percentage', label: '% of Total', align: 'right' as const },
  ], []);

  const tableData = useMemo(() => {
    if (!selectedData) return [];
    const total = subCategories.reduce((sum, cat) => sum + (selectedData[cat.key] || 0), 0);
    return subCategories.map(cat => {
      const amount = selectedData[cat.key] || 0;
      return {
        category: cat.label,
        amount: formatCurrency(amount),
        monthly: formatCurrency(amount / 12),
        percentage: total > 0 ? `${((amount / total) * 100).toFixed(1)}%` : '0%',
      };
    });
  }, [selectedData, subCategories]);

  if (!data.length) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: config.accentColor }} />
            {title || config.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground">No data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Icon className="h-4 w-4" style={{ color: config.accentColor }} />
              {title || config.title}
            </CardTitle>
            <div className="flex items-center gap-2">
              {infoTooltip && (
                <UITooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    {infoTooltip}
                  </TooltipContent>
                </UITooltip>
              )}
              <span className="text-xs text-muted-foreground">
                At {retirementAge}: {formatCurrency(totalAtRetirement)}/yr
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={chartData}
              onClick={handleBarClick}
              style={{ cursor: 'pointer' }}
              margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
            >
              <defs>
                {subCategories.map((cat) => (
                  <linearGradient key={cat.key} id={`bar-gradient-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={cat.color} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={cat.color} stopOpacity={0.5} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" vertical={false} />
              <XAxis 
                dataKey="age" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip 
                content={
                  <CustomTooltip 
                    subCategories={subCategories}
                    data={data}
                    type={type}
                  />
                }
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
              />
              <ReferenceLine 
                x={retirementAge} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
              {subCategories.map((cat) => (
                <Bar
                  key={cat.key}
                  dataKey={cat.key}
                  stackId="stack"
                  fill={`url(#bar-gradient-${cat.key})`}
                  radius={[2, 2, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {subCategories.map((cat) => (
              <div key={cat.key} className="flex items-center gap-1.5">
                <div 
                  className="w-2.5 h-2.5 rounded-sm" 
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs text-muted-foreground">{cat.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <DataTableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedData ? `${config.title} at Age ${selectedData.age} (${selectedData.year})` : config.title}
        description="Detailed breakdown of all categories for this year"
        columns={tableColumns}
        data={tableData}
      />
    </>
  );
}
