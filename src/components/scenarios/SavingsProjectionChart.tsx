import { useMemo, useState } from 'react';
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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTableDialog } from '@/components/charts/DataTableDialog';

interface SavingsProjectionChartProps {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  annualContribution: number;
  monthlySpending: number;
  expectedReturn?: number;
  inflationRate?: number;
  simulationMedian?: number[];
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
    value: number;
    payload: any;
  }>;
  label?: number;
  retirementAge: number;
}

const CustomTooltip = ({ active, payload, label, retirementAge }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isRetired = (label || 0) >= retirementAge;

  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 min-w-[180px]">
      <div className="font-semibold text-foreground border-b border-border pb-2 mb-2">
        Age {label} {isRetired ? '(Retired)' : '(Working)'}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Portfolio Value</span>
          <span className="text-sm font-bold text-primary">{formatCurrency(data.balance)}</span>
        </div>
        {!isRetired && data.contribution > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">+ Contributions</span>
            <span className="text-sm text-chart-2">{formatCurrency(data.contribution)}</span>
          </div>
        )}
        {isRetired && data.withdrawal > 0 && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">- Withdrawals</span>
            <span className="text-sm text-destructive">{formatCurrency(data.withdrawal)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Investment Growth</span>
          <span className="text-sm text-chart-3">{formatCurrency(data.growth)}</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2 italic text-center">Click for account details</p>
    </div>
  );
};

export function SavingsProjectionChart({
  currentAge,
  retirementAge,
  currentSavings,
  annualContribution,
  monthlySpending,
  expectedReturn = 6,
  inflationRate = 2.5,
  simulationMedian,
}: SavingsProjectionChartProps) {
  const [selectedData, setSelectedData] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const chartData = useMemo(() => {
    const data = [];
    let balance = currentSavings;
    const realReturn = (expectedReturn - inflationRate) / 100;
    const annualWithdrawal = monthlySpending * 12;

    for (let age = currentAge; age <= 100; age++) {
      const yearIndex = age - currentAge;
      const isRetired = age >= retirementAge;
      
      // Use simulation median if available, otherwise calculate
      if (simulationMedian && simulationMedian[yearIndex] !== undefined) {
        balance = simulationMedian[yearIndex];
      } else {
        if (!isRetired) {
          // Accumulation phase
          const growth = balance * realReturn;
          balance = balance + growth + annualContribution;
        } else {
          // Decumulation phase
          const inflationMult = Math.pow(1 + inflationRate / 100, age - retirementAge);
          const realWithdrawal = annualWithdrawal * inflationMult;
          const growth = balance * realReturn;
          balance = Math.max(0, balance + growth - realWithdrawal);
        }
      }

      const inflationMult = Math.pow(1 + inflationRate / 100, age - retirementAge);
      
      data.push({
        age,
        balance: Math.round(balance),
        contribution: !isRetired ? annualContribution : 0,
        withdrawal: isRetired ? Math.round(annualWithdrawal * inflationMult) : 0,
        growth: Math.round(balance * realReturn),
        isRetired,
      });
    }

    // Sample at 5-year intervals for cleaner visualization
    return data.filter((_, i) => i % 5 === 0 || i === data.length - 1);
  }, [currentAge, retirementAge, currentSavings, annualContribution, monthlySpending, expectedReturn, inflationRate, simulationMedian]);

  const handleClick = (data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      setSelectedData(data.activePayload[0].payload);
      setDialogOpen(true);
    }
  };

  const tableColumns = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value', align: 'right' as const },
  ];

  const tableData = useMemo(() => {
    if (!selectedData) return [];
    
    const withdrawalRate = selectedData.balance > 0 
      ? ((selectedData.withdrawal / selectedData.balance) * 100).toFixed(2)
      : 'N/A';
    
    return [
      { metric: 'Portfolio Balance', value: formatCurrency(selectedData.balance) },
      { metric: 'Annual Contribution', value: formatCurrency(selectedData.contribution) },
      { metric: 'Annual Withdrawal', value: formatCurrency(selectedData.withdrawal) },
      { metric: 'Investment Growth', value: formatCurrency(selectedData.growth) },
      { metric: 'Withdrawal Rate', value: `${withdrawalRate}%` },
      { metric: 'Phase', value: selectedData.isRetired ? 'Retirement (Decumulation)' : 'Working (Accumulation)' },
    ];
  }, [selectedData]);

  // Key metrics
  const atRetirement = chartData.find(d => d.age >= retirementAge);
  const at85 = chartData.find(d => d.age >= 85);
  const finalBalance = chartData[chartData.length - 1]?.balance || 0;

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              Savings Trajectory
            </CardTitle>
            <UITooltip>
              <TooltipTrigger>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Projected portfolio value over time. Green bars = accumulation phase. Blue bars = decumulation phase. Click any bar for details.</p>
              </TooltipContent>
            </UITooltip>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
            <span>At {retirementAge}: <span className="font-medium text-foreground">{formatCurrency(atRetirement?.balance || 0)}</span></span>
            <span>At 100: <span className="font-medium text-foreground">{formatCurrency(finalBalance)}</span></span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              onClick={handleClick}
              style={{ cursor: 'pointer' }}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="accumulationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="decumulationGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                </linearGradient>
                <linearGradient id="depletedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.4} />
                </linearGradient>
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
                width={55}
              />
              <Tooltip content={<CustomTooltip retirementAge={retirementAge} />} />
              <ReferenceLine 
                x={retirementAge} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Bar dataKey="balance" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => {
                  let fill = 'url(#accumulationGrad)';
                  if (entry.balance <= 0) {
                    fill = 'url(#depletedGrad)';
                  } else if (entry.isRetired) {
                    fill = 'url(#decumulationGrad)';
                  }
                  return <Cell key={`cell-${index}`} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          {/* Legend */}
          <div className="flex gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Accumulation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">Decumulation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-[10px] text-muted-foreground">Depleted</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <DataTableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedData ? `Portfolio Details at Age ${selectedData.age}` : 'Portfolio Details'}
        description="Detailed breakdown of portfolio status"
        columns={tableColumns}
        data={tableData}
      />
    </>
  );
}
