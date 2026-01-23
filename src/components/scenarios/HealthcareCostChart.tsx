/**
 * Healthcare Cost Projection Chart (Age 65-100)
 * 
 * Stacked area chart showing:
 * - Base Premiums (Part B + Part D)
 * - IRMAA Surcharges
 * - Out-of-Pocket Estimates
 * - End-of-Life Cost Surge (final 5 years)
 */

import { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTableDialog } from '@/components/charts/DataTableDialog';
import {
  HealthcareProjectionPoint,
  generateHealthcareProjection,
  HealthCondition,
  MedicareChoice,
} from '@/lib/medicareCalculator';
import { useContext } from 'react';
import { AIAdvisorContext } from '@/contexts/AIAdvisorContext';

interface HealthcareCostChartProps {
  currentAge: number;
  targetAge?: number;
  baseMAGI: number;
  annualMAGIGrowth?: number;
  healthCondition: HealthCondition;
  medicareChoice: MedicareChoice;
  isMarried: boolean;
  medicalInflationRate?: number;
  height?: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
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
  data: HealthcareProjectionPoint[];
}

const CustomTooltip = ({ active, payload, label, data }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = data.find(d => d.age === label);
  if (!dataPoint) return null;

  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-[240px]">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
        <span className="font-semibold text-sm">Age {label}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {dataPoint.irmaaBracket}
          </Badge>
          {dataPoint.isEndOfLife && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              EOL
            </Badge>
          )}
        </div>
      </div>
      
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">Base Premiums</span>
          </div>
          <span className="font-mono font-medium">
            {formatCurrency(dataPoint.basePremiums)}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-muted-foreground">IRMAA Surcharge</span>
          </div>
          <span className="font-mono font-medium text-amber-600">
            {formatCurrency(dataPoint.irmaaSurcharge)}
          </span>
        </div>
        
        <div className="flex justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-purple-500" />
            <span className="text-muted-foreground">Out-of-Pocket</span>
          </div>
          <span className="font-mono font-medium">
            {formatCurrency(dataPoint.outOfPocket)}
          </span>
        </div>
        
        {dataPoint.endOfLifeSurge > 0 && (
          <div className="flex justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-muted-foreground">End-of-Life Surge</span>
            </div>
            <span className="font-mono font-medium text-red-600">
              +{formatCurrency(dataPoint.endOfLifeSurge)}
            </span>
          </div>
        )}
      </div>
      
      <div className="border-t border-border mt-2 pt-2 flex justify-between">
        <span className="text-sm font-semibold">Total Annual</span>
        <span className="text-sm font-bold text-primary font-mono">
          {formatCurrency(dataPoint.total)}
        </span>
      </div>
    </div>
  );
};

