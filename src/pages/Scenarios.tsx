import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, TrendingUp, Calendar, DollarSign, Percent, Save, Play, Info } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { runMonteCarloSimulation, SimulationResult, SimulationParams } from '@/hooks/useMonteCarloSimulation';
import { MonteCarloChart } from '@/components/scenarios/MonteCarloChart';
import { SimulationStats } from '@/components/scenarios/SimulationStats';

const scenarioSchema = z.object({
  scenario_name: z.string().min(1),
  current_age: z.number().min(18).max(100),
  retirement_age: z.number().min(50).max(100),
  annual_contribution: z.number().min(0),
  inflation_rate: z.number().min(0).max(0.15),
  expected_return: z.number().min(0).max(0.2),
  monthly_retirement_spending: z.number().min(0),
});

type ScenarioFormData = z.infer<typeof scenarioSchema>;

interface Scenario {
  id: string;
  scenario_name: string;
  current_age: number | null;
  retirement_age: number;
  annual_contribution: number;
  inflation_rate: number;
  expected_return: number;
  monthly_retirement_spending: number;
}

interface HoldingsAllocation {
  Stocks: number;
  Bonds: number;
  Cash: number;
  Other: number;
}

export default function Scenarios() {
  const { user } = useAuth();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [accounts, setAccounts] = useState<{ current_balance: number }[]>([]);
  const [holdings, setHoldings] = useState<HoldingsAllocation>({ Stocks: 0, Bonds: 0, Cash: 0, Other: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ScenarioFormData>({
    resolver: zodResolver(scenarioSchema),
    defaultValues: {
      scenario_name: 'My Retirement Plan',
      current_age: 35,
      retirement_age: 65,
      annual_contribution: 20000,
      inflation_rate: 0.025,
      expected_return: 0.07,
      monthly_retirement_spending: 5000,
    },
  });

  const formValues = watch();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const [scenarioRes, accountsRes, holdingsRes] = await Promise.all([
          supabase.from('scenarios').select('*').eq('is_active', true).single(),
          supabase.from('accounts').select('current_balance'),
          supabase.from('holdings').select('asset_class, market_value'),
        ]);

        if (scenarioRes.data) {
          const s = scenarioRes.data;
          setScenario(s);
          setValue('scenario_name', s.scenario_name);
          setValue('current_age', s.current_age || 35);
          setValue('retirement_age', s.retirement_age);
          setValue('annual_contribution', Number(s.annual_contribution));
          setValue('inflation_rate', Number(s.inflation_rate));
          setValue('expected_return', Number(s.expected_return));
          setValue('monthly_retirement_spending', Number(s.monthly_retirement_spending));
        }

        if (accountsRes.data) {
          setAccounts(accountsRes.data);
        }

        // Calculate holdings allocation
        if (holdingsRes.data && holdingsRes.data.length > 0) {
          const allocation = holdingsRes.data.reduce((acc, h) => {
            const key = h.asset_class as keyof HoldingsAllocation;
            if (key in acc) {
              acc[key] += Number(h.market_value);
            } else {
              acc.Other += Number(h.market_value);
            }
            return acc;
          }, { Stocks: 0, Bonds: 0, Cash: 0, Other: 0 });
          setHoldings(allocation);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, setValue]);

  const onSubmit = async (data: ScenarioFormData) => {
    if (!user || !scenario) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('scenarios')
        .update({
          scenario_name: data.scenario_name,
          current_age: data.current_age,
          retirement_age: data.retirement_age,
          annual_contribution: data.annual_contribution,
          inflation_rate: data.inflation_rate,
          expected_return: data.expected_return,
          monthly_retirement_spending: data.monthly_retirement_spending,
        })
        .eq('id', scenario.id);

      if (error) throw error;
      toast.success('Scenario saved successfully');
    } catch (error: any) {
      toast.error('Failed to save scenario', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  // Calculate current savings and allocation percentages
  const currentSavings = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
  const totalHoldings = holdings.Stocks + holdings.Bonds + holdings.Cash + holdings.Other;
  
  // Use actual holdings allocation or default to 60/40 if no holdings data
  const stockAllocation = totalHoldings > 0 ? holdings.Stocks / totalHoldings : 0.6;
  const bondAllocation = totalHoldings > 0 ? (holdings.Bonds + holdings.Cash) / totalHoldings : 0.4;

  const runSimulation = useCallback(() => {
    setSimulating(true);
    
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const params: SimulationParams = {
          currentAge: formValues.current_age,
          retirementAge: formValues.retirement_age,
          currentSavings,
          annualContribution: formValues.annual_contribution,
          monthlyRetirementSpending: formValues.monthly_retirement_spending,
          expectedReturn: formValues.expected_return,
          inflationRate: formValues.inflation_rate,
          stockAllocation,
          bondAllocation,
        };
        
        const result = runMonteCarloSimulation(params, 5000);
        setSimulationResult(result);
        toast.success('Simulation complete', {
          description: `${result.successRate.toFixed(1)}% success rate across 5,000 trials`,
        });
      } catch (error) {
        console.error('Simulation error:', error);
        toast.error('Simulation failed');
      } finally {
        setSimulating(false);
      }
    }, 50);
  }, [formValues, currentSavings, stockAllocation, bondAllocation]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const yearsToRetirement = formValues.retirement_age - formValues.current_age;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Monte Carlo Simulation</h1>
            <p className="text-muted-foreground">
              5,000 iterations using Latin Hypercube Sampling with correlated asset returns
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={runSimulation} 
                  disabled={simulating}
                  size="lg"
                  className="gap-2"
                >
                  <Play className="h-5 w-5" />
                  {simulating ? 'Running...' : 'Run Simulation'}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-sm">
                  Uses Latin Hypercube Sampling for stratified coverage, Cholesky decomposition 
                  for correlated stock/bond returns, stochastic inflation, and dynamic spending guardrails.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Simulation Stats */}
      <div className="mb-8">
        <SimulationStats 
          result={simulationResult} 
          retirementAge={formValues.retirement_age}
          currentAge={formValues.current_age}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Monte Carlo Chart */}
        <div className="lg:col-span-2 stat-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Probability Distribution
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Shows 5th, 25th, 50th, 75th, and 95th percentile outcomes across all simulations.
                        The bands represent the range of possible outcomes.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </h3>
              <p className="text-sm text-muted-foreground">Percentile bands from 5,000 Monte Carlo trials</p>
            </div>
            {simulationResult && (
              <div className="text-right">
                <p className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(simulationResult.percentiles.p50[yearsToRetirement] || 0)}
                </p>
                <p className="text-sm text-muted-foreground">median at retirement</p>
              </div>
            )}
          </div>

          <MonteCarloChart 
            result={simulationResult} 
            retirementAge={formValues.retirement_age}
            loading={simulating}
          />

          {/* Legend */}
          {simulationResult && (
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary opacity-20" />
                <span className="text-xs text-muted-foreground">5th-95th percentile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary opacity-40" />
                <span className="text-xs text-muted-foreground">25th-75th percentile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Median</span>
              </div>
            </div>
          )}
        </div>

        {/* Assumptions Form */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Assumptions</h3>
              <p className="text-sm text-muted-foreground">Adjust your scenario</p>
            </div>
          </div>

          {/* Portfolio Allocation Display */}
          <div className="mb-6 p-3 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Current Portfolio Mix</p>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                <div 
                  className="h-full bg-primary" 
                  style={{ width: `${stockAllocation * 100}%` }}
                />
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${bondAllocation * 100}%` }}
                />
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {(stockAllocation * 100).toFixed(0)}/{(bondAllocation * 100).toFixed(0)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Stocks / Bonds (from linked accounts)
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label>Current Age</Label>
              </div>
              <Input 
                type="number" 
                {...register('current_age', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <Label>Retirement Age: {formValues.retirement_age}</Label>
              </div>
              <Slider
                value={[formValues.retirement_age]}
                onValueChange={(value) => setValue('retirement_age', value[0])}
                min={50}
                max={80}
                step={1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label>Annual Contribution</Label>
              </div>
              <Input 
                type="number" 
                {...register('annual_contribution', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label>Monthly Retirement Spending</Label>
              </div>
              <Input 
                type="number" 
                {...register('monthly_retirement_spending', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Label>Current Savings</Label>
              </div>
              <div className="p-3 rounded-md bg-muted/50 border border-border">
                <p className="text-lg font-semibold font-mono">{formatCurrency(currentSavings)}</p>
                <p className="text-xs text-muted-foreground">From linked accounts</p>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button type="submit" className="w-full gap-2" disabled={saving}>
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Scenario'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Technical Details */}
      <div className="mt-8 p-4 rounded-lg bg-secondary/30 border border-border">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Simulation Methodology
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Latin Hypercube Sampling</p>
            <p>Stratified sampling ensures better coverage of probability space than pure random sampling</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Cholesky Decomposition</p>
            <p>Maintains historical correlations between stocks, bonds, and inflation</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Stochastic Inflation</p>
            <p>Inflation varies each year using correlated random draws (μ=3%, σ=1.5%)</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Dynamic Guardrails</p>
            <p>Spending reduced 10% if portfolio drops below 80% of retirement start value</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
