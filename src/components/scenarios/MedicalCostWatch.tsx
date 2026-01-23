import { useMemo } from 'react';
import { AlertTriangle, Heart, TrendingUp, Info, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  projectIRMAAImpacts, 
  MEDICARE_PART_B_STANDARD,
  MEDICAL_INFLATION_HISTORICAL,
  IRMAAProjection,
  IRMAA_BRACKETS_2026,
} from '@/lib/medicareCalculator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface MedicalCostWatchProps {
  currentAge: number;
  retirementAge: number;
  ssAnnualBenefit: number;
  pensionIncome: number;
  estimatedIRABalance: number;
  investmentIncome: number;
  isMarried: boolean;
  medicalInflationRate?: number;
}

export function MedicalCostWatch({
  currentAge,
  retirementAge,
  ssAnnualBenefit,
  pensionIncome,
  estimatedIRABalance,
  investmentIncome,
  isMarried,
  medicalInflationRate = MEDICAL_INFLATION_HISTORICAL,
}: MedicalCostWatchProps) {
  // Project IRMAA impacts
  const projections = useMemo(() => 
    projectIRMAAImpacts(
      currentAge,
      retirementAge,
      ssAnnualBenefit,
      pensionIncome,
      estimatedIRABalance,
      investmentIncome,
      isMarried,
      medicalInflationRate
    ),
    [currentAge, retirementAge, ssAnnualBenefit, pensionIncome, estimatedIRABalance, investmentIncome, isMarried, medicalInflationRate]
  );

  // Find years with IRMAA surcharges
  const yearsWithSurcharge = projections.filter(p => p.isHighBracket);
  const totalSurchargeRisk = yearsWithSurcharge.reduce((sum, p) => sum + p.surcharge, 0);
  
  // Get first year hitting a high bracket
  const firstHighBracketYear = yearsWithSurcharge[0];
  
  // Calculate lifetime Medicare costs
  const totalMedicareCosts = projections.reduce((sum, p) => sum + p.annualPremium, 0);
  const standardCostComparison = projections.length * MEDICARE_PART_B_STANDARD * 12;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Chart data - show premiums by age
  const chartData = projections.slice(0, 25).map(p => ({
    age: p.age,
    premium: p.annualPremium,
    surcharge: p.surcharge,
    bracket: p.bracket,
    isHigh: p.isHighBracket,
  }));

  interface TooltipPayloadItem {
    payload?: {
      age: number;
      premium: number;
      surcharge: number;
      bracket: string;
      isHigh: boolean;
    };
    [key: string]: unknown;
  }

  interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (!active || !payload?.[0]?.payload) return null;
    const data = payload[0].payload;
    
    return (
      <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
        <div className="font-semibold mb-1">Age {data.age}</div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Premium:</span>
            <span className="font-mono">{formatCurrency(data.premium)}/yr</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Bracket:</span>
            <span className={data.isHigh ? 'text-destructive' : 'text-muted-foreground'}>
              {data.bracket}
            </span>
          </div>
          {data.surcharge > 0 && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">IRMAA Surcharge:</span>
              <span className="font-mono text-destructive">+{formatCurrency(data.surcharge)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-destructive" />
              Medical Cost Watch
            </CardTitle>
            <CardDescription>
              Medicare IRMAA surcharge projections based on income
            </CardDescription>
          </div>
          {yearsWithSurcharge.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {yearsWithSurcharge.length} years at risk
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground mb-1">2026 Standard Premium</div>
            <div className="text-lg font-bold font-mono">${MEDICARE_PART_B_STANDARD}/mo</div>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground mb-1">Projected Lifetime Cost</div>
            <div className="text-lg font-bold font-mono text-primary">
              {formatCurrency(totalMedicareCosts)}
            </div>
          </div>
          
          <div className={`p-3 rounded-lg border ${yearsWithSurcharge.length > 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-chart-2/10 border-chart-2/30'}`}>
            <div className="text-xs text-muted-foreground mb-1">IRMAA Surcharge Risk</div>
            <div className={`text-lg font-bold font-mono ${yearsWithSurcharge.length > 0 ? 'text-destructive' : 'text-chart-2'}`}>
              {yearsWithSurcharge.length > 0 ? formatCurrency(totalSurchargeRisk) : 'None'}
            </div>
          </div>
          
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              Medical Inflation
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Historical average: 3.36%</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-lg font-bold font-mono">
              {(medicalInflationRate * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        {/* IRMAA Alert */}
        {firstHighBracketYear && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">IRMAA Surcharge Warning</p>
                <p className="text-sm text-muted-foreground mt-1">
                  At age <span className="font-semibold">{firstHighBracketYear.age}</span>, 
                  your projected MAGI of {formatCurrency(firstHighBracketYear.estimatedMAGI)} triggers 
                  the <span className="font-semibold">{firstHighBracketYear.bracket}</span> bracket, 
                  adding ~{formatCurrency(firstHighBracketYear.surcharge)}/year to your Medicare premiums.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Consider Roth conversions or strategic withdrawals to manage MAGI.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Premium Projection Chart */}
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="age" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(age) => age % 5 === 0 ? `${age}` : ''}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={formatCurrency}
                width={60}
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={MEDICARE_PART_B_STANDARD * 12} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: 'Standard', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Bar dataKey="premium" radius={[2, 2, 0, 0]} maxBarSize={20}>
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isHigh ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'}
                    opacity={entry.isHigh ? 0.8 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* IRMAA Brackets Reference */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />
            2026 IRMAA Brackets (Part B)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {IRMAA_BRACKETS_2026.slice(0, 5).map((bracket, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-2 rounded bg-background/50"
              >
                <div>
                  <span className="text-muted-foreground">
                    {isMarried 
                      ? `$${(bracket.jointMin / 1000).toFixed(0)}K - $${bracket.jointMax === Infinity ? '∞' : (bracket.jointMax / 1000).toFixed(0) + 'K'}`
                      : `$${(bracket.singleMin / 1000).toFixed(0)}K - $${bracket.singleMax === Infinity ? '∞' : (bracket.singleMax / 1000).toFixed(0) + 'K'}`
                    }
                  </span>
                </div>
                <Badge variant={index === 0 ? 'secondary' : 'destructive'} className="font-mono">
                  ${bracket.partBMonthly}/mo
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
