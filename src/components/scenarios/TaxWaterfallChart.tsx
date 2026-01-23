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
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Receipt, ArrowRight, TrendingDown, TrendingUp, Info } from 'lucide-react';
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TaxWaterfallChartProps {
  grossIncome: number;
  // Current location taxes
  currentFederalTax: number;
  currentStateTax: number;
  currentFICA: number;
  currentMedicare: number;
  currentPropertyTax?: number;
  currentStateName: string;
  // Destination location taxes (optional for comparison)
  destinationFederalTax?: number;
  destinationStateTax?: number;
  destinationFICA?: number;
  destinationMedicare?: number;
  destinationPropertyTax?: number;
  destinationStateName?: string;
  // Display options
  showComparison?: boolean;
  isRetired?: boolean;
}

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const COLORS = {
  gross: '#3b82f6',
  federal: '#ef4444',
  state: '#f97316',
  fica: '#eab308',
  medicare: '#a855f7',
  property: '#6366f1',
  net: '#10b981',
  savings: '#22d3ee',
};

interface WaterfallDataPoint {
  name: string;
  value: number;
  displayValue: number;
  start?: number;
  end?: number;
  type?: string;
  color?: string;
  rate?: number;
  description?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: WaterfallDataPoint;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  
  return (
    <div className="bg-card border border-border rounded-lg shadow-xl p-3 min-w-[200px]">
      <div className="font-semibold text-foreground border-b border-border pb-2 mb-2">
        {data.name}
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Amount</span>
          <span className={cn(
            "text-sm font-bold",
            data.type === 'income' ? 'text-primary' : 
            data.type === 'net' ? 'text-chart-2' : 'text-destructive'
          )}>
            {data.type === 'tax' ? '-' : ''}{formatCurrency(Math.abs(data.displayValue))}
          </span>
        </div>
        {data.rate && (
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Effective Rate</span>
            <span className="text-sm text-muted-foreground">{data.rate}%</span>
          </div>
        )}
        {data.description && (
          <p className="text-xs text-muted-foreground mt-1 pt-1 border-t border-border">
            {data.description}
          </p>
        )}
      </div>
    </div>
  );
};

