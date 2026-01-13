import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MapPin, TrendingUp, DollarSign, Calculator, ArrowRight, Sparkles, Home, AlertTriangle, Scale } from 'lucide-react';
import { useStateTaxRules, StateTaxRule } from '@/hooks/useStateTaxRules';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RelocationExplorerProps {
  currentState: string;
  currentAge: number;
  retirementAge: number;
  monthlySpending: number;
  portfolioValue: number;
  ssIncome: number;
  homeEquity: number;
  homeValue: number;
  onSelectDestination?: (stateCode: string) => void;
}

interface SimulationComparison {
  currentLifetimeIncomeTax: number;
  currentLifetimePropertyTax: number;
  newLifetimeIncomeTax: number;
  newLifetimePropertyTax: number;
  currentEstateAt100: number;
  newEstateAt100: number;
  lifetimeSpendingIncrease: number;
  legacyIncreasePercent: number;
  annualIncomeTaxSavings: number;
  annualPropertyTaxChange: number;
  netAnnualSavings: number;
}

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

const friendlinessColors = {
  excellent: 'bg-green-500',
  good: 'bg-emerald-400',
  neutral: 'bg-amber-400',
  poor: 'bg-red-400',
};

export function RelocationExplorer({
  currentState,
  currentAge,
  retirementAge,
  monthlySpending,
  portfolioValue,
  ssIncome,
  homeEquity,
  homeValue,
  onSelectDestination,
}: RelocationExplorerProps) {
  const { rules, getRule, isLoading } = useStateTaxRules();
  const [destinationState, setDestinationState] = useState<string>('');

  const currentRule = getRule(currentState);
  const destinationRule = destinationState ? getRule(destinationState) : null;

  // Run comparison simulation with income tax AND property tax
  const comparison = useMemo<SimulationComparison | null>(() => {
    if (!currentRule || !destinationRule) return null;

    const yearsToSimulate = 100 - currentAge;
    const retirementYears = 100 - retirementAge;
    const annualSpending = monthlySpending * 12;

    // Property tax rates
    const currentPropertyTaxRate = currentRule.property_tax_rate / 100;
    const newPropertyTaxRate = destinationRule.property_tax_rate / 100;

    // Calculate annual taxes at current spending level for first year (for trade-off insight)
    let firstYearCurrentIncomeTax = 0;
    let firstYearNewIncomeTax = 0;
    const firstYearCurrentPropertyTax = homeValue * currentPropertyTaxRate;
    const firstYearNewPropertyTax = homeValue * newPropertyTaxRate;

    // Calculate lifetime taxes
    let currentLifetimeIncomeTax = 0;
    let newLifetimeIncomeTax = 0;
    let currentLifetimePropertyTax = 0;
    let newLifetimePropertyTax = 0;
    
    for (let year = 0; year < retirementYears; year++) {
      const age = retirementAge + year;
      const inflatedSpending = annualSpending * Math.pow(1.025, year);
      const projectedHomeValue = homeValue * Math.pow(1.03, year);
      
      // Estimate taxable income
      let taxableIncome = inflatedSpending;
      
      // Current state income tax
      if (currentRule.rate_type !== 'none') {
        let adjustedIncome = taxableIncome;
        if (!currentRule.social_security_taxable) {
          adjustedIncome -= ssIncome * 0.85;
        }
        if (age >= 60 && currentRule.retirement_exclusion_amount > 0) {
          adjustedIncome = Math.max(0, adjustedIncome - currentRule.retirement_exclusion_amount);
        }
        const incomeTax = Math.max(0, adjustedIncome) * (currentRule.top_marginal_rate / 100);
        currentLifetimeIncomeTax += incomeTax;
        if (year === 0) firstYearCurrentIncomeTax = incomeTax;
      }

      // New state income tax
      if (destinationRule.rate_type !== 'none') {
        let adjustedIncome = taxableIncome;
        if (!destinationRule.social_security_taxable) {
          adjustedIncome -= ssIncome * 0.85;
        }
        if (age >= 60 && destinationRule.retirement_exclusion_amount > 0) {
          adjustedIncome = Math.max(0, adjustedIncome - destinationRule.retirement_exclusion_amount);
        }
        const incomeTax = Math.max(0, adjustedIncome) * (destinationRule.top_marginal_rate / 100);
        newLifetimeIncomeTax += incomeTax;
        if (year === 0) firstYearNewIncomeTax = incomeTax;
      }

      // Property taxes (applied to appreciated home value)
      currentLifetimePropertyTax += projectedHomeValue * currentPropertyTaxRate;
      newLifetimePropertyTax += projectedHomeValue * newPropertyTaxRate;
    }

    // Calculate COL-adjusted spending impact
    const colDifference = destinationRule.col_multiplier - currentRule.col_multiplier;
    const annualCOLSavings = annualSpending * -colDifference * 0.6; // 60% discretionary
    const lifetimeCOLSavings = annualCOLSavings * retirementYears;

    // Total savings calculation
    const totalTaxCurrent = currentLifetimeIncomeTax + currentLifetimePropertyTax;
    const totalTaxNew = newLifetimeIncomeTax + newLifetimePropertyTax;
    const taxSavings = totalTaxCurrent - totalTaxNew;
    const totalSavings = taxSavings + lifetimeCOLSavings;
    
    const currentEstateAt100 = portfolioValue * Math.pow(1.05, yearsToSimulate) * 0.4 + homeEquity * Math.pow(1.03, yearsToSimulate);
    const newEstateAt100 = currentEstateAt100 + totalSavings * Math.pow(1.05, retirementYears / 2);

    const legacyIncreasePercent = ((newEstateAt100 - currentEstateAt100) / currentEstateAt100) * 100;

    // Annual trade-off metrics
    const annualIncomeTaxSavings = firstYearCurrentIncomeTax - firstYearNewIncomeTax;
    const annualPropertyTaxChange = firstYearNewPropertyTax - firstYearCurrentPropertyTax;
    const netAnnualSavings = annualIncomeTaxSavings - annualPropertyTaxChange;

    return {
      currentLifetimeIncomeTax,
      currentLifetimePropertyTax,
      newLifetimeIncomeTax,
      newLifetimePropertyTax,
      currentEstateAt100,
      newEstateAt100,
      lifetimeSpendingIncrease: totalSavings,
      legacyIncreasePercent,
      annualIncomeTaxSavings,
      annualPropertyTaxChange,
      netAnnualSavings,
    };
  }, [currentRule, destinationRule, currentAge, retirementAge, monthlySpending, portfolioValue, ssIncome, homeEquity, homeValue]);

  // Stacked bar chart data for total tax burden
  const chartData = useMemo(() => {
    if (!comparison || !currentRule || !destinationRule) return [];
    
    return [
      {
        name: currentRule.state_name,
        'Income Tax': comparison.currentLifetimeIncomeTax,
        'Property Tax': comparison.currentLifetimePropertyTax,
        total: comparison.currentLifetimeIncomeTax + comparison.currentLifetimePropertyTax,
      },
      {
        name: destinationRule.state_name,
        'Income Tax': comparison.newLifetimeIncomeTax,
        'Property Tax': comparison.newLifetimePropertyTax,
        total: comparison.newLifetimeIncomeTax + comparison.newLifetimePropertyTax,
      },
    ];
  }, [comparison, currentRule, destinationRule]);

  const estateChartData = useMemo(() => {
    if (!comparison || !currentRule || !destinationRule) return [];
    
    return [
      { name: currentRule.state_name, value: comparison.currentEstateAt100 },
      { name: destinationRule.state_name, value: comparison.newEstateAt100 },
    ];
  }, [comparison, currentRule, destinationRule]);

  const handleDestinationChange = (value: string) => {
    setDestinationState(value);
    onSelectDestination?.(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle>Total Tax Relocation Explorer</CardTitle>
            <CardDescription>
              Compare income tax, property tax, and cost-of-living impact by state
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* State Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current State</label>
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{currentRule?.state_name || currentState}</span>
              {currentRule && (
                <Badge className={`${friendlinessColors[currentRule.retirement_friendliness]} text-white ml-auto`}>
                  {currentRule.retirement_friendliness}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Destination State</label>
            <Select value={destinationState} onValueChange={handleDestinationChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination..." />
              </SelectTrigger>
              <SelectContent>
                {rules.filter(r => r.state_code !== currentState).map((rule) => (
                  <SelectItem key={rule.state_code} value={rule.state_code}>
                    <div className="flex items-center gap-2">
                      <span>{rule.state_name}</span>
                      <Badge variant="outline" className="text-xs">
                        {rule.rate_type === 'none' ? 'No Inc Tax' : `${rule.top_marginal_rate}%`}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Prop: {rule.property_tax_rate}%
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Destination State Details */}
        {destinationRule && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Income Tax</p>
                <p className="text-lg font-bold">
                  {destinationRule.rate_type === 'none' ? 'None' : `${destinationRule.top_marginal_rate}%`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Property Tax</p>
                <p className="text-lg font-bold">{destinationRule.property_tax_rate}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">SS Taxed</p>
                <p className={`text-lg font-bold ${destinationRule.social_security_taxable ? 'text-red-500' : 'text-green-500'}`}>
                  {destinationRule.social_security_taxable ? 'Yes' : 'No'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">COL vs National</p>
                <p className={`text-lg font-bold ${destinationRule.col_multiplier < 1 ? 'text-green-500' : 'text-amber-500'}`}>
                  {((destinationRule.col_multiplier - 1) * 100).toFixed(0)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Rating</p>
                <Badge className={`${friendlinessColors[destinationRule.retirement_friendliness]} text-white`}>
                  {destinationRule.retirement_friendliness}
                </Badge>
              </div>
            </div>

            {/* Trade-off Alert */}
            {comparison && (comparison.annualIncomeTaxSavings > 0 && comparison.annualPropertyTaxChange > 0) && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                <Scale className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">Tax Trade-off Analysis</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  Moving to {destinationRule.state_name} saves you{' '}
                  <span className="font-bold text-green-600">{formatCurrency(comparison.annualIncomeTaxSavings)}</span> in Income Tax, 
                  but increases your Property Tax by{' '}
                  <span className="font-bold text-red-600">{formatCurrency(comparison.annualPropertyTaxChange)}</span>. 
                  Your <span className="font-bold">net annual {comparison.netAnnualSavings >= 0 ? 'savings' : 'cost'}</span> is{' '}
                  <span className={`font-bold ${comparison.netAnnualSavings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(comparison.netAnnualSavings))}
                  </span>.
                </AlertDescription>
              </Alert>
            )}

            {/* Warning for higher overall tax */}
            {comparison && (comparison.newLifetimeIncomeTax + comparison.newLifetimePropertyTax > comparison.currentLifetimeIncomeTax + comparison.currentLifetimePropertyTax) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Higher Total Tax Burden</AlertTitle>
                <AlertDescription>
                  Moving to {destinationRule.state_name} would increase your total tax burden by{' '}
                  <span className="font-bold">
                    {formatCurrency(
                      (comparison.newLifetimeIncomeTax + comparison.newLifetimePropertyTax) - 
                      (comparison.currentLifetimeIncomeTax + comparison.currentLifetimePropertyTax)
                    )}
                  </span>{' '}
                  over your lifetime.
                </AlertDescription>
              </Alert>
            )}

            <Separator />

            {/* Stacked Bar Chart - Total Tax Burden */}
            {comparison && (
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Lifetime Total Tax Burden (Income + Property)
                </h4>
                
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Legend />
                      <Bar 
                        dataKey="Income Tax" 
                        stackId="taxes" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 0, 0, 0]} 
                      />
                      <Bar 
                        dataKey="Property Tax" 
                        stackId="taxes" 
                        fill="hsl(var(--chart-2))" 
                        radius={[0, 4, 4, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Estate at 100 comparison */}
                <h4 className="font-semibold flex items-center gap-2 mt-6">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Estate Value at Age 100
                </h4>
                
                <div className="h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={estateChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={4} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <Separator />

                {/* Break-Even Metric */}
                <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-full bg-green-500/20">
                        <Sparkles className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-2">Relocation Impact Summary</h4>
                        <p className="text-muted-foreground">
                          By moving to <span className="font-bold text-foreground">{destinationRule.state_name}</span>, 
                          you will {comparison.lifetimeSpendingIncrease >= 0 ? 'increase' : 'decrease'} your lifetime spending power by{' '}
                          <span className={`font-bold ${comparison.lifetimeSpendingIncrease >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Math.abs(comparison.lifetimeSpendingIncrease))}
                          </span>{' '}
                          and your legacy by{' '}
                          <span className={`font-bold ${comparison.legacyIncreasePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(comparison.legacyIncreasePercent)}
                          </span>.
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Income Tax Δ</p>
                            <p className={`text-lg font-bold ${comparison.currentLifetimeIncomeTax - comparison.newLifetimeIncomeTax >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(comparison.currentLifetimeIncomeTax - comparison.newLifetimeIncomeTax)}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Property Tax Δ</p>
                            <p className={`text-lg font-bold ${comparison.currentLifetimePropertyTax - comparison.newLifetimePropertyTax >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(comparison.currentLifetimePropertyTax - comparison.newLifetimePropertyTax)}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Net Tax Savings</p>
                            <p className={`text-lg font-bold ${(comparison.currentLifetimeIncomeTax + comparison.currentLifetimePropertyTax) - (comparison.newLifetimeIncomeTax + comparison.newLifetimePropertyTax) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency((comparison.currentLifetimeIncomeTax + comparison.currentLifetimePropertyTax) - (comparison.newLifetimeIncomeTax + comparison.newLifetimePropertyTax))}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Estate Increase</p>
                            <p className={`text-lg font-bold ${comparison.newEstateAt100 - comparison.currentEstateAt100 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(comparison.newEstateAt100 - comparison.currentEstateAt100)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => onSelectDestination?.(destinationState)}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Apply This Relocation to My Plan
                </Button>
              </div>
            )}
          </>
        )}

        {!destinationState && (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Select a destination state to compare total tax burden and cost-of-living impact</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
