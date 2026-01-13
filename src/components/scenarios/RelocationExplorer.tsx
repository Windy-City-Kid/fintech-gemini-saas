import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, TrendingUp, DollarSign, Calculator, ArrowRight, Sparkles, Home } from 'lucide-react';
import { useStateTaxRules, StateTaxRule } from '@/hooks/useStateTaxRules';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface RelocationExplorerProps {
  currentState: string;
  currentAge: number;
  retirementAge: number;
  monthlySpending: number;
  portfolioValue: number;
  ssIncome: number;
  homeEquity: number;
  onSelectDestination?: (stateCode: string) => void;
}

interface SimulationComparison {
  currentLifetimeTaxes: number;
  newLifetimeTaxes: number;
  currentEstateAt100: number;
  newEstateAt100: number;
  lifetimeSpendingIncrease: number;
  legacyIncreasePercent: number;
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
  onSelectDestination,
}: RelocationExplorerProps) {
  const { rules, getRule, isLoading } = useStateTaxRules();
  const [destinationState, setDestinationState] = useState<string>('');

  const currentRule = getRule(currentState);
  const destinationRule = destinationState ? getRule(destinationState) : null;

  // Run simplified comparison simulation
  const comparison = useMemo<SimulationComparison | null>(() => {
    if (!currentRule || !destinationRule) return null;

    const yearsToSimulate = 100 - currentAge;
    const retirementYears = 100 - retirementAge;
    const annualSpending = monthlySpending * 12;

    // Calculate lifetime taxes for current state
    let currentLifetimeTaxes = 0;
    let newLifetimeTaxes = 0;
    
    for (let year = 0; year < retirementYears; year++) {
      const age = retirementAge + year;
      const inflatedSpending = annualSpending * Math.pow(1.025, year);
      
      // Estimate taxable income (withdrawal + SS portion)
      let taxableIncome = inflatedSpending;
      
      // Current state tax
      if (currentRule.rate_type !== 'none') {
        let adjustedIncome = taxableIncome;
        if (!currentRule.social_security_taxable) {
          adjustedIncome -= ssIncome * 0.85;
        }
        if (age >= 60 && currentRule.retirement_exclusion_amount > 0) {
          adjustedIncome = Math.max(0, adjustedIncome - currentRule.retirement_exclusion_amount);
        }
        currentLifetimeTaxes += Math.max(0, adjustedIncome) * (currentRule.top_marginal_rate / 100);
      }

      // New state tax
      if (destinationRule.rate_type !== 'none') {
        let adjustedIncome = taxableIncome;
        if (!destinationRule.social_security_taxable) {
          adjustedIncome -= ssIncome * 0.85;
        }
        if (age >= 60 && destinationRule.retirement_exclusion_amount > 0) {
          adjustedIncome = Math.max(0, adjustedIncome - destinationRule.retirement_exclusion_amount);
        }
        newLifetimeTaxes += Math.max(0, adjustedIncome) * (destinationRule.top_marginal_rate / 100);
      }
    }

    // Calculate COL-adjusted spending impact
    const colDifference = destinationRule.col_multiplier - currentRule.col_multiplier;
    const annualCOLSavings = annualSpending * -colDifference * 0.6; // 60% of spending is discretionary
    const lifetimeCOLSavings = annualCOLSavings * retirementYears;

    // Calculate estate projections (simplified 5% growth)
    const taxSavings = currentLifetimeTaxes - newLifetimeTaxes;
    const totalSavings = taxSavings + lifetimeCOLSavings;
    
    const currentEstateAt100 = portfolioValue * Math.pow(1.05, yearsToSimulate) * 0.4 + homeEquity * Math.pow(1.03, yearsToSimulate);
    const newEstateAt100 = currentEstateAt100 + totalSavings * Math.pow(1.05, retirementYears / 2);

    const legacyIncreasePercent = ((newEstateAt100 - currentEstateAt100) / currentEstateAt100) * 100;

    return {
      currentLifetimeTaxes,
      newLifetimeTaxes,
      currentEstateAt100,
      newEstateAt100,
      lifetimeSpendingIncrease: totalSavings,
      legacyIncreasePercent,
    };
  }, [currentRule, destinationRule, currentAge, retirementAge, monthlySpending, portfolioValue, ssIncome, homeEquity]);

  const chartData = useMemo(() => {
    if (!comparison || !currentRule || !destinationRule) return [];
    
    return [
      {
        name: 'Lifetime Taxes',
        current: comparison.currentLifetimeTaxes,
        new: comparison.newLifetimeTaxes,
      },
      {
        name: 'Estate at 100',
        current: comparison.currentEstateAt100,
        new: comparison.newEstateAt100,
      },
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
            <CardTitle>Relocation Savings Explorer</CardTitle>
            <CardDescription>
              Compare lifetime tax and cost-of-living impact by state
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
                        {rule.rate_type === 'none' ? 'No Tax' : `${rule.top_marginal_rate}%`}
                      </Badge>
                      {rule.col_multiplier < 0.95 && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          Low COL
                        </Badge>
                      )}
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Tax Rate</p>
                <p className="text-lg font-bold">
                  {destinationRule.rate_type === 'none' ? 'None' : `${destinationRule.top_marginal_rate}%`}
                </p>
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
                <p className="text-xs text-muted-foreground">Retirement Rating</p>
                <Badge className={`${friendlinessColors[destinationRule.retirement_friendliness]} text-white`}>
                  {destinationRule.retirement_friendliness}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Comparison Chart */}
            {comparison && (
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Side-by-Side Comparison
                </h4>
                
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
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
                      <Legend />
                      <Bar dataKey="current" name={currentRule?.state_name || 'Current'} fill="hsl(var(--muted-foreground))" radius={4} />
                      <Bar dataKey="new" name={destinationRule.state_name} fill="hsl(var(--primary))" radius={4} />
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
                        
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Tax Savings</p>
                            <p className={`text-xl font-bold ${comparison.currentLifetimeTaxes - comparison.newLifetimeTaxes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(comparison.currentLifetimeTaxes - comparison.newLifetimeTaxes)}
                            </p>
                          </div>
                          <div className="p-3 bg-background rounded-lg">
                            <p className="text-xs text-muted-foreground">Estate Increase</p>
                            <p className={`text-xl font-bold ${comparison.newEstateAt100 - comparison.currentEstateAt100 >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            <p>Select a destination state to compare tax and cost-of-living impact</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
