/**
 * Heir Impact Mode Component
 * Side-by-side comparison of heir inheriting Traditional IRA vs Roth IRA
 * Models SECURE Act 10-year rule showing tax spike prevention
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  TrendingUp, 
  ArrowRight, 
  AlertTriangle,
  Lightbulb,
  DollarSign,
  PiggyBank,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from 'recharts';

interface HeirImpactModeProps {
  traditionalBalance: number;
  rothBalance: number;
  yourCurrentTaxRate: number;
  yourAge: number;
  heirAge?: number;
  heirMarginalRate?: number;
  conversionAmount?: number;
  onConvert?: (amount: number) => void;
}

interface YearlyDistribution {
  year: number;
  heirAge: number;
  traditionalDistribution: number;
  traditionalTax: number;
  traditionalNet: number;
  rothDistribution: number;
  rothTax: number;
  rothNet: number;
  taxSavings: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export function HeirImpactMode({
  traditionalBalance,
  rothBalance,
  yourCurrentTaxRate,
  yourAge,
  heirAge = 40,
  heirMarginalRate = 0.35,
  conversionAmount = 0,
  onConvert,
}: HeirImpactModeProps) {
  const [heirAgeInput, setHeirAgeInput] = useState(heirAge);
  const [heirRateInput, setHeirRateInput] = useState(heirMarginalRate * 100);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);

  // Calculate 10-year distribution scenario
  const distributions = useMemo((): YearlyDistribution[] => {
    const results: YearlyDistribution[] = [];
    const annualTraditional = traditionalBalance / 10;
    const annualRoth = rothBalance / 10;
    
    // Simulate heir's tax rate increasing during peak earning years
    const getHeirRateForYear = (year: number): number => {
      const baseRate = heirRateInput / 100;
      // Peak earning years typically 45-55
      const age = heirAgeInput + year;
      if (age >= 45 && age <= 55) {
        return Math.min(0.37, baseRate + 0.05); // Higher rate during peak
      }
      if (age >= 55 && age <= 60) {
        return baseRate + 0.03; // Still elevated
      }
      return baseRate;
    };

    for (let year = 1; year <= 10; year++) {
      const rate = getHeirRateForYear(year);
      const traditionalTax = annualTraditional * rate;
      const rothTax = 0; // Roth is tax-free
      
      results.push({
        year,
        heirAge: heirAgeInput + year,
        traditionalDistribution: annualTraditional,
        traditionalTax,
        traditionalNet: annualTraditional - traditionalTax,
        rothDistribution: annualRoth,
        rothTax,
        rothNet: annualRoth,
        taxSavings: traditionalTax - rothTax,
      });
    }
    
    return results;
  }, [traditionalBalance, rothBalance, heirAgeInput, heirRateInput]);

  // Calculate summary metrics
  const summary = useMemo(() => {
    const totalTraditionalTax = distributions.reduce((sum, d) => sum + d.traditionalTax, 0);
    const totalTraditionalNet = distributions.reduce((sum, d) => sum + d.traditionalNet, 0);
    const totalRothNet = distributions.reduce((sum, d) => sum + d.rothNet, 0);
    const totalSavings = totalRothNet - totalTraditionalNet;
    
    // Tax you pay now for conversion vs heir pays later
    const yourConversionCost = traditionalBalance * yourCurrentTaxRate;
    const heirFutureTax = totalTraditionalTax;
    const taxArbitrage = heirFutureTax - yourConversionCost;
    
    // Effective rate comparison
    const yourEffectiveRate = yourCurrentTaxRate * 100;
    const heirEffectiveRate = (totalTraditionalTax / traditionalBalance) * 100;
    
    return {
      totalTraditionalTax,
      totalTraditionalNet,
      totalRothNet,
      totalSavings,
      yourConversionCost,
      heirFutureTax,
      taxArbitrage,
      yourEffectiveRate,
      heirEffectiveRate,
      savingsPercent: ((totalSavings / traditionalBalance) * 100).toFixed(1),
    };
  }, [distributions, traditionalBalance, yourCurrentTaxRate]);

  // Chart data
  const comparisonData = [
    {
      name: 'Traditional IRA',
      inherited: traditionalBalance,
      taxes: summary.totalTraditionalTax,
      netToHeir: summary.totalTraditionalNet,
    },
    {
      name: 'Roth IRA',
      inherited: rothBalance || traditionalBalance,
      taxes: 0,
      netToHeir: rothBalance || traditionalBalance,
    },
  ];

  // Year-by-year chart data
  const yearlyData = distributions.map(d => ({
    year: `Yr ${d.year}`,
    heirAge: d.heirAge,
    traditional: d.traditionalNet,
    roth: d.rothNet,
    taxSaved: d.taxSavings,
    taxRate: (d.traditionalTax / d.traditionalDistribution * 100).toFixed(0),
  }));

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-blue-500/10 via-background to-purple-500/10 border-blue-500/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-xl">Heir Impact Mode</CardTitle>
              <CardDescription className="text-base">
                See how Roth conversions today prevent tax spikes for your heirs
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Aha Insight */}
      {summary.taxArbitrage > 0 && (
        <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/30">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-3">
              <Lightbulb className="h-6 w-6 text-yellow-500" />
              <h3 className="text-lg font-bold">Tax Arbitrage Opportunity</h3>
            </div>
            <p className="text-xl md:text-2xl font-medium leading-relaxed">
              By converting now at <span className="text-primary font-bold">{summary.yourEffectiveRate.toFixed(0)}%</span>, 
              you save your heirs an estimated{' '}
              <span className="text-green-600 font-bold">{summary.heirEffectiveRate.toFixed(0)}%</span>{' '}
              in future taxes during their peak earning years.
            </p>
            <div className="mt-4 p-4 bg-background/50 rounded-lg">
              <p className="text-lg font-semibold text-primary">
                Total Tax Savings for Heirs: {formatCurrency(summary.totalSavings)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Input Controls */}
        <div className="lg:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Heir Assumptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs">Heir&apos;s Current Age</Label>
                <Input
                  type="number"
                  value={heirAgeInput}
                  onChange={(e) => setHeirAgeInput(parseInt(e.target.value) || 40)}
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Heir&apos;s Marginal Tax Rate</Label>
                  <Badge variant="outline" className="font-mono">
                    {heirRateInput.toFixed(0)}%
                  </Badge>
                </div>
                <Slider
                  value={[heirRateInput]}
                  onValueChange={([v]) => setHeirRateInput(v)}
                  min={10}
                  max={40}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Rate may increase to 37%+ during peak earning years (ages 45-55)
                </p>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      SECURE Act 10-Year Rule
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Non-spouse heirs must fully distribute inherited IRAs within 10 years, 
                      often during their highest-earning years.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Tax Comparison
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-xs text-muted-foreground">If Heir Inherits Traditional IRA</p>
                <p className="text-xl font-bold text-destructive">
                  {formatCurrency(summary.totalTraditionalTax)} in taxes
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Net to heir: {formatCurrency(summary.totalTraditionalNet)}
                </p>
              </div>
              
              <div className="flex items-center justify-center">
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <p className="text-xs text-muted-foreground">If Heir Inherits Roth IRA</p>
                <p className="text-xl font-bold text-green-600">
                  $0 in taxes
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Net to heir: {formatCurrency(summary.totalRothNet)}
                </p>
              </div>

              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 mt-4">
                <p className="text-sm font-semibold text-primary">Your Conversion Cost Today</p>
                <p className="text-lg font-bold">
                  {formatCurrency(summary.yourConversionCost)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  At your {(yourCurrentTaxRate * 100).toFixed(0)}% marginal rate
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Side-by-Side Comparison */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Traditional vs. Roth Inheritance
              </CardTitle>
              <CardDescription>
                What your heir receives after taxes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparisonData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(val) => formatCurrency(val)}
                    />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(val: number) => formatCurrency(val)}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="netToHeir" name="Net to Heir" stackId="a">
                      {comparisonData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={index === 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="taxes" name="Taxes Paid" stackId="a" fill="hsl(var(--destructive))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Year-by-Year Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    10-Year Distribution Impact
                  </CardTitle>
                  <CardDescription>
                    Annual after-tax distributions to heir
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
                >
                  {showDetailedBreakdown ? 'Hide Details' : 'Show Details'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={yearlyData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-48">
                            <p className="font-semibold mb-2">{label} (Heir Age {data.heirAge})</p>
                            <div className="space-y-1 text-sm">
                              <div className="flex justify-between">
                                <span>Traditional Net:</span>
                                <span className="font-mono">{formatCurrency(data.traditional)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Roth Net:</span>
                                <span className="font-mono text-green-600">{formatCurrency(data.roth)}</span>
                              </div>
                              <div className="flex justify-between border-t pt-1 mt-1">
                                <span className="text-green-600">Tax Saved:</span>
                                <span className="font-mono text-green-600">{formatCurrency(data.taxSaved)}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Marginal rate: {data.taxRate}%
                              </p>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend />
                    <Bar dataKey="traditional" name="Traditional IRA (After Tax)" fill="hsl(var(--chart-1))" />
                    <Bar dataKey="roth" name="Roth IRA (Tax-Free)" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              {showDetailedBreakdown && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Year</th>
                        <th className="text-left py-2">Heir Age</th>
                        <th className="text-right py-2">Tax Rate</th>
                        <th className="text-right py-2">Traditional Tax</th>
                        <th className="text-right py-2">Tax Saved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributions.map((d) => (
                        <tr key={d.year} className="border-b border-muted">
                          <td className="py-2">Year {d.year}</td>
                          <td className="py-2">{d.heirAge}</td>
                          <td className="py-2 text-right font-mono">
                            {((d.traditionalTax / d.traditionalDistribution) * 100).toFixed(0)}%
                          </td>
                          <td className="py-2 text-right font-mono text-destructive">
                            {formatCurrency(d.traditionalTax)}
                          </td>
                          <td className="py-2 text-right font-mono text-green-600">
                            {formatCurrency(d.taxSavings)}
                          </td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td className="py-2" colSpan={3}>Total</td>
                        <td className="py-2 text-right font-mono text-destructive">
                          {formatCurrency(summary.totalTraditionalTax)}
                        </td>
                        <td className="py-2 text-right font-mono text-green-600">
                          {formatCurrency(summary.totalSavings)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
