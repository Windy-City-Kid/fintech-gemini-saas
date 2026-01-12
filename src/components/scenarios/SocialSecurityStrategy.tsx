import { useState, useMemo } from 'react';
import { Shield, Users, User, TrendingUp, Info, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  calculateBenefitAdjustment,
  calculateMonthlyBenefit,
  getLifetimeBenefitComparison,
  calculateClaimingScenarios,
} from '@/lib/socialSecurityCalculator';
import { LifetimeBenefitsChart } from './LifetimeBenefitsChart';

export interface SocialSecuritySettings {
  primaryPIA: number;
  primaryClaimingAge: number;
  primaryFRA: number;
  spousePIA: number;
  spouseClaimingAge: number;
  spouseFRA: number;
  isMarried: boolean;
  spouseCurrentAge: number | null;
  primaryLifeExpectancy: number;
  spouseLifeExpectancy: number;
}

interface SocialSecurityStrategyProps {
  currentAge: number;
  settings: SocialSecuritySettings;
  onSettingsChange: (settings: SocialSecuritySettings) => void;
  colaRate: number; // From rate assumptions (CPI-W)
}

export function SocialSecurityStrategy({ 
  currentAge, 
  settings, 
  onSettingsChange,
  colaRate,
}: SocialSecurityStrategyProps) {
  // Calculate adjustment factors and benefits
  const primaryAdjustment = useMemo(() => 
    calculateBenefitAdjustment(settings.primaryClaimingAge, settings.primaryFRA),
    [settings.primaryClaimingAge, settings.primaryFRA]
  );
  
  const primaryMonthlyBenefit = useMemo(() =>
    calculateMonthlyBenefit(settings.primaryPIA, settings.primaryClaimingAge, settings.primaryFRA),
    [settings.primaryPIA, settings.primaryClaimingAge, settings.primaryFRA]
  );
  
  const spouseMonthlyBenefit = useMemo(() =>
    settings.isMarried 
      ? calculateMonthlyBenefit(settings.spousePIA, settings.spouseClaimingAge, settings.spouseFRA)
      : 0,
    [settings.isMarried, settings.spousePIA, settings.spouseClaimingAge, settings.spouseFRA]
  );
  
  // Lifetime benefits comparison
  const lifetimeComparison = useMemo(() =>
    getLifetimeBenefitComparison(
      settings.primaryPIA,
      settings.primaryFRA,
      currentAge,
      settings.primaryLifeExpectancy,
      colaRate
    ),
    [settings.primaryPIA, settings.primaryFRA, currentAge, settings.primaryLifeExpectancy, colaRate]
  );
  
  // Claiming scenarios for chart
  const claimingScenarios = useMemo(() =>
    calculateClaimingScenarios(
      settings.primaryPIA,
      settings.primaryFRA,
      currentAge,
      settings.primaryLifeExpectancy,
      colaRate
    ),
    [settings.primaryPIA, settings.primaryFRA, currentAge, settings.primaryLifeExpectancy, colaRate]
  );

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

  const getAdjustmentColor = (adjustment: number) => {
    if (adjustment >= 1.24) return 'text-chart-2'; // Delayed to 70
    if (adjustment >= 1) return 'text-primary';
    if (adjustment >= 0.8) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Primary Monthly Benefit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-primary">
              ${primaryMonthlyBenefit.toFixed(0)}
            </div>
            <div className={`text-sm ${getAdjustmentColor(primaryAdjustment)}`}>
              {formatPercent(primaryAdjustment)} from PIA (age {settings.primaryClaimingAge})
            </div>
          </CardContent>
        </Card>

        {settings.isMarried && (
          <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Spouse Monthly Benefit
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-mono text-chart-2">
                ${spouseMonthlyBenefit.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">
                Age {settings.spouseClaimingAge} claiming
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Combined Annual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-chart-4">
              {formatCurrency((primaryMonthlyBenefit + spouseMonthlyBenefit) * 12)}
            </div>
            <div className="text-sm text-muted-foreground">
              {settings.isMarried ? 'Household total' : 'Annual benefit'}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Primary Claimant
            </CardTitle>
            <CardDescription>
              Configure your Social Security claiming strategy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* PIA Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Primary Insurance Amount (PIA)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Your monthly benefit at Full Retirement Age. Find this on your SSA statement at ssa.gov.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={settings.primaryPIA}
                  onChange={(e) => onSettingsChange({ ...settings, primaryPIA: Number(e.target.value) })}
                  className="pl-7"
                />
              </div>
            </div>

            {/* Claiming Age Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Claiming Age</Label>
                <span className="text-2xl font-bold text-primary">{settings.primaryClaimingAge}</span>
              </div>
              <Slider
                value={[settings.primaryClaimingAge]}
                onValueChange={([value]) => onSettingsChange({ ...settings, primaryClaimingAge: value })}
                min={62}
                max={70}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>62 (Early)</span>
                <span>67 (FRA)</span>
                <span>70 (Max)</span>
              </div>
              
              {/* Age markers with benefit adjustments */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[62, 67, 70].map((age) => {
                  const adj = calculateBenefitAdjustment(age, settings.primaryFRA);
                  const isSelected = settings.primaryClaimingAge === age;
                  return (
                    <button
                      key={age}
                      onClick={() => onSettingsChange({ ...settings, primaryClaimingAge: age })}
                      className={`p-2 rounded-lg border transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'bg-muted/50 border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-semibold">Age {age}</div>
                      <div className={`text-xs ${getAdjustmentColor(adj)}`}>
                        {formatPercent(adj)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Life Expectancy */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Life Expectancy</Label>
                <span className="font-mono">{settings.primaryLifeExpectancy}</span>
              </div>
              <Slider
                value={[settings.primaryLifeExpectancy]}
                onValueChange={([value]) => onSettingsChange({ ...settings, primaryLifeExpectancy: value })}
                min={75}
                max={100}
                step={1}
              />
            </div>
          </CardContent>
        </Card>

        {/* Spouse Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-chart-2" />
                Spouse / Survivor Benefits
              </CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="married" className="text-sm text-muted-foreground">Married</Label>
                <Switch
                  id="married"
                  checked={settings.isMarried}
                  onCheckedChange={(checked) => onSettingsChange({ ...settings, isMarried: checked })}
                />
              </div>
            </div>
            <CardDescription>
              {settings.isMarried 
                ? 'Survivor gets higher of both benefits if one spouse dies'
                : 'Enable to model survivor benefit strategy'}
            </CardDescription>
          </CardHeader>
          <CardContent className={settings.isMarried ? 'space-y-6' : 'opacity-50 pointer-events-none space-y-6'}>
            {/* Spouse PIA */}
            <div className="space-y-2">
              <Label>Spouse PIA</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={settings.spousePIA}
                  onChange={(e) => onSettingsChange({ ...settings, spousePIA: Number(e.target.value) })}
                  className="pl-7"
                  disabled={!settings.isMarried}
                />
              </div>
            </div>

            {/* Spouse Current Age */}
            <div className="space-y-2">
              <Label>Spouse Current Age</Label>
              <Input
                type="number"
                value={settings.spouseCurrentAge || ''}
                onChange={(e) => onSettingsChange({ ...settings, spouseCurrentAge: Number(e.target.value) || null })}
                disabled={!settings.isMarried}
              />
            </div>

            {/* Spouse Claiming Age */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Spouse Claiming Age</Label>
                <span className="text-xl font-bold text-chart-2">{settings.spouseClaimingAge}</span>
              </div>
              <Slider
                value={[settings.spouseClaimingAge]}
                onValueChange={([value]) => onSettingsChange({ ...settings, spouseClaimingAge: value })}
                min={62}
                max={70}
                step={1}
                disabled={!settings.isMarried}
              />
            </div>

            {/* Survivor Benefit Info */}
            {settings.isMarried && (
              <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-chart-2 mt-0.5" />
                  <div>
                    <p className="font-medium text-chart-2">Survivor Benefit Active</p>
                    <p className="text-sm text-muted-foreground">
                      If one spouse passes, the survivor receives the higher of the two benefits.
                      The simulation automatically applies this logic.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lifetime Benefits Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Lifetime Benefits Analysis
          </CardTitle>
          <CardDescription>
            Compare cumulative benefits at claiming ages 62, 67, and 70 (assumes {settings.primaryLifeExpectancy} life expectancy, {(colaRate * 100).toFixed(2)}% COLA)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LifetimeBenefitsChart 
            scenarios={claimingScenarios}
            currentClaimingAge={settings.primaryClaimingAge}
            lifeExpectancy={settings.primaryLifeExpectancy}
          />
        </CardContent>
      </Card>
    </div>
  );
}
