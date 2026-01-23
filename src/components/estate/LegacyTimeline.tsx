/**
 * Interactive Legacy Timeline Component
 * Life-expectancy timeline (Age 65-100+) with milestone markers and dynamic hover
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Landmark, 
  Calendar, 
  TrendingUp, 
  AlertTriangle,
  Heart,
  FileText,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { 
  projectEstateByAge, 
  AgeProjection, 
  getStateName 
} from '@/lib/stateEstateTaxEngine';
import { formatEstateCurrency } from '@/lib/estateCalculator';

interface LegacyTimelineProps {
  currentAge: number;
  currentNetWorth: number;
  stateCode: string;
  isMarried: boolean;
  annualGrowthRate?: number;
  traditionalIraBalance: number;
  brokerageBalance: number;
  brokarageCostBasis: number;
  heirMarginalRate?: number;
  longevityAge?: number;
  rmdStartAge?: number;
}

interface Milestone {
  age: number;
  label: string;
  icon: React.ReactNode;
  description: string;
  type: 'rmd' | 'estate' | 'stepup' | 'custom';
}

export function LegacyTimeline({
  currentAge,
  currentNetWorth,
  stateCode,
  isMarried,
  annualGrowthRate = 0.05,
  traditionalIraBalance,
  brokerageBalance,
  brokarageCostBasis,
  heirMarginalRate = 0.32,
  longevityAge = 100,
  rmdStartAge = 73,
}: LegacyTimelineProps) {
  const [hoveredAge, setHoveredAge] = useState<number | null>(null);
  const [hoveredData, setHoveredData] = useState<AgeProjection | null>(null);

  // Calculate projections for all ages
  const projections = useMemo(() => {
    return projectEstateByAge({
      currentAge,
      currentNetWorth,
      stateCode,
      isMarried,
      annualGrowthRate,
      traditionalIraBalance,
      brokerageBalance,
      brokarageCostBasis,
      heirMarginalRate,
      startAge: Math.max(currentAge, 60),
      endAge: 105,
    });
  }, [
    currentAge, currentNetWorth, stateCode, isMarried, annualGrowthRate,
    traditionalIraBalance, brokerageBalance, brokarageCostBasis, heirMarginalRate,
  ]);

  // Define milestones
  const milestones = useMemo((): Milestone[] => {
    const rmdAge = currentAge > 59 && currentAge < 75 
      ? (new Date().getFullYear() - (new Date().getFullYear() - currentAge) >= 1960 ? 75 : 73)
      : rmdStartAge;
    
    return [
      {
        age: rmdAge,
        label: 'RMDs Start',
        icon: <FileText className="h-3.5 w-3.5" />,
        description: 'Required Minimum Distributions begin from traditional retirement accounts',
        type: 'rmd',
      },
      {
        age: longevityAge,
        label: 'Projected Estate',
        icon: <Landmark className="h-3.5 w-3.5" />,
        description: 'Estimated net worth at projected life expectancy',
        type: 'estate',
      },
      {
        age: longevityAge,
        label: 'Step-up in Basis',
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        description: 'Heirs receive stepped-up cost basis on inherited assets',
        type: 'stepup',
      },
    ];
  }, [currentAge, longevityAge, rmdStartAge]);

  // Chart data with tax breakdown
  const chartData = useMemo(() => {
    return projections.map(p => ({
      ...p,
      taxLeakageStacked: p.totalTaxLeakage,
    }));
  }, [projections]);

  // Handle tooltip
  interface TooltipMouseData {
    activePayload?: Array<{ payload?: AgeProjection }>;
  }

  const handleMouseMove = useCallback((data: TooltipMouseData) => {
    if (data?.activePayload?.[0]?.payload) {
      const payload = data.activePayload[0].payload;
      setHoveredAge(payload.age);
      setHoveredData(payload);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredAge(null);
    setHoveredData(null);
  }, []);

  // Custom tooltip
  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{ payload?: AgeProjection; [key: string]: unknown }>;
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload?.[0]?.payload) return null;
    
    const data = payload[0].payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-4 min-w-64">
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold">Age {data.age}</span>
          <span className="text-sm text-muted-foreground">{data.year}</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Net Worth</span>
            <span className="font-bold text-primary">
              {formatEstateCurrency(data.projectedNetWorth)}
            </span>
          </div>
          
          <div className="border-t border-border pt-2 mt-2">
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              If death occurs at this age:
            </p>
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Federal Estate Tax</span>
                <span className="text-destructive font-mono">
                  {data.federalEstateTax > 0 ? `-${formatEstateCurrency(data.federalEstateTax)}` : '$0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">State Estate Tax</span>
                <span className="text-destructive font-mono">
                  {data.stateEstateTax > 0 ? `-${formatEstateCurrency(data.stateEstateTax)}` : '$0'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Heir Income Tax (10-yr rule)</span>
                <span className="text-destructive font-mono">
                  {data.heirIncomeTax > 0 ? `-${formatEstateCurrency(data.heirIncomeTax)}` : '$0'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-border mt-1">
                <span className="font-medium">Total Tax Leakage</span>
                <span className="font-bold text-destructive">
                  {formatEstateCurrency(data.totalTaxLeakage)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-medium text-primary">Net to Heirs</span>
            <span className="font-bold text-primary">
              {formatEstateCurrency(data.netToHeirs)}
            </span>
          </div>
          
          {data.stepUpBasisBenefit > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Step-up Basis Savings</span>
              <span>+{formatEstateCurrency(data.stepUpBasisBenefit)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentProjection = projections.find(p => p.age === longevityAge);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Interactive Legacy Timeline</CardTitle>
              <CardDescription>
                Hover over any age to see projected estate value and tax impact
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{getStateName(stateCode)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Milestone Markers */}
        <div className="flex flex-wrap gap-3">
          {milestones.map((milestone, idx) => (
            <Badge 
              key={idx} 
              variant={milestone.type === 'rmd' ? 'secondary' : 'outline'}
              className="flex items-center gap-1.5 py-1.5 px-3"
            >
              {milestone.icon}
              <span>Age {milestone.age}: {milestone.label}</span>
            </Badge>
          ))}
        </div>

        {/* Summary Cards */}
        {currentProjection && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Estate at Age {longevityAge}</p>
              <p className="text-lg font-bold text-primary">
                {formatEstateCurrency(currentProjection.projectedNetWorth)}
              </p>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Total Tax Leakage</p>
              <p className="text-lg font-bold text-destructive">
                {formatEstateCurrency(currentProjection.totalTaxLeakage)}
              </p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Net to Heirs</p>
              <p className="text-lg font-bold text-primary">
                {formatEstateCurrency(currentProjection.netToHeirs)}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">Step-up Benefit</p>
              <p className="text-lg font-bold text-green-600">
                {formatEstateCurrency(currentProjection.stepUpBasisBenefit)}
              </p>
            </div>
          </div>
        )}

        {/* Timeline Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="age" 
                tick={{ fontSize: 12 }}
                tickFormatter={(age) => `${age}`}
                label={{ value: 'Age', position: 'bottom', offset: 0 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(val) => `$${(val / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Net Worth Line */}
              <Line
                type="monotone"
                dataKey="projectedNetWorth"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Net Worth"
              />
              
              {/* Tax Leakage Area */}
              <Area
                type="monotone"
                dataKey="totalTaxLeakage"
                fill="hsl(var(--destructive) / 0.2)"
                stroke="hsl(var(--destructive))"
                strokeWidth={1}
                name="Tax Leakage"
              />
              
              {/* Milestone Reference Lines */}
              {milestones.map((milestone, idx) => (
                <ReferenceLine
                  key={idx}
                  x={milestone.age}
                  stroke={milestone.type === 'rmd' ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-2))'}
                  strokeDasharray="5 5"
                  label={{
                    value: milestone.label,
                    position: 'top',
                    fill: 'hsl(var(--foreground))',
                    fontSize: 10,
                  }}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-primary" />
            <span className="text-muted-foreground">Projected Net Worth</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-destructive/20 border border-destructive rounded" />
            <span className="text-muted-foreground">Tax Leakage Zone</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
