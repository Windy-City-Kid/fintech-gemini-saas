/**
 * Relocation Decision Matrix
 * Side-by-side comparison of current state vs 2 goal states
 * Shows Annual State Tax, 30-Year Savings, and IRMAA warnings
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import {
  MapPin,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  X,
  Plus,
  HeartPulse,
  Landmark,
  Home,
} from 'lucide-react';
import { useStateTaxRules } from '@/hooks/useStateTaxRules';
import {
  calculate30YearStateComparison,
  checkIRMAAInteraction,
  getRelocationSavingsHeadline,
  TAXING_8_STATES_2026,
  NO_INCOME_TAX_STATES,
  SSA_2026_CONSTANTS,
  StateComparisonResult,
} from '@/lib/stateTax2026Engine';

interface RelocationDecisionMatrixProps {
  currentStateCode: string;
  annualSSBenefit: number;
  annualRMDIncome: number;
  otherIncome?: number;
  homeValue?: number;
  projectedAGI: number;
  isJoint?: boolean;
}

const friendlinessColors: Record<string, string> = {
  excellent: 'bg-emerald-500',
  good: 'bg-green-500',
  neutral: 'bg-amber-500',
  poor: 'bg-red-500',
};

export function RelocationDecisionMatrix({
  currentStateCode,
  annualSSBenefit,
  annualRMDIncome,
  otherIncome = 0,
  homeValue = 350000,
  projectedAGI,
  isJoint = true,
}: RelocationDecisionMatrixProps) {
  const { rules, isLoading } = useStateTaxRules();
  const [goalState1, setGoalState1] = useState<string>('FL');
  const [goalState2, setGoalState2] = useState<string>('NV');

  // Get comparison data
  const comparisonData = useMemo(() => {
    if (!rules.length) return [];
    
    return calculate30YearStateComparison(
      annualSSBenefit,
      annualRMDIncome,
      otherIncome,
      homeValue,
      [currentStateCode, goalState1, goalState2].filter(Boolean),
      rules,
      SSA_2026_CONSTANTS.COLA_RATE
    );
  }, [rules, currentStateCode, goalState1, goalState2, annualSSBenefit, annualRMDIncome, otherIncome, homeValue]);

  // Get IRMAA warnings for each state
  const irmaaWarnings = useMemo(() => {
    const states = [currentStateCode, goalState1, goalState2].filter(Boolean);
    return states.reduce((acc, code) => {
      acc[code] = checkIRMAAInteraction(code, projectedAGI, isJoint);
      return acc;
    }, {} as Record<string, ReturnType<typeof checkIRMAAInteraction>>);
  }, [currentStateCode, goalState1, goalState2, projectedAGI, isJoint]);

  // Find best state among selected
  const currentStateData = comparisonData.find(s => s.stateCode === currentStateCode);
  const bestState = comparisonData.length > 0
    ? comparisonData.reduce((best, curr) => curr.totalTax30Year < best.totalTax30Year ? curr : best, comparisonData[0])
    : null;

  // Calculate savings headline
  const savingsVsCurrent = currentStateData && bestState && bestState.stateCode !== currentStateCode
    ? currentStateData.totalTax30Year - bestState.totalTax30Year
    : 0;

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${Math.round(value).toLocaleString()}`;
  };

  // Chart data
  const chartData = comparisonData.map(s => ({
    name: s.stateName,
    stateCode: s.stateCode,
    'Annual Tax (Year 1)': s.year1Tax,
    'SS Tax': s.isSSTaxed ? s.year1Tax * 0.15 : 0, // Estimate SS portion
    'Other Income Tax': s.year1Tax * (s.isSSTaxed ? 0.55 : 0.70),
    'Property Tax': s.year1Tax * 0.30,
    isBest: s.stateCode === bestState?.stateCode,
    isCurrent: s.stateCode === currentStateCode,
  }));

  const thirtyYearChartData = comparisonData.map(s => ({
    name: s.stateName,
    stateCode: s.stateCode,
    value: s.totalTax30Year,
    isBest: s.stateCode === bestState?.stateCode,
    isCurrent: s.stateCode === currentStateCode,
  }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Loading 2026 state tax data...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>2026 Relocation Decision Matrix</CardTitle>
              <CardDescription>
                Compare your current state against goal destinations (SS + RMD + Property Tax)
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <TrendingDown className="h-3 w-3" />
            {SSA_2026_CONSTANTS.COLA_RATE * 100}% COLA
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Headline Savings */}
        {savingsVsCurrent > 0 && bestState && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-lg">
                {getRelocationSavingsHeadline(currentStateCode, bestState.stateName, savingsVsCurrent)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Based on ${annualSSBenefit.toLocaleString()} SS + ${annualRMDIncome.toLocaleString()} RMD income with 2.8% COLA
            </p>
          </div>
        )}

        {/* State Selection Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Current State */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Home className="h-3 w-3" />
              Current State
            </label>
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="font-bold">{rules.find(r => r.state_code === currentStateCode)?.state_name || currentStateCode}</span>
                <Badge
                  className={`${friendlinessColors[currentStateData?.retirementFriendliness || 'neutral']} text-white text-xs`}
                >
                  {currentStateData?.retirementFriendliness || 'neutral'}
                </Badge>
              </div>
              {TAXING_8_STATES_2026.find(s => s.stateCode === currentStateCode) && (
                <Badge variant="destructive" className="mt-2 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Taxes Social Security
                </Badge>
              )}
            </div>
          </div>

          {/* Goal State 1 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Goal State 1</label>
            <Select value={goalState1} onValueChange={setGoalState1}>
              <SelectTrigger>
                <SelectValue placeholder="Select state..." />
              </SelectTrigger>
              <SelectContent>
                {rules
                  .filter(r => r.state_code !== currentStateCode && r.state_code !== goalState2)
                  .map((rule) => (
                    <SelectItem key={rule.state_code} value={rule.state_code}>
                      <div className="flex items-center gap-2">
                        <span>{rule.state_name}</span>
                        {NO_INCOME_TAX_STATES.includes(rule.state_code) && (
                          <Badge variant="outline" className="text-xs text-emerald-600">No Tax</Badge>
                        )}
                        {TAXING_8_STATES_2026.find(s => s.stateCode === rule.state_code) && (
                          <Badge variant="outline" className="text-xs text-amber-600">SS Taxed</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* Goal State 2 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Goal State 2</label>
            <Select value={goalState2} onValueChange={setGoalState2}>
              <SelectTrigger>
                <SelectValue placeholder="Select state..." />
              </SelectTrigger>
              <SelectContent>
                {rules
                  .filter(r => r.state_code !== currentStateCode && r.state_code !== goalState1)
                  .map((rule) => (
                    <SelectItem key={rule.state_code} value={rule.state_code}>
                      <div className="flex items-center gap-2">
                        <span>{rule.state_name}</span>
                        {NO_INCOME_TAX_STATES.includes(rule.state_code) && (
                          <Badge variant="outline" className="text-xs text-emerald-600">No Tax</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* IRMAA Warnings */}
        {Object.entries(irmaaWarnings).some(([_, warning]) => warning.hasWarning) && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <HeartPulse className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">
              IRMAA-Tax Interaction Warning
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {Object.entries(irmaaWarnings).map(([code, warning]) => (
                warning.hasWarning && (
                  <div key={code} className="mt-2">
                    <strong>{code}:</strong> {warning.warningMessage}
                  </div>
                )
              ))}
            </AlertDescription>
          </Alert>
        )}

        <Separator />

        {/* State Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {comparisonData.map((state) => {
            const isBest = state.stateCode === bestState?.stateCode;
            const isCurrent = state.stateCode === currentStateCode;
            const savingsFromCurrent = currentStateData
              ? currentStateData.totalTax30Year - state.totalTax30Year
              : 0;

            return (
              <div
                key={state.stateCode}
                className={`p-4 rounded-lg border-2 ${
                  isBest
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : isCurrent
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-muted/30 border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-bold text-lg">{state.stateName}</span>
                    {isCurrent && <Badge variant="outline" className="ml-2 text-xs">Current</Badge>}
                  </div>
                  {isBest && (
                    <Badge className="bg-emerald-500 text-white">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Best
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Year 1 Tax */}
                  <div>
                    <p className="text-xs text-muted-foreground">Annual Tax (Year 1)</p>
                    <p className="text-xl font-bold">
                      {state.year1Tax === 0 ? (
                        <span className="text-emerald-500">$0</span>
                      ) : (
                        formatCurrency(state.year1Tax)
                      )}
                    </p>
                  </div>

                  {/* 30-Year Total */}
                  <div>
                    <p className="text-xs text-muted-foreground">30-Year Total Tax</p>
                    <p className="text-2xl font-bold">
                      {state.totalTax30Year === 0 ? (
                        <span className="text-emerald-500">$0</span>
                      ) : (
                        <span className="text-destructive">{formatCurrency(state.totalTax30Year)}</span>
                      )}
                    </p>
                  </div>

                  {/* Savings vs Current */}
                  {!isCurrent && savingsFromCurrent !== 0 && (
                    <div className={`p-2 rounded ${savingsFromCurrent > 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                      <p className="text-xs font-medium">
                        {savingsFromCurrent > 0 ? (
                          <span className="text-emerald-600">Save {formatCurrency(savingsFromCurrent)}</span>
                        ) : (
                          <span className="text-destructive">Costs {formatCurrency(Math.abs(savingsFromCurrent))} more</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Tax Details */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {state.isSSTaxed ? (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                        SS Taxed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                        SS Exempt
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      {state.topMarginalRate === 0 ? 'No Income Tax' : `${state.topMarginalRate}% Inc`}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {state.propertyTaxRate}% Prop
                    </Badge>
                  </div>

                  {/* Special Notes */}
                  {state.specialNotes && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {state.specialNotes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 30-Year Tax Leakage Chart */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Landmark className="h-5 w-5 text-primary" />
            30-Year Tax Leakage Comparison
          </h4>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={thirtyYearChartData} layout="vertical" margin={{ left: 100, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={95}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border">
                        <p className="font-semibold">{data.name}</p>
                        <p className="text-xl font-bold">
                          {data.value === 0 ? (
                            <span className="text-emerald-500">$0 State Tax</span>
                          ) : (
                            formatCurrency(data.value)
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">30-year total tax burden</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {thirtyYearChartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={
                        entry.isBest
                          ? 'hsl(var(--chart-2))'
                          : entry.isCurrent
                          ? 'hsl(var(--primary))'
                          : 'hsl(var(--muted-foreground))'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* The Taxing 8 States Info */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <h5 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            The "Taxing 8" States for 2026
          </h5>
          <p className="text-xs text-muted-foreground mb-2">
            These 8 states still tax Social Security income in 2026 (with various exemption thresholds):
          </p>
          <div className="flex flex-wrap gap-2">
            {TAXING_8_STATES_2026.map((state) => (
              <Badge
                key={state.stateCode}
                variant="outline"
                className="text-xs"
              >
                {state.stateCode}: {state.thresholdJoint ? `Exempt < $${(state.thresholdJoint / 1000).toFixed(0)}K` : 'Follows Federal'}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-emerald-600 mt-2 font-medium">
            ✓ West Virginia is now fully exempt as of 2026
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
