/**
 * Roth Conversion Strategy Explorer
 * 
 * Comprehensive visualization and planning tool for Roth conversion strategies
 */

import { useState, useMemo, useEffect } from 'react';
import { 
  ArrowRightLeft, 
  TrendingUp, 
  Calculator,
  Lightbulb,
  DollarSign,
  Calendar,
  PiggyBank,
  Users,
  Info,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useRothConversion, RothConversionInputs } from '@/hooks/useRothConversion';
import { RothConversionChart } from './RothConversionChart';
import { RothLifetimeTaxChart } from './RothLifetimeTaxChart';
import { RMDImpactChart } from './RMDImpactChart';
import { IRMAAWarningModal, useIRMAAAlert } from './IRMAAWarningModal';
import { cn } from '@/lib/utils';
import { checkIRMAABracketChange, getNextIRMAAThreshold } from '@/lib/medicareCalculator';

const TAX_BRACKETS = [
  { value: 0.10, label: '10%' },
  { value: 0.12, label: '12%' },
  { value: 0.22, label: '22%' },
  { value: 0.24, label: '24%' },
  { value: 0.32, label: '32%' },
  { value: 0.35, label: '35%' },
];

export function RothConversionExplorer() {
  const {
    inputs,
    updateInput,
    reset,
    strategy,
    stateOptions,
  } = useRothConversion();
  
  // IRMAA alert state
  const [showIRMAAWarning, setShowIRMAAWarning] = useState(false);
  const isMarried = inputs.filingStatus === 'married_filing_jointly';
  
  // Calculate base MAGI for IRMAA checking (SS income + other income during retirement)
  const baseMAGI = useMemo(() => {
    return inputs.socialSecurityIncome * 0.85 + (inputs.annualIncome * 0.3); // Simplified estimate
  }, [inputs.socialSecurityIncome, inputs.annualIncome]);
  
  // Check if first year conversion would trigger IRMAA change
  const firstYearConversion = strategy?.years[0]?.conversionAmount || 0;
  const irmaaCheck = useMemo(() => {
    if (firstYearConversion > 0) {
      return checkIRMAABracketChange(baseMAGI, firstYearConversion, isMarried);
    }
    return null;
  }, [baseMAGI, firstYearConversion, isMarried]);
  
  // IRMAA headroom
  const irmaaHeadroom = useMemo(() => {
    return getNextIRMAAThreshold(baseMAGI, isMarried);
  }, [baseMAGI, isMarried]);
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };
  
  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ArrowRightLeft className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Roth Conversion Strategy Explorer</CardTitle>
                <CardDescription className="text-base mt-1">
                  Optimize your tax-free retirement wealth with strategic conversions
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={reset}>
              Reset Defaults
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* IRMAA Warning Alert */}
      {irmaaCheck && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  IRMAA Bracket Alert
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Your first year conversion of <strong>{formatCurrency(firstYearConversion)}</strong> will 
                  push you from <Badge variant="outline" className="mx-1">{irmaaCheck.previousBracket.label}</Badge> 
                  to <Badge variant="destructive" className="mx-1">{irmaaCheck.newBracket.label}</Badge>, 
                  increasing annual Medicare premiums by <strong className="text-red-600">{formatCurrency(irmaaCheck.annualPremiumIncrease)}</strong>.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setShowIRMAAWarning(true)}
                >
                  View Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* IRMAA Warning Modal */}
      <IRMAAWarningModal
        open={showIRMAAWarning}
        onOpenChange={setShowIRMAAWarning}
        bracketChange={irmaaCheck}
        currentMAGI={baseMAGI}
        proposedAmount={firstYearConversion}
        transactionType="roth_conversion"
        isMarried={isMarried}
        onProceed={() => setShowIRMAAWarning(false)}
        onCancel={() => setShowIRMAAWarning(false)}
      />

      {/* "Aha!" Metric Summary */}
      {strategy && strategy.years.length > 0 && (
        <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/30">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="h-6 w-6 text-yellow-500" />
              <h3 className="text-lg font-bold text-foreground">Your Conversion Advantage</h3>
            </div>
            <p className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
              By following this strategy, you increase your{' '}
              <span className="text-green-600 font-bold">
                spendable wealth by {formatCurrency(strategy.spendableWealthIncrease)}
              </span>{' '}
              and reduce your heirs' future tax burden by{' '}
              <span className="text-emerald-600 font-bold">
                {strategy.heirsTaxReductionPercent.toFixed(0)}%
              </span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(strategy.totalConverted)}
                </p>
                <p className="text-xs text-muted-foreground">Total Converted</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(strategy.totalTaxPaid)}
                </p>
                <p className="text-xs text-muted-foreground">Taxes Paid Now</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(strategy.lifetimeTaxSavings)}
                </p>
                <p className="text-xs text-muted-foreground">Lifetime Tax Savings</p>
              </div>
              <div className="text-center p-3 bg-background/50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {formatPercent(strategy.averageEffectiveRate)}
                </p>
                <p className="text-xs text-muted-foreground">Avg Effective Rate</p>
              </div>
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
                <Calculator className="h-4 w-4" />
                Strategy Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Ages */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Current Age</Label>
                  <Input
                    type="number"
                    value={inputs.currentAge}
                    onChange={(e) => updateInput('currentAge', parseInt(e.target.value) || 55)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Retirement Age</Label>
                  <Input
                    type="number"
                    value={inputs.retirementAge}
                    onChange={(e) => updateInput('retirementAge', parseInt(e.target.value) || 60)}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1">
                    RMD Start Age
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs max-w-48">
                            SECURE 2.0 sets RMD start at 73 for those born 1951-1959
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Input
                    type="number"
                    value={inputs.rmdStartAge}
                    onChange={(e) => updateInput('rmdStartAge', parseInt(e.target.value) || 73)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Life Expectancy</Label>
                  <Input
                    type="number"
                    value={inputs.lifeExpectancy}
                    onChange={(e) => updateInput('lifeExpectancy', parseInt(e.target.value) || 95)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* Income */}
              <div className="space-y-1.5">
                <Label className="text-xs">Annual Income (Pre-Retirement)</Label>
                <Input
                  type="number"
                  value={inputs.annualIncome}
                  onChange={(e) => updateInput('annualIncome', parseInt(e.target.value) || 0)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Social Security (Annual)</Label>
                <Input
                  type="number"
                  value={inputs.socialSecurityIncome}
                  onChange={(e) => updateInput('socialSecurityIncome', parseInt(e.target.value) || 0)}
                  className="h-9"
                />
              </div>

              {/* Filing Status */}
              <div className="space-y-1.5">
                <Label className="text-xs">Filing Status</Label>
                <Select
                  value={inputs.filingStatus}
                  onValueChange={(v) => updateInput('filingStatus', v as any)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married_filing_jointly">Married Filing Jointly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* State */}
              <div className="space-y-1.5">
                <Label className="text-xs">State of Residence</Label>
                <Select
                  value={inputs.stateCode}
                  onValueChange={(v) => updateInput('stateCode', v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stateOptions.map((s) => (
                      <SelectItem key={s.code} value={s.code}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Bracket */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Target Tax Bracket</Label>
                  <Badge variant="outline" className="font-mono">
                    {(inputs.targetBracket * 100).toFixed(0)}%
                  </Badge>
                </div>
                <Select
                  value={inputs.targetBracket.toString()}
                  onValueChange={(v) => updateInput('targetBracket', parseFloat(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_BRACKETS.map((b) => (
                      <SelectItem key={b.value} value={b.value.toString()}>
                        Fill up to {b.label} bracket
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Max Annual Conversion */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs">Max Annual Conversion</Label>
                  <span className="text-xs text-muted-foreground font-mono">
                    {formatCurrency(inputs.maxAnnualConversion)}
                  </span>
                </div>
                <Slider
                  value={[inputs.maxAnnualConversion]}
                  onValueChange={([v]) => updateInput('maxAnnualConversion', v)}
                  min={10000}
                  max={500000}
                  step={5000}
                />
              </div>
            </CardContent>
          </Card>

          {/* 5-Year Rule Info */}
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="py-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    5-Year Rule Reminder
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Converted amounts must wait 5 years before penalty-free withdrawal 
                    (applies to the conversion, not earnings). Plan conversions to align 
                    with your retirement income needs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Annual Conversion Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Annual Conversion Strategy
              </CardTitle>
              <CardDescription>
                Optimal conversion amounts by year, prioritizing highest-return accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strategy && strategy.years.length > 0 ? (
                <RothConversionChart years={strategy.years} />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>No conversion opportunities found with current parameters</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lifetime Tax Comparison */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Lifetime Tax Comparison
              </CardTitle>
              <CardDescription>
                Side-by-side: taxes with conversions vs. baseline (no conversions)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strategy ? (
                <RothLifetimeTaxChart 
                  lifetimeTaxWithConversions={strategy.lifetimeTaxWithConversions}
                  lifetimeTaxBaseline={strategy.lifetimeTaxBaseline}
                  conversionTaxPaid={strategy.totalTaxPaid}
                />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>Adjust parameters to see comparison</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RMD Impact Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                RMD Reduction Impact
              </CardTitle>
              <CardDescription>
                How conversions reduce your future Required Minimum Distributions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {strategy && strategy.years.length > 0 ? (
                <RMDImpactChart years={strategy.years} />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <p>No RMD data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
