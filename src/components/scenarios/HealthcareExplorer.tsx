/**
 * Healthcare Explorer Chart
 * 
 * Stacked area chart (Age 65-100) showing:
 * - Base Premiums
 * - IRMAA Surcharges
 * - Out-of-Pocket Costs
 * - End-of-Life Surge
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, Heart } from 'lucide-react';
import { DataTableDialog } from '@/components/charts/DataTableDialog';
import { 
  generateHealthcareProjection, 
  HealthcareProjectionPoint,
  HealthCondition,
  MedicareChoice,
  MEDICAL_INFLATION_HISTORICAL,
} from '@/lib/medicareCalculator';
interface HealthcareExplorerProps {
  currentAge: number;
  targetAge?: number;
  baseMAGI?: number;
  magiGrowthRate?: number;
  healthCondition?: HealthCondition;
  medicareChoice?: MedicareChoice;
  isMarried?: boolean;
  medicalInflation?: number;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export function HealthcareExplorer({
  currentAge,
  targetAge = 100,
  baseMAGI = 100000,
  magiGrowthRate = 0.02,
  healthCondition = 'good',
  medicareChoice = 'advantage',
  isMarried = true,
  medicalInflation = MEDICAL_INFLATION_HISTORICAL,
}: HealthcareExplorerProps) {
  interface DialogRow {
    category: string;
    amount: string;
    percent: string;
  }

  const [dialogData, setDialogData] = useState<{
    open: boolean;
    data: DialogRow[];
    columns: { key: string; label: string }[];
    title: string;
  }>({ open: false, data: [], columns: [], title: '' });

  const projections = useMemo(() => {
    return generateHealthcareProjection(
      currentAge,
      targetAge,
      baseMAGI,
      magiGrowthRate,
      healthCondition,
      medicareChoice,
      isMarried,
      medicalInflation
    );
  }, [currentAge, targetAge, baseMAGI, magiGrowthRate, healthCondition, medicareChoice, isMarried, medicalInflation]);

  const stats = useMemo(() => {
    const totalLifetimeCost = projections.reduce((sum, p) => sum + p.total, 0);
    const avgAnnualCost = projections.length > 0 ? totalLifetimeCost / projections.length : 0;
    const peakCost = Math.max(...projections.map(p => p.total));
    const peakAge = projections.find(p => p.total === peakCost)?.age || 0;
    const totalIRMAA = projections.reduce((sum, p) => sum + p.irmaaSurcharge, 0);
    const eolCosts = projections.filter(p => p.isEndOfLife).reduce((sum, p) => sum + p.endOfLifeSurge, 0);
    
    return { totalLifetimeCost, avgAnnualCost, peakCost, peakAge, totalIRMAA, eolCosts };
  }, [projections]);

  interface ChartClickData {
    activePayload?: Array<{ payload?: HealthcareProjectionPoint }>;
  }

  const handleChartClick = (data: ChartClickData) => {
    if (!data?.activePayload?.[0]?.payload) return;
    
    const point = data.activePayload[0].payload;
    
    setDialogData({
      open: true,
      title: `Healthcare Costs at Age ${point.age}`,
      columns: [
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Annual Amount' },
        { key: 'percent', label: '% of Total' },
      ],
      data: [
        { 
          category: 'Base Premiums (Part B + D)', 
          amount: formatCurrency(point.basePremiums),
          percent: `${((point.basePremiums / point.total) * 100).toFixed(1)}%`,
        },
        { 
          category: 'IRMAA Surcharge', 
          amount: formatCurrency(point.irmaaSurcharge),
          percent: `${((point.irmaaSurcharge / point.total) * 100).toFixed(1)}%`,
        },
        { 
          category: 'Out-of-Pocket (Incidentals)', 
          amount: formatCurrency(point.outOfPocket),
          percent: `${((point.outOfPocket / point.total) * 100).toFixed(1)}%`,
        },
        ...(point.isEndOfLife ? [{
          category: 'End-of-Life Surge (150%)',
          amount: formatCurrency(point.endOfLifeSurge),
          percent: `${((point.endOfLifeSurge / point.total) * 100).toFixed(1)}%`,
        }] : []),
        { 
          category: 'TOTAL',
          amount: formatCurrency(point.total),
          percent: '100%',
        },
      ],
    });
  };

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload?: HealthcareProjectionPoint; [key: string]: unknown }>;
    label?: string | number;
  }

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload?.length) return null;
    
    const data = payload[0]?.payload;
    if (!data) return null;
    
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg min-w-56 animate-in fade-in-0 zoom-in-95 duration-200">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-sm">Age {data.age}</span>
          <span className="text-xs text-muted-foreground">({data.year})</span>
          {data.isEndOfLife && (
            <Badge variant="destructive" className="text-[10px] py-0">EOL</Badge>
          )}
        </div>
        
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Base Premiums:
            </span>
            <span className="font-mono">{formatCurrency(data.basePremiums)}</span>
          </div>
          
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              IRMAA ({data.irmaaBracket}):
            </span>
            <span className="font-mono">{formatCurrency(data.irmaaSurcharge)}</span>
          </div>
          
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Out-of-Pocket:
            </span>
            <span className="font-mono">{formatCurrency(data.outOfPocket)}</span>
          </div>
          
          {data.endOfLifeSurge > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-destructive flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                EOL Surge:
              </span>
              <span className="font-mono text-destructive">{formatCurrency(data.endOfLifeSurge)}</span>
            </div>
          )}
          
          <div className="border-t border-border pt-1.5 mt-1.5 flex justify-between gap-4 font-medium">
            <span>Total Annual:</span>
            <span className="font-mono">{formatCurrency(data.total)}</span>
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground mt-2 italic">Click for detailed breakdown</p>
      </div>
    );
  };

  // Find the age where end-of-life begins
  const eolStartAge = projections.find(p => p.isEndOfLife)?.age;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" />
              Healthcare Explorer
            </CardTitle>
            <CardDescription className="text-xs">
              Projected Medicare costs from age 65 to {targetAge}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">
              {healthCondition} health
            </Badge>
            <Badge variant="outline" className="text-xs">
              {medicareChoice === 'medigap' ? 'Medigap' : 'Medicare Advantage'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground">Lifetime Cost</p>
            <p className="text-sm font-bold font-mono">{formatCurrency(stats.totalLifetimeCost)}</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground">Avg/Year</p>
            <p className="text-sm font-bold font-mono">{formatCurrency(stats.avgAnnualCost)}</p>
          </div>
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <p className="text-[10px] text-muted-foreground">Peak (Age {stats.peakAge})</p>
            <p className="text-sm font-bold font-mono">{formatCurrency(stats.peakCost)}</p>
          </div>
          <div className="text-center p-2 bg-amber-100/50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-[10px] text-muted-foreground">Total IRMAA</p>
            <p className="text-sm font-bold font-mono text-amber-700 dark:text-amber-400">
              {formatCurrency(stats.totalIRMAA)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={projections} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              onClick={handleChartClick}
              style={{ cursor: 'pointer' }}
            >
                <defs>
                  <linearGradient id="premiumsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="irmaaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="oopGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="eolGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.7} />
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                
                <XAxis 
                  dataKey="age"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickFormatter={(v) => v % 5 === 0 ? v : ''}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  width={55}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Legend 
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(value) => <span className="text-muted-foreground">{value}</span>}
                />
                
                {/* Stacked Areas */}
                <Area
                  type="monotone"
                  dataKey="basePremiums"
                  name="Base Premiums"
                  stackId="1"
                  stroke="hsl(var(--primary))"
                  fill="url(#premiumsGradient)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="irmaaSurcharge"
                  name="IRMAA Surcharge"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="url(#irmaaGradient)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="outOfPocket"
                  name="Out-of-Pocket"
                  stackId="1"
                  stroke="#8b5cf6"
                  fill="url(#oopGradient)"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="endOfLifeSurge"
                  name="End-of-Life Surge"
                  stackId="1"
                  stroke="hsl(var(--destructive))"
                  fill="url(#eolGradient)"
                  strokeWidth={1.5}
                />
                
                {/* EOL Start Reference Line */}
                {eolStartAge && (
                  <ReferenceLine 
                    x={eolStartAge} 
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="5 5"
                    strokeWidth={1.5}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

        {/* Warning */}
        {stats.totalIRMAA > 50000 && (
          <div className="mt-3 p-2 bg-amber-100/50 dark:bg-amber-900/20 border border-amber-300/50 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Projected IRMAA surcharges of {formatCurrency(stats.totalIRMAA)} could be reduced through 
              strategic Roth conversions or income timing.
            </p>
          </div>
        )}

        <DataTableDialog 
          open={dialogData.open}
          onOpenChange={(open) => setDialogData(prev => ({ ...prev, open }))}
          title={dialogData.title}
          data={dialogData.data}
          columns={dialogData.columns}
        />
      </CardContent>
    </Card>
  );
}