export function TaxWaterfallChart({
  grossIncome,
  currentFederalTax,
  currentStateTax,
  currentFICA,
  currentMedicare,
  currentPropertyTax = 0,
  currentStateName,
  destinationFederalTax,
  destinationStateTax,
  destinationFICA,
  destinationMedicare,
  destinationPropertyTax = 0,
  destinationStateName,
  showComparison = true,
  isRetired = false,
}: TaxWaterfallChartProps) {
  const hasDestination = showComparison && destinationStateName && destinationStateTax !== undefined;

  // Build waterfall data for current location
  const currentData = useMemo(() => {
    let runningTotal = grossIncome;
    const data = [];

    // Gross Income (starting point)
    data.push({
      name: 'Gross Income',
      value: grossIncome,
      displayValue: grossIncome,
      start: 0,
      end: grossIncome,
      type: 'income',
      color: COLORS.gross,
      description: 'Total income before taxes',
    });

    // Federal Tax
    runningTotal -= currentFederalTax;
    data.push({
      name: 'Federal Tax',
      value: -currentFederalTax,
      displayValue: currentFederalTax,
      start: runningTotal,
      end: runningTotal + currentFederalTax,
      type: 'tax',
      color: COLORS.federal,
      rate: ((currentFederalTax / grossIncome) * 100).toFixed(1),
      description: 'Federal income tax based on tax brackets',
    });

    // State Tax
    runningTotal -= currentStateTax;
    data.push({
      name: `${currentStateName} Tax`,
      value: -currentStateTax,
      displayValue: currentStateTax,
      start: runningTotal,
      end: runningTotal + currentStateTax,
      type: 'tax',
      color: COLORS.state,
      rate: ((currentStateTax / grossIncome) * 100).toFixed(1),
      description: `State income tax for ${currentStateName}`,
    });

    // FICA (only if not retired)
    if (!isRetired && currentFICA > 0) {
      runningTotal -= currentFICA;
      data.push({
        name: 'FICA',
        value: -currentFICA,
        displayValue: currentFICA,
        start: runningTotal,
        end: runningTotal + currentFICA,
        type: 'tax',
        color: COLORS.fica,
        rate: ((currentFICA / grossIncome) * 100).toFixed(1),
        description: 'Social Security tax (6.2% up to wage base)',
      });
    }

    // Medicare
    runningTotal -= currentMedicare;
    data.push({
      name: 'Medicare',
      value: -currentMedicare,
      displayValue: currentMedicare,
      start: runningTotal,
      end: runningTotal + currentMedicare,
      type: 'tax',
      color: COLORS.medicare,
      rate: ((currentMedicare / grossIncome) * 100).toFixed(1),
      description: isRetired ? 'Medicare Part B & D premiums' : 'Medicare tax (1.45%)',
    });

    // Property Tax
    if (currentPropertyTax > 0) {
      runningTotal -= currentPropertyTax;
      data.push({
        name: 'Property Tax',
        value: -currentPropertyTax,
        displayValue: currentPropertyTax,
        start: runningTotal,
        end: runningTotal + currentPropertyTax,
        type: 'tax',
        color: COLORS.property,
        rate: ((currentPropertyTax / grossIncome) * 100).toFixed(1),
        description: 'Annual property tax on primary residence',
      });
    }

    // Net Income
    data.push({
      name: 'Net Income',
      value: runningTotal,
      displayValue: runningTotal,
      start: 0,
      end: runningTotal,
      type: 'net',
      color: COLORS.net,
      description: 'Take-home income after all taxes',
    });

    return data;
  }, [grossIncome, currentFederalTax, currentStateTax, currentFICA, currentMedicare, currentPropertyTax, currentStateName, isRetired]);

  // Build waterfall data for destination location
  const destinationData = useMemo(() => {
    if (!hasDestination) return null;

    let runningTotal = grossIncome;
    const data = [];

    data.push({
      name: 'Gross Income',
      value: grossIncome,
      displayValue: grossIncome,
      start: 0,
      end: grossIncome,
      type: 'income',
      color: COLORS.gross,
    });

    runningTotal -= (destinationFederalTax || currentFederalTax);
    data.push({
      name: 'Federal Tax',
      value: -(destinationFederalTax || currentFederalTax),
      displayValue: destinationFederalTax || currentFederalTax,
      start: runningTotal,
      end: runningTotal + (destinationFederalTax || currentFederalTax),
      type: 'tax',
      color: COLORS.federal,
      rate: (((destinationFederalTax || currentFederalTax) / grossIncome) * 100).toFixed(1),
    });

    runningTotal -= (destinationStateTax || 0);
    data.push({
      name: `${destinationStateName} Tax`,
      value: -(destinationStateTax || 0),
      displayValue: destinationStateTax || 0,
      start: runningTotal,
      end: runningTotal + (destinationStateTax || 0),
      type: 'tax',
      color: COLORS.state,
      rate: (((destinationStateTax || 0) / grossIncome) * 100).toFixed(1),
    });

    if (!isRetired && (destinationFICA || currentFICA) > 0) {
      const fica = destinationFICA || currentFICA;
      runningTotal -= fica;
      data.push({
        name: 'FICA',
        value: -fica,
        displayValue: fica,
        start: runningTotal,
        end: runningTotal + fica,
        type: 'tax',
        color: COLORS.fica,
        rate: ((fica / grossIncome) * 100).toFixed(1),
      });
    }

    const medicare = destinationMedicare || currentMedicare;
    runningTotal -= medicare;
    data.push({
      name: 'Medicare',
      value: -medicare,
      displayValue: medicare,
      start: runningTotal,
      end: runningTotal + medicare,
      type: 'tax',
      color: COLORS.medicare,
      rate: ((medicare / grossIncome) * 100).toFixed(1),
    });

    if (destinationPropertyTax > 0) {
      runningTotal -= destinationPropertyTax;
      data.push({
        name: 'Property Tax',
        value: -destinationPropertyTax,
        displayValue: destinationPropertyTax,
        start: runningTotal,
        end: runningTotal + destinationPropertyTax,
        type: 'tax',
        color: COLORS.property,
        rate: ((destinationPropertyTax / grossIncome) * 100).toFixed(1),
      });
    }

    data.push({
      name: 'Net Income',
      value: runningTotal,
      displayValue: runningTotal,
      start: 0,
      end: runningTotal,
      type: 'net',
      color: COLORS.net,
    });

    return data;
  }, [hasDestination, grossIncome, destinationFederalTax, destinationStateTax, destinationFICA, destinationMedicare, destinationPropertyTax, destinationStateName, currentFederalTax, currentFICA, currentMedicare, isRetired]);

  // Calculate totals and savings
  const currentTotalTax = currentFederalTax + currentStateTax + currentFICA + currentMedicare + currentPropertyTax;
  const currentNetIncome = grossIncome - currentTotalTax;
  
  const destinationTotalTax = hasDestination 
    ? (destinationFederalTax || currentFederalTax) + (destinationStateTax || 0) + (destinationFICA || currentFICA) + (destinationMedicare || currentMedicare) + destinationPropertyTax
    : 0;
  const destinationNetIncome = hasDestination ? grossIncome - destinationTotalTax : 0;
  
  const taxSavings = hasDestination ? currentTotalTax - destinationTotalTax : 0;
  const effectiveRateCurrent = ((currentTotalTax / grossIncome) * 100).toFixed(1);
  const effectiveRateDestination = hasDestination ? ((destinationTotalTax / grossIncome) * 100).toFixed(1) : '0';

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            Tax Waterfall
            {hasDestination && (
              <Badge variant="outline" className="ml-2 text-xs">
                Comparison Mode
              </Badge>
            )}
          </CardTitle>
          <UITooltip>
            <TooltipTrigger>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Visualizes how taxes reduce gross income to net income. Compare current vs. destination state to see potential savings from relocation.</p>
            </TooltipContent>
          </UITooltip>
        </div>
        
        {/* Summary Stats */}
        <div className="flex flex-wrap gap-4 mt-2 text-xs">
          <div>
            <span className="text-muted-foreground">{currentStateName} Effective Rate: </span>
            <span className="font-medium text-destructive">{effectiveRateCurrent}%</span>
          </div>
          {hasDestination && (
            <>
              <div>
                <span className="text-muted-foreground">{destinationStateName} Effective Rate: </span>
                <span className="font-medium text-destructive">{effectiveRateDestination}%</span>
              </div>
              <div className="flex items-center gap-1">
                {taxSavings > 0 ? (
                  <>
                    <TrendingDown className="h-3 w-3 text-chart-2" />
                    <span className="text-chart-2 font-medium">Save {formatCurrency(taxSavings)}/yr</span>
                  </>
                ) : taxSavings < 0 ? (
                  <>
                    <TrendingUp className="h-3 w-3 text-destructive" />
                    <span className="text-destructive font-medium">Pay {formatCurrency(Math.abs(taxSavings))}/yr more</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">No change</span>
                )}
              </div>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className={cn(
          "grid gap-4",
          hasDestination ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
        )}>
          {/* Current Location Waterfall */}
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-primary" />
              {currentStateName} (Current)
            </div>
            <ResponsiveContainer width="100%" height={hasDestination ? 200 : 260}>
              <BarChart
                data={currentData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-border/30" />
                <XAxis 
                  type="number" 
                  tickFormatter={formatCurrency}
                  tick={{ fontSize: 10 }}
                  domain={[0, grossIncome * 1.05]}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  width={75}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="end" stackId="a" fill="transparent" />
                <Bar dataKey="start" stackId="a" fill="transparent" />
                <Bar 
                  dataKey={(d) => Math.abs(d.end - d.start)} 
                  radius={[0, 4, 4, 0]}
                >
                  {currentData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Destination Location Waterfall */}
          {hasDestination && destinationData && (
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-chart-2" />
                {destinationStateName} (Destination)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={destinationData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-border/30" />
                  <XAxis 
                    type="number" 
                    tickFormatter={formatCurrency}
                    tick={{ fontSize: 10 }}
                    domain={[0, grossIncome * 1.05]}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10 }}
                    width={75}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar 
                    dataKey={(d) => Math.abs(d.end - d.start)} 
                    radius={[0, 4, 4, 0]}
                  >
                    {destinationData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border justify-center">
          {[
            { key: 'gross', color: COLORS.gross, label: 'Gross Income' },
            { key: 'federal', color: COLORS.federal, label: 'Federal' },
            { key: 'state', color: COLORS.state, label: 'State' },
            ...(!isRetired ? [{ key: 'fica', color: COLORS.fica, label: 'FICA' }] : []),
            { key: 'medicare', color: COLORS.medicare, label: 'Medicare' },
            { key: 'property', color: COLORS.property, label: 'Property' },
            { key: 'net', color: COLORS.net, label: 'Net Income' },
          ].map(item => (
            <div key={item.key} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Savings Summary for Comparison */}
        {hasDestination && taxSavings !== 0 && (
          <div className={cn(
            "mt-3 p-3 rounded-lg border text-center",
            taxSavings > 0 
              ? "bg-chart-2/10 border-chart-2/30" 
              : "bg-destructive/10 border-destructive/30"
          )}>
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">{currentStateName}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{destinationStateName}</span>
            </div>
            <div className={cn(
              "text-lg font-bold mt-1",
              taxSavings > 0 ? "text-chart-2" : "text-destructive"
            )}>
              {taxSavings > 0 ? 'Save' : 'Pay'} {formatCurrency(Math.abs(taxSavings))}/year
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {taxSavings > 0 
                ? `${formatCurrency(taxSavings * 20)} over 20 years in retirement`
                : `${formatCurrency(Math.abs(taxSavings) * 20)} more over 20 years in retirement`
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
