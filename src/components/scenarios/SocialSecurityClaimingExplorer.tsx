/**
 * Social Security Claiming Explorer
 * 
 * Comprehensive tool for optimizing SS claiming strategy with:
 * - Strategy comparison (Earliest, Balanced, Optimal)
 * - Break-even analysis with dynamic summary
 * - State tax integration for after-tax values
 * - Real-time sliders connected to simulation
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Clock,
  Users,
  User,
  TrendingUp,
  Calculator,
  Lightbulb,
  MapPin,
  DollarSign,
  Info,
  ChevronRight,
  Shield,
  Scale,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
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
import { cn } from '@/lib/utils';
import {
  compareHouseholdStrategies,
  calculateCustomStrategy,
  HouseholdSSParams,
  StrategyComparisonResult,
} from '@/lib/socialSecurityOptimizer';
import { SSStrategyComparisonChart } from './SSStrategyComparisonChart';
import { SpousalBenefitOptimizer } from './SpousalBenefitOptimizer';
import { StateTaxComparisonMatrix } from './StateTaxComparisonMatrix';
import { useStateTaxRules, StateTaxRule } from '@/hooks/useStateTaxRules';

interface SocialSecurityClaimingExplorerProps {
  currentAge: number;
  retirementAge: number;
  colaRate: number;
  onSimulationUpdate?: (params: {
    primaryClaimingAge: number;
    spouseClaimingAge: number;
    estimatedAnnualBenefit: number;
  }) => void;
}

export function SocialSecurityClaimingExplorer({
  currentAge,
  retirementAge,
  colaRate,
  onSimulationUpdate,
}: SocialSecurityClaimingExplorerProps) {
  const { rules: stateRules, isLoading: statesLoading } = useStateTaxRules();

  // Local state for SS parameters
  const [params, setParams] = useState<HouseholdSSParams>({
    primaryPIA: 2500,
    primaryCurrentAge: currentAge,
    primaryFRA: 67,
    primaryLifeExpectancy: 90,
    spousePIA: 1800,
    spouseCurrentAge: currentAge - 2,
    spouseFRA: 67,
    spouseLifeExpectancy: 92,
    isMarried: true,
    colaRate,
    filingStatus: 'married_filing_jointly',
  });

  const [primaryClaimingAge, setPrimaryClaimingAge] = useState(67);
  const [spouseClaimingAge, setSpouseClaimingAge] = useState(67);
  const [selectedState, setSelectedState] = useState('CA');

  // Get state tax rule
  const stateTaxRule = useMemo(() => {
    return stateRules.find(r => r.state_code === selectedState);
  }, [stateRules, selectedState]);

  // Update params with state tax rule
  const paramsWithState = useMemo(() => ({
    ...params,
    stateTaxRule,
  }), [params, stateTaxRule]);

  // Calculate strategy comparison
  const comparison = useMemo(() => {
    return compareHouseholdStrategies(paramsWithState);
  }, [paramsWithState]);

  // Calculate custom strategy based on user sliders
  const customStrategy = useMemo(() => {
    return calculateCustomStrategy(
      paramsWithState,
      primaryClaimingAge,
      spouseClaimingAge
    );
  }, [paramsWithState, primaryClaimingAge, spouseClaimingAge]);

  // Notify parent of simulation changes
  const handleClaimingAgeChange = useCallback((primary: number, spouse: number) => {
    setPrimaryClaimingAge(primary);
    setSpouseClaimingAge(spouse);
    
    const strategy = calculateCustomStrategy(
      paramsWithState,
      primary,
      spouse
    );
    
    onSimulationUpdate?.({
      primaryClaimingAge: primary,
      spouseClaimingAge: spouse,
      estimatedAnnualBenefit: strategy.annualBenefitAtClaim,
    });
  }, [paramsWithState, onSimulationUpdate]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value: number) => {
    const change = (value - 1) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Calculate benefit adjustment display
  const getClaimingAgeInfo = (age: number, fra: number) => {
    if (age < fra) {
      const reduction = ((fra - age) * 6.67); // Simplified
      return { label: 'Early', color: 'text-amber-600', percent: -reduction };
    } else if (age > fra) {
      const credit = (age - fra) * 8;
      return { label: 'Delayed', color: 'text-chart-2', percent: credit };
    }
    return { label: 'FRA', color: 'text-primary', percent: 0 };
  };

  const primaryAgeInfo = getClaimingAgeInfo(primaryClaimingAge, params.primaryFRA);
  const spouseAgeInfo = getClaimingAgeInfo(spouseClaimingAge, params.spouseFRA);

  // States that don't tax SS
  const noSSTaxStates = stateRules.filter(r => !r.social_security_taxable);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 via-background to-chart-2/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Social Security Claiming Explorer</CardTitle>
              <CardDescription className="text-base mt-1">
                Optimize your claiming strategy to maximize lifetime benefits
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* "Aha!" Dynamic Summary */}
      <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-teal-500/10 border-green-500/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 mb-4">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            <h3 className="text-lg font-bold text-foreground">Your Claiming Advantage</h3>
          </div>
          <p className="text-lg md:text-xl text-foreground leading-relaxed">
            {comparison.recommendation}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-chart-2">
                {formatCurrency(comparison.optimalAdvantage.vsEarliest)}
              </p>
              <p className="text-xs text-muted-foreground">Optimal vs Early</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-primary">
                Age {comparison.optimal.breakEvenAge}
              </p>
              <p className="text-xs text-muted-foreground">Break-Even Age</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-foreground">
                ${comparison.optimal.monthlyBenefitAtClaim.combined.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">Optimal Monthly</p>
            </div>
            <div className="text-center p-3 bg-background/50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(customStrategy.lifetimeBenefits)}
              </p>
              <p className="text-xs text-muted-foreground">Your Strategy Lifetime</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Input Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Primary Claimant */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Primary Claimant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* PIA Input */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Primary Insurance Amount (PIA)</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">Your monthly benefit at Full Retirement Age. Find this on your SSA statement.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={params.primaryPIA}
                    onChange={(e) => setParams({ ...params, primaryPIA: Number(e.target.value) })}
                    className="pl-7 h-9"
                  />
                </div>
              </div>

              {/* Claiming Age Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Claiming Age</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">{primaryClaimingAge}</span>
                    <Badge variant="outline" className={cn("text-xs", primaryAgeInfo.color)}>
                      {primaryAgeInfo.percent >= 0 ? '+' : ''}{primaryAgeInfo.percent.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Slider
                  value={[primaryClaimingAge]}
                  onValueChange={([value]) => handleClaimingAgeChange(value, spouseClaimingAge)}
                  min={62}
                  max={70}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>62 (Early)</span>
                  <span>67 (FRA)</span>
                  <span>70 (Max)</span>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {[62, 67, 70].map((age) => {
                  const info = getClaimingAgeInfo(age, params.primaryFRA);
                  const isSelected = primaryClaimingAge === age;
                  return (
                    <button
                      key={age}
                      onClick={() => handleClaimingAgeChange(age, spouseClaimingAge)}
                      className={cn(
                        "p-2 rounded-lg border transition-all text-center",
                        isSelected
                          ? "bg-primary/10 border-primary ring-2 ring-primary/20"
                          : "bg-muted/50 border-border hover:border-primary/50"
                      )}
                    >
                      <div className="font-semibold text-sm">{age}</div>
                      <div className={cn("text-xs", info.color)}>{info.label}</div>
                    </button>
                  );
                })}
              </div>

              {/* Life Expectancy */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Life Expectancy</Label>
                  <span className="font-mono text-sm">{params.primaryLifeExpectancy}</span>
                </div>
                <Slider
                  value={[params.primaryLifeExpectancy]}
                  onValueChange={([value]) => setParams({ ...params, primaryLifeExpectancy: value })}
                  min={75}
                  max={100}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Spouse Settings */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-chart-2" />
                  Spouse / Survivor
                </CardTitle>
                <Switch
                  checked={params.isMarried}
                  onCheckedChange={(checked) => setParams({ ...params, isMarried: checked, filingStatus: checked ? 'married_filing_jointly' : 'single' })}
                />
              </div>
            </CardHeader>
            <CardContent className={cn(
              "space-y-4 transition-opacity",
              !params.isMarried && "opacity-50 pointer-events-none"
            )}>
              {/* Spouse PIA */}
              <div className="space-y-1.5">
                <Label className="text-xs">Spouse PIA</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    value={params.spousePIA}
                    onChange={(e) => setParams({ ...params, spousePIA: Number(e.target.value) })}
                    className="pl-7 h-9"
                  />
                </div>
              </div>

              {/* Spouse Claiming Age */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Spouse Claiming Age</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-chart-2">{spouseClaimingAge}</span>
                    <Badge variant="outline" className={cn("text-xs", spouseAgeInfo.color)}>
                      {spouseAgeInfo.percent >= 0 ? '+' : ''}{spouseAgeInfo.percent.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Slider
                  value={[spouseClaimingAge]}
                  onValueChange={([value]) => handleClaimingAgeChange(primaryClaimingAge, value)}
                  min={62}
                  max={70}
                  step={1}
                />
              </div>

              {/* Spouse Life Expectancy */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Spouse Life Expectancy</Label>
                  <span className="font-mono text-sm">{params.spouseLifeExpectancy}</span>
                </div>
                <Slider
                  value={[params.spouseLifeExpectancy]}
                  onValueChange={([value]) => setParams({ ...params, spouseLifeExpectancy: value })}
                  min={75}
                  max={100}
                  step={1}
                />
              </div>

              {/* Survivor Benefit Info */}
              <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/20">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-chart-2 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-chart-2">Survivor Benefit</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Surviving spouse receives the higher of both benefits.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spousal Benefit Optimizer */}
          <SpousalBenefitOptimizer
            params={paramsWithState}
            onApplyStrategy={(primary, spouse) => handleClaimingAgeChange(primary, spouse)}
          />

          {/* State Tax Integration */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                State Tax Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">State of Residence</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stateRules.map((rule) => (
                      <SelectItem key={rule.state_code} value={rule.state_code}>
                        {rule.state_name} {!rule.social_security_taxable && '✓'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {stateTaxRule && (
                <div className={cn(
                  "p-3 rounded-lg border",
                  stateTaxRule.social_security_taxable
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-green-500/10 border-green-500/30"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className={cn(
                      "h-4 w-4",
                      stateTaxRule.social_security_taxable ? "text-amber-600" : "text-green-600"
                    )} />
                    <span className={cn(
                      "text-sm font-medium",
                      stateTaxRule.social_security_taxable ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"
                    )}>
                      {stateTaxRule.social_security_taxable ? 'SS is Taxable' : 'SS is Tax-Free'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stateTaxRule.social_security_taxable
                      ? `${stateTaxRule.state_name} taxes SS benefits${stateTaxRule.ss_exemption_threshold_joint ? ` above $${(stateTaxRule.ss_exemption_threshold_joint / 1000).toFixed(0)}K` : ''}.`
                      : `${stateTaxRule.state_name} does not tax Social Security benefits.`
                    }
                  </p>
                </div>
              )}

              {/* After-tax comparison */}
              <div className="space-y-2">
                <Label className="text-xs">After-Tax Annual Benefit</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-muted/50 text-center">
                    <p className="text-lg font-bold font-mono text-foreground">
                      {formatCurrency(customStrategy.afterTaxLifetimeBenefits / (params.primaryLifeExpectancy - primaryClaimingAge + 1))}
                    </p>
                    <p className="text-xs text-muted-foreground">In {stateTaxRule?.state_name}</p>
                  </div>
                  <div className="p-2 rounded bg-muted/50 text-center">
                    <p className="text-lg font-bold font-mono text-chart-2">
                      {formatCurrency(customStrategy.annualBenefitAtClaim)}
                    </p>
                    <p className="text-xs text-muted-foreground">Pre-Tax</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="lg:col-span-8 space-y-6">
          {/* Strategy Comparison Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Strategy Comparison
              </CardTitle>
              <CardDescription>
                Cumulative lifetime benefits for each claiming strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SSStrategyComparisonChart
                earliest={comparison.earliest}
                balanced={comparison.balanced}
                optimal={comparison.optimal}
                customStrategy={customStrategy}
                currentAge={params.primaryCurrentAge}
              />
            </CardContent>
          </Card>

          {/* Strategy Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Earliest Strategy */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                primaryClaimingAge === 62 && spouseClaimingAge === 62 && "ring-2 ring-primary"
              )}
              onClick={() => handleClaimingAgeChange(62, params.isMarried ? 62 : 62)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <h4 className="font-semibold">Earliest</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {comparison.earliest.description}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Lifetime:</span>
                    <span className="font-mono text-sm">{formatCurrency(comparison.earliest.lifetimeBenefits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Monthly:</span>
                    <span className="font-mono text-sm">${comparison.earliest.monthlyBenefitAtClaim.combined.toFixed(0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Balanced Strategy */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md border-chart-3/30",
                primaryClaimingAge === 67 && spouseClaimingAge === 67 && "ring-2 ring-chart-3"
              )}
              onClick={() => handleClaimingAgeChange(67, params.isMarried ? 67 : 67)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="h-5 w-5 text-chart-3" />
                  <h4 className="font-semibold text-chart-3">Balanced</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {comparison.balanced.description}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Lifetime:</span>
                    <span className="font-mono text-sm text-chart-3">{formatCurrency(comparison.balanced.lifetimeBenefits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Break-even:</span>
                    <span className="font-mono text-sm">Age {comparison.balanced.breakEvenAge}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimal Strategy */}
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md bg-chart-2/5 border-chart-2/30",
                ((primaryClaimingAge === 70 || spouseClaimingAge === 70) && 
                 (primaryClaimingAge === 62 || spouseClaimingAge === 62)) && "ring-2 ring-chart-2"
              )}
              onClick={() => {
                const primaryHigher = params.primaryPIA >= params.spousePIA;
                handleClaimingAgeChange(
                  primaryHigher ? 70 : 62,
                  params.isMarried ? (primaryHigher ? 62 : 70) : 70
                );
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                  <h4 className="font-semibold text-chart-2">Optimal</h4>
                  <Badge variant="outline" className="text-chart-2 border-chart-2/50 text-xs ml-auto">
                    Best
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {comparison.optimal.description}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Lifetime:</span>
                    <span className="font-mono text-sm text-chart-2">{formatCurrency(comparison.optimal.lifetimeBenefits)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Advantage:</span>
                    <span className="font-mono text-sm text-green-600">+{formatCurrency(comparison.optimalAdvantage.vsEarliest)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Your Custom Strategy Summary */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Your Current Strategy</h4>
                </div>
                <Badge className="bg-primary/20 text-primary border-0">
                  Age {primaryClaimingAge} / {params.isMarried ? `Age ${spouseClaimingAge}` : 'Single'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Benefit</p>
                  <p className="text-xl font-bold font-mono text-primary">
                    ${customStrategy.monthlyBenefitAtClaim.combined.toFixed(0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Annual Benefit</p>
                  <p className="text-xl font-bold font-mono">
                    {formatCurrency(customStrategy.annualBenefitAtClaim)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lifetime Benefits</p>
                  <p className="text-xl font-bold font-mono">
                    {formatCurrency(customStrategy.lifetimeBenefits)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">vs Optimal</p>
                  <p className={cn(
                    "text-xl font-bold font-mono",
                    customStrategy.lifetimeBenefits >= comparison.optimal.lifetimeBenefits
                      ? "text-green-600"
                      : "text-amber-600"
                  )}>
                    {customStrategy.lifetimeBenefits >= comparison.optimal.lifetimeBenefits
                      ? '+' : '-'}
                    {formatCurrency(Math.abs(customStrategy.lifetimeBenefits - comparison.optimal.lifetimeBenefits))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* State Tax Comparison Matrix */}
          <StateTaxComparisonMatrix
            annualSSBenefit={customStrategy.annualBenefitAtClaim}
            currentStateCode={selectedState}
            colaRate={params.colaRate}
          />
        </div>
      </div>
    </div>
  );
}