export function HealthcareCostChart({
  currentAge,
  targetAge = 100,
  baseMAGI,
  annualMAGIGrowth = 0.02,
  healthCondition,
  medicareChoice,
  isMarried,
  medicalInflationRate = 0.0336,
  height = 320,
}: HealthcareCostChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<HealthcareProjectionPoint | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // AI Advisor context for "Ask AI" functionality
  // Using useContext directly to get nullable context (doesn't throw)
  const aiAdvisorContext = useContext(AIAdvisorContext);

  const projections = useMemo(() => {
    return generateHealthcareProjection(
      currentAge,
      targetAge,
      baseMAGI,
      annualMAGIGrowth,
      healthCondition,
      medicareChoice,
      isMarried,
      medicalInflationRate
    );
  }, [
    currentAge,
    targetAge,
    baseMAGI,
    annualMAGIGrowth,
    healthCondition,
    medicareChoice,
    isMarried,
    medicalInflationRate,
  ]);

  // Summary stats
  const stats = useMemo(() => {
    if (projections.length === 0) return null;
    
    const totalLifetime = projections.reduce((sum, p) => sum + p.total, 0);
    const avgAnnual = totalLifetime / projections.length;
    const maxAnnual = Math.max(...projections.map(p => p.total));
    const eolCosts = projections
      .filter(p => p.isEndOfLife)
      .reduce((sum, p) => sum + p.total, 0);
    const totalIRMAA = projections.reduce((sum, p) => sum + p.irmaaSurcharge, 0);
    
    return { totalLifetime, avgAnnual, maxAnnual, eolCosts, totalIRMAA };
  }, [projections]);

  // Handle chart click
  interface ChartClickData {
    activePayload?: Array<{ payload?: HealthcareProjectionPoint }>;
  }

  const handleClick = (data: ChartClickData) => {
    if (!data?.activePayload?.[0]?.payload) return;
    setSelectedPoint(data.activePayload[0].payload);
    setDialogOpen(true);
  };

  // Table data for dialog
  const tableColumns = [
    { key: 'category', label: 'Category' },
    { key: 'amount', label: 'Amount' },
    { key: 'notes', label: 'Notes' },
  ];

  const tableData = useMemo(() => {
    if (!selectedPoint) return [];
    return [
      {
        category: 'Part B Premium',
        amount: formatCurrency(selectedPoint.basePremiums * 0.85), // Approx Part B portion
        notes: selectedPoint.irmaaBracket !== 'Standard' ? `IRMAA: ${selectedPoint.irmaaBracket}` : 'Standard rate',
      },
      {
        category: 'Part D Premium',
        amount: formatCurrency(selectedPoint.basePremiums * 0.15), // Approx Part D portion
        notes: 'Including drug coverage',
      },
      {
        category: 'IRMAA Surcharge',
        amount: formatCurrency(selectedPoint.irmaaSurcharge),
        notes: selectedPoint.irmaaSurcharge > 0 ? 'High-income adjustment' : 'Not applicable',
      },
      {
        category: 'Out-of-Pocket',
        amount: formatCurrency(selectedPoint.outOfPocket),
        notes: `Based on ${healthCondition} health status`,
      },
      {
        category: 'End-of-Life Surge',
        amount: formatCurrency(selectedPoint.endOfLifeSurge),
        notes: selectedPoint.isEndOfLife ? '150% increase for long-term care' : 'Not applicable',
      },
      {
        category: 'Total',
        amount: formatCurrency(selectedPoint.total),
        notes: `Age ${selectedPoint.age}`,
      },
    ];
  }, [selectedPoint, healthCondition]);

  // Find EOL start age for reference line
  const eolStartAge = projections.find(p => p.isEndOfLife)?.age;

  if (projections.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <p>Healthcare projections start at age 65 (Medicare eligibility)</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats with Ask AI Button */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Lifetime Total</p>
            <p className="text-lg font-bold font-mono text-primary">
              {formatCurrency(stats.totalLifetime)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Avg Annual</p>
            <p className="text-lg font-bold font-mono">
              {formatCurrency(stats.avgAnnual)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">Peak Year</p>
            <p className="text-lg font-bold font-mono text-red-600">
              {formatCurrency(stats.maxAnnual)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-xs text-muted-foreground">EOL Costs</p>
            <p className="text-lg font-bold font-mono text-red-600">
              {formatCurrency(stats.eolCosts)}
            </p>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg relative">
            <p className="text-xs text-muted-foreground">Total IRMAA</p>
            <p className="text-lg font-bold font-mono text-amber-600">
              {formatCurrency(stats.totalIRMAA)}
            </p>
          </div>
        </div>
      )}

      {/* Ask AI Button */}
      {aiAdvisorContext && stats && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => aiAdvisorContext?.openWithChartContext({
              chartTitle: 'Healthcare Cost Projection',
              chartType: 'stacked-area',
              chartData: {
                lifetimeTotal: stats.totalLifetime,
                avgAnnual: stats.avgAnnual,
                peakYear: stats.maxAnnual,
                eolCosts: stats.eolCosts,
                totalIRMAA: stats.totalIRMAA,
                yearsProjected: projections.length,
              },
            })}
            className="gap-1"
          >
            <Sparkles className="h-4 w-4" />
            Ask AI about this chart
          </Button>
        </div>
      )}

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={projections}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
          >
            <defs>
              <linearGradient id="gradientBase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradientIRMAA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradientOOP" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(270, 95%, 65%)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(270, 95%, 65%)" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradientEOL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.9} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
              </linearGradient>
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
              tickFormatter={formatCurrency}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              className="text-muted-foreground"
              width={60}
            />
            
            <Tooltip content={<CustomTooltip data={projections} />} />
            
            <Legend 
              wrapperStyle={{ fontSize: '12px' }}
              iconType="rect"
              iconSize={10}
            />
            
            {/* End-of-Life reference line */}
            {eolStartAge && (
              <ReferenceLine 
                x={eolStartAge} 
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                label={{
                  value: 'End-of-Life Period',
                  position: 'top',
                  className: 'text-xs fill-destructive',
                }}
              />
            )}
            
            <Area
              type="monotone"
              dataKey="basePremiums"
              name="Base Premiums"
              stackId="1"
              stroke="hsl(217, 91%, 60%)"
              fill="url(#gradientBase)"
              strokeWidth={1.5}
            />
            
            <Area
              type="monotone"
              dataKey="irmaaSurcharge"
              name="IRMAA Surcharge"
              stackId="1"
              stroke="hsl(38, 92%, 50%)"
              fill="url(#gradientIRMAA)"
              strokeWidth={1.5}
            />
            
            <Area
              type="monotone"
              dataKey="outOfPocket"
              name="Out-of-Pocket"
              stackId="1"
              stroke="hsl(270, 95%, 65%)"
              fill="url(#gradientOOP)"
              strokeWidth={1.5}
            />
            
            <Area
              type="monotone"
              dataKey="endOfLifeSurge"
              name="End-of-Life Surge"
              stackId="1"
              stroke="hsl(0, 84%, 60%)"
              fill="url(#gradientEOL)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <DataTableDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedPoint ? `Age ${selectedPoint.age} Healthcare Breakdown` : 'Breakdown'}
        columns={tableColumns}
        data={tableData}
      />
    </div>
  );
}