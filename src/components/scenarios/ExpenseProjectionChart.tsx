import { useMemo, useState } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableDialog } from '@/components/charts/DataTableDialog';

interface ExpenseProjectionChartProps {
  currentAge: number;
  retirementAge: number;
  monthlySpending: number;
  medicalInflation?: number;
  generalInflation?: number;
  propertyTaxRate?: number;
  homeValue?: number;
}

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
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 min-w-[200px]">
      <div className="font-semibold text-foreground border-b border-border pb-2 mb-2">
        Age {label}
      </div>
      <div className="space-y-1.5">
        {payload.reverse().map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground capitalize">
                {entry.dataKey.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {formatCurrency(entry.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-border mt-2 pt-2 flex justify-between">
        <span className="text-sm font-semibold text-foreground">Total Annual</span>
        <span className="text-sm font-bold text-destructive">{formatCurrency(total)}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2 italic text-center">Click to see breakdown</p>
    </div>
  );
};

export function ExpenseProjectionChart({
  currentAge,
  retirementAge,
  monthlySpending,
  medicalInflation = 3.36,
  generalInflation = 2.5,
  propertyTaxRate = 1.1,
  homeValue = 500000,
}: ExpenseProjectionChartProps) {
  const [selectedData, setSelectedData] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const chartData = useMemo(() => {
    const data = [];
    const baseAnnualSpending = monthlySpending * 12;
    const baseMedical = baseAnnualSpending * 0.08; // 8% at start
    const baseHousing = baseAnnualSpending * 0.30;
    const basePropertyTax = (homeValue * propertyTaxRate) / 100;
    const baseUtilities = baseAnnualSpending * 0.08;
    const baseOther = baseAnnualSpending * 0.54 - basePropertyTax;

    for (let age = currentAge; age <= 100; age++) {
      const yearIndex = age - currentAge;
      const genInflationFactor = Math.pow(1 + generalInflation / 100, yearIndex);
      const medInflationFactor = Math.pow(1 + medicalInflation / 100, yearIndex);
      
      // Medical costs grow faster and spike after 65
      const ageMultiplier = age >= 65 ? 1.5 + ((age - 65) * 0.02) : 1;
      const medical = baseMedical * medInflationFactor * ageMultiplier;
      
      // Fixed costs grow with general inflation
      const housing = baseHousing * genInflationFactor;
      const propertyTax = basePropertyTax * genInflationFactor;
      const utilities = baseUtilities * genInflationFactor;
      
      // Discretionary decreases slightly after retirement
      const discretionaryMult = age >= retirementAge ? 0.85 : 1;
      const other = baseOther * genInflationFactor * discretionaryMult;

      data.push({
        age,
        medical: Math.round(medical),
        housing: Math.round(housing),
        propertyTax: Math.round(propertyTax),
        utilities: Math.round(utilities),
        other: Math.round(other),
      });
    }

    return data;
  }, [currentAge, retirementAge, monthlySpending, medicalInflation, generalInflation, propertyTaxRate, homeValue]);

  const handleClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      setSelectedData(data.activePayload[0].payload);
      setDialogOpen(true);
    }
  };

  const tableColumns = [
    { key: 'category', label: 'Category' },
    { key: 'annual', label: 'Annual', align: 'right' as const },
    { key: 'monthly', label: 'Monthly', align: 'right' as const },
    { key: 'percentage', label: '% of Total', align: 'right' as const },
  ];

  const tableData = useMemo(() => {
    if (!selectedData) return [];
    const total = selectedData.medical + selectedData.housing + selectedData.propertyTax + selectedData.utilities + selectedData.other;
    
    return [
      { category: 'Medical & Healthcare', annual: formatCurrency(selectedData.medical), monthly: formatCurrency(selectedData.medical / 12), percentage: `${((selectedData.medical / total) * 100).toFixed(1)}%` },
      { category: 'Housing & Mortgage', annual: formatCurrency(selectedData.housing), monthly: formatCurrency(selectedData.housing / 12), percentage: `${((selectedData.housing / total) * 100).toFixed(1)}%` },
      { category: 'Property Tax', annual: formatCurrency(selectedData.propertyTax), monthly: formatCurrency(selectedData.propertyTax / 12), percentage: `${((selectedData.propertyTax / total) * 100).toFixed(1)}%` },
      { category: 'Utilities', annual: formatCurrency(selectedData.utilities), monthly: formatCurrency(selectedData.utilities / 12), percentage: `${((selectedData.utilities / total) * 100).toFixed(1)}%` },
      { category: 'Other Expenses', annual: formatCurrency(selectedData.other), monthly: formatCurrency(selectedData.other / 12), percentage: `${((selectedData.other / total) * 100).toFixed(1)}%` },
    ];
  }, [selectedData]);

  // Calculate key metrics
  const totalAt65 = chartData.find(d => d.age === 65);
  const totalAt85 = chartData.find(d => d.age === 85);
  const medicalAt65 = totalAt65?.medical || 0;
  const medicalAt85 = totalAt85?.medical || 0;

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Expense Projection
            </CardTitle>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Medical costs grow at {medicalInflation}% (healthcare inflation). Other costs grow at {generalInflation}% (general CPI). Click any point for details.</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
            <span>Medical at 65: <span className="font-medium text-foreground">{formatCurrency(medicalAt65)}</span></span>
            <span>Medical at 85: <span className="font-medium text-foreground">{formatCurrency(medicalAt85)}</span></span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={chartData}
              onClick={handleClick}
              style={{ cursor: 'pointer' }}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="medicalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="housingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="propertyTaxGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="utilitiesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2} />
                </linearGradient>
                <linearGradient id="otherGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis 
                dataKey="age" 
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={9}
              />
              <YAxis 
                tickFormatter={formatCurrency}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                x={retirementAge} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: 'Retire', position: 'top', fontSize: 10 }}
              />
              <ReferenceLine 
                x={65} 
                stroke="hsl(var(--chart-2))" 
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{ value: 'Medicare', position: 'top', fontSize: 9 }}
              />
              <Area type="monotone" dataKey="other" stackId="1" stroke="#8b5cf6" fill="url(#otherGrad)" />
              <Area type="monotone" dataKey="utilities" stackId="1" stroke="#22c55e" fill="url(#utilitiesGrad)" />
              <Area type="monotone" dataKey="propertyTax" stackId="1" stroke="#eab308" fill="url(#propertyTaxGrad)" />
              <Area type="monotone" dataKey="housing" stackId="1" stroke="#f97316" fill="url(#housingGrad)" />
              <Area type="monotone" dataKey="medical" stackId="1" stroke="#ef4444" fill="url(#medicalGrad)" />
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Compact Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
            {[
              { key: 'medical', color: '#ef4444', label: 'Medical' },
              { key: 'housing', color: '#f97316', label: 'Housing' },
              { key: 'propertyTax', color: '#eab308', label: 'Property Tax' },
              { key: 'utilities', color: '#22c55e', label: 'Utilities' },
              { key: 'other', color: '#8b5cf6', label: 'Other' },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <DataTableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedData ? `Expenses at Age ${selectedData.age}` : 'Expense Breakdown'}
        description="Annual expense breakdown by category"
        columns={tableColumns}
        data={tableData}
      />
    </>
  );
}
