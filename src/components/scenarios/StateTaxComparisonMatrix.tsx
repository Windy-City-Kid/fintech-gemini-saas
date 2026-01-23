/**
 * State Tax Comparison Matrix
 * Compare Social Security taxes across up to 3 states with 30-year projections
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { MapPin, TrendingDown, CheckCircle2, AlertTriangle, Plus, X } from 'lucide-react';
import { useStateTaxRules } from '@/hooks/useStateTaxRules';
import { calculate30YearTaxLeakage } from '@/lib/socialSecurityOptimizer';

interface StateTaxComparisonMatrixProps {
  annualSSBenefit: number;
  currentStateCode: string;
  colaRate?: number;
}

export function StateTaxComparisonMatrix({
  annualSSBenefit,
  currentStateCode,
  colaRate = 0.0254,
}: StateTaxComparisonMatrixProps) {
  const { rules, isLoading } = useStateTaxRules();
  const [selectedStates, setSelectedStates] = useState<string[]>([currentStateCode]);

  // Calculate 30-year leakage for all states
  const allStateLeakage = useMemo(() => {
    if (!rules.length) return [];
    return calculate30YearTaxLeakage(annualSSBenefit, rules, colaRate);
  }, [rules, annualSSBenefit, colaRate]);

  // Get comparison data for selected states
  const comparisonData = useMemo(() => {
    return selectedStates.map(code => {
      const data = allStateLeakage.find(s => s.stateCode === code);
      const rule = rules.find(r => r.state_code === code);
      return {
        stateCode: code,
        stateName: rule?.state_name || code,
        totalTaxLeakage: data?.totalTaxLeakage || 0,
        annualAverage: data?.annualAverage || 0,
        ssTaxable: data?.ssTaxable || false,
        savingsVsWorst: data?.savingsVsWorst || 0,
      };
    });
  }, [selectedStates, allStateLeakage, rules]);

  // Find best and worst among selected
  const bestState = comparisonData.reduce((best, curr) => 
    curr.totalTaxLeakage < best.totalTaxLeakage ? curr : best, comparisonData[0]);
  
  const currentStateData = comparisonData.find(s => s.stateCode === currentStateCode);

  const addState = (code: string) => {
    if (selectedStates.length < 3 && !selectedStates.includes(code)) {
      setSelectedStates([...selectedStates, code]);
    }
  };

  const removeState = (code: string) => {
    if (selectedStates.length > 1) {
      setSelectedStates(selectedStates.filter(s => s !== code));
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Chart data
  const chartData = comparisonData.map(s => ({
    name: s.stateCode,
    fullName: s.stateName,
    taxLeakage: s.totalTaxLeakage,
    isBest: s.stateCode === bestState?.stateCode,
    isCurrent: s.stateCode === currentStateCode,
  }));

  // States that don't tax SS
  const noSSTaxStates = rules.filter(r => !r.social_security_taxable);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading state tax data...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-chart-2/10 to-chart-2/5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <CardTitle>State Tax Comparison Matrix</CardTitle>
              <CardDescription>Compare Social Security taxes across states</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingDown className="h-3 w-3" />
            30-Year Projection
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* State Selector */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-sm text-muted-foreground">Compare:</span>
          {selectedStates.map((code) => {
            const rule = rules.find(r => r.state_code === code);
            return (
              <Badge 
                key={code} 
                variant={code === currentStateCode ? 'default' : 'secondary'}
                className="gap-1 px-3 py-1"
              >
                {rule?.state_name || code}
                {code === currentStateCode && <span className="text-xs">(Current)</span>}
                {selectedStates.length > 1 && (
                  <button 
                    onClick={() => removeState(code)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
          {selectedStates.length < 3 && (
            <Select onValueChange={addState}>
              <SelectTrigger className="w-[180px] h-8">
                <Plus className="h-3 w-3 mr-1" />
                <span className="text-sm">Add State</span>
              </SelectTrigger>
              <SelectContent>
                {rules
                  .filter(r => !selectedStates.includes(r.state_code))
                  .map(rule => (
                    <SelectItem key={rule.state_code} value={rule.state_code}>
                      {rule.state_name} {!rule.social_security_taxable && '✓'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {comparisonData.map((state) => (
            <div 
              key={state.stateCode}
              className={`p-4 rounded-lg border ${
                state.stateCode === bestState?.stateCode 
                  ? 'bg-chart-2/10 border-chart-2/30' 
                  : state.stateCode === currentStateCode
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-muted/30 border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{state.stateName}</span>
                {state.stateCode === bestState?.stateCode && (
                  <Badge variant="default" className="bg-chart-2 text-xs">Best</Badge>
                )}
              </div>
              
              <p className="text-2xl font-bold">
                {state.totalTaxLeakage === 0 ? (
                  <span className="text-chart-2">$0</span>
                ) : (
                  <span className="text-destructive">{formatCurrency(state.totalTaxLeakage)}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">30-year tax leakage</p>
              
              <div className="mt-3 flex items-center gap-2">
                {state.ssTaxable ? (
                  <Badge variant="outline" className="text-amber-600 border-amber-600/30 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Taxes SS
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-chart-2 border-chart-2/30 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    $0 SS Tax
                  </Badge>
                )}
              </div>

              {state.stateCode !== bestState?.stateCode && bestState && (
                <p className="text-xs text-muted-foreground mt-2">
                  Move to {bestState.stateName} to save{' '}
                  <span className="font-medium text-chart-2">
                    {formatCurrency(state.totalTaxLeakage - bestState.totalTaxLeakage)}
                  </span>
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Bar Chart */}
        {comparisonData.length > 1 && (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis 
                  type="number" 
                  tickFormatter={(v) => formatCurrency(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="fullName" 
                  width={75}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border">
                        <p className="font-semibold">{data.fullName}</p>
                        <p className="text-lg font-bold">
                          {data.taxLeakage === 0 ? (
                            <span className="text-chart-2">$0 Tax</span>
                          ) : (
                            formatCurrency(data.taxLeakage)
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          30-year SS tax leakage
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="taxLeakage" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={index}
                      fill={entry.isBest ? 'hsl(var(--chart-2))' : entry.isCurrent ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* $0 SS Tax States Alert */}
        <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-chart-2 mt-0.5" />
            <div>
              <p className="font-medium text-chart-2">States with $0 Social Security Tax</p>
              <p className="text-sm text-muted-foreground mt-1">
                {noSSTaxStates.length} states don&apos;t tax Social Security benefits:{' '}
                <span className="font-medium">
                  {noSSTaxStates.slice(0, 8).map(s => s.state_code).join(', ')}
                  {noSSTaxStates.length > 8 && ` +${noSSTaxStates.length - 8} more`}
                </span>
              </p>
              {currentStateData?.ssTaxable && (
                <p className="text-sm font-medium text-chart-2 mt-2">
                  Moving from {currentStateData.stateName} could save you{' '}
                  {formatCurrency(currentStateData.totalTaxLeakage)} over 30 years!
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
