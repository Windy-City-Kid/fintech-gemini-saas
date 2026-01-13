import { useEffect, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, TrendingUp, Calendar, DollarSign, Save, Play, Info } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { SimulationResult, SimulationParams, convertTo3AssetAllocation, RateAssumptions } from '@/hooks/useMonteCarloSimulation';
import { useMonteCarloWorker } from '@/hooks/useMonteCarloWorker';
import { useRateAssumptions } from '@/hooks/useRateAssumptions';
import { MonteCarloChart } from '@/components/scenarios/MonteCarloChart';
import { SimulationStats } from '@/components/scenarios/SimulationStats';
import { GuardrailChart } from '@/components/scenarios/GuardrailChart';
import { ResilienceMeter } from '@/components/scenarios/ResilienceMeter';
import { ExportReportButton } from '@/components/scenarios/ExportReportButton';
import { MoneyFlowsTile } from '@/components/scenarios/MoneyFlowsTile';
import { MoneyFlowsDialog } from '@/components/scenarios/MoneyFlowsDialog';
import { PropertySummaryCard } from '@/components/scenarios/PropertySummaryCard';
import { HomeEquityChart } from '@/components/scenarios/HomeEquityChart';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useProperties } from '@/hooks/useProperties';
import { ASSET_CLASS_LABELS, ASSET_CLASS_COLORS } from '@/lib/correlationMatrix';
import { AssetAllocation } from '@/lib/assetClassification';

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

export default function Scenarios() {
  const { user } = useAuth();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [moneyFlowsDialogOpen, setMoneyFlowsDialogOpen] = useState(false);
  
  // Use the portfolio data bridge hook
  const portfolio = usePortfolioData();
  
  // Fetch properties for real estate integration
  const { primaryResidence, totalEquity } = useProperties();
  
  // Fetch user rate assumptions
  const { assumptions: rateAssumptions } = useRateAssumptions();
  
  // Use Web Worker for simulation (keeps UI responsive)
  const { result: simulationResult, isRunning: simulating, error: workerError, runSimulation: runWorkerSimulation } = useMonteCarloWorker();

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
    const fetchScenario = async () => {
      if (!user) return;
      
      try {
        const { data } = await supabase
          .from('scenarios')
          .select('*')
          .eq('is_active', true)
          .single();

        if (data) {
          setScenario(data);
          setValue('scenario_name', data.scenario_name);
          setValue('current_age', data.current_age || 35);
          setValue('retirement_age', data.retirement_age);
          setValue('annual_contribution', Number(data.annual_contribution));
          setValue('inflation_rate', Number(data.inflation_rate));
          setValue('expected_return', Number(data.expected_return));
          setValue('monthly_retirement_spending', Number(data.monthly_retirement_spending));
        }
      } catch (error) {
        console.error('Error fetching scenario:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScenario();
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

  // Use portfolio data from the bridge hook
  const currentSavings = portfolio.totalBalance;
  const allocation = portfolio.allocationPercentages;

  // Show toast on worker error
  useEffect(() => {
    if (workerError) {
      toast.error('Simulation failed', { description: workerError });
    }
  }, [workerError]);

  // Show success toast when simulation completes
  useEffect(() => {
    if (simulationResult && !simulating) {
      toast.success('Simulation complete', {
        description: `${simulationResult.successRate.toFixed(1)}% success rate in ${simulationResult.executionTimeMs?.toFixed(0) || '?'}ms`,
      });
    }
  }, [simulationResult, simulating]);

  const runSimulation = useCallback(() => {
    // Convert 5-asset allocation to 3-asset for simulation
    const simAllocation = convertTo3AssetAllocation(allocation);
    
    // Build rate assumptions from user settings (convert % to decimal)
    // Includes market_sentiment (T10YIE) as simulation anchor per Boldin framework
    const userRates: RateAssumptions = {};
    
    const inflationRate = rateAssumptions.find(r => r.category === 'General' && r.name === 'Inflation');
    if (inflationRate) {
      userRates.inflation = {
        optimistic: inflationRate.user_optimistic / 100,
        pessimistic: inflationRate.user_pessimistic / 100,
        // Market sentiment (T10YIE) anchors the center of the triangular distribution
        marketSentiment: inflationRate.market_sentiment ? inflationRate.market_sentiment / 100 : undefined,
      };
    }
    
    const stockReturns = rateAssumptions.find(r => r.category === 'Investment' && r.name === 'Stock Returns');
    if (stockReturns) {
      userRates.stockReturns = {
        optimistic: stockReturns.user_optimistic / 100,
        pessimistic: stockReturns.user_pessimistic / 100,
      };
    }
    
    const bondReturns = rateAssumptions.find(r => r.category === 'Investment' && r.name === 'Bond Returns');
    if (bondReturns) {
      userRates.bondReturns = {
        optimistic: bondReturns.user_optimistic / 100,
        pessimistic: bondReturns.user_pessimistic / 100,
      };
    }
    
    const params: SimulationParams = {
      currentAge: formValues.current_age,
      retirementAge: formValues.retirement_age,
      currentSavings,
      annualContribution: formValues.annual_contribution,
      monthlyRetirementSpending: formValues.monthly_retirement_spending,
      allocation: simAllocation,
      rateAssumptions: Object.keys(userRates).length > 0 ? userRates : undefined,
      // Include property data for mortgage amortization and home equity
      property: primaryResidence ? {
        mortgageBalance: primaryResidence.mortgage_balance || 0,
        mortgageInterestRate: primaryResidence.mortgage_interest_rate || 0,
        mortgageMonthlyPayment: primaryResidence.mortgage_monthly_payment || 0,
        estimatedValue: primaryResidence.estimated_value || 0,
        relocationAge: primaryResidence.relocation_age || undefined,
        relocationSalePrice: primaryResidence.relocation_sale_price || undefined,
        relocationNewPurchasePrice: primaryResidence.relocation_new_purchase_price || undefined,
        relocationNewMortgageAmount: primaryResidence.relocation_new_mortgage_amount || undefined,
        relocationNewInterestRate: primaryResidence.relocation_new_interest_rate || undefined,
        relocationNewTermMonths: primaryResidence.relocation_new_term_months || undefined,
      } : undefined,
    };
    
    // Run in Web Worker to keep UI responsive
    runWorkerSimulation(params, 5000);
  }, [formValues, currentSavings, allocation, rateAssumptions, primaryResidence, runWorkerSimulation]);

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
          <div className="flex items-center gap-3">
            <ExportReportButton
              simulationResult={simulationResult}
              userName={user?.user_metadata?.full_name || user?.email || 'Investor'}
              currentAge={formValues.current_age}
              retirementAge={formValues.retirement_age}
              currentSavings={currentSavings}
              monthlySpending={formValues.monthly_retirement_spending}
              allocation={convertTo3AssetAllocation(allocation)}
              disabled={simulating}
            />
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
      </div>

      {/* Simulation Stats */}
      <div className="mb-8">
        <SimulationStats 
          result={simulationResult} 
          retirementAge={formValues.retirement_age}
          currentAge={formValues.current_age}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Monte Carlo Chart */}
        <div className="lg:col-span-2 stat-card" id="fan-chart-container">
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

        {/* Resilience Meter */}
        <ResilienceMeter 
          successRate={simulationResult?.successRate || 0} 
          loading={simulating} 
        />

        {/* Money Flows Tile */}
        <MoneyFlowsTile 
          currentAge={formValues.current_age}
          monthlySpending={formValues.monthly_retirement_spending}
          onManageClick={() => setMoneyFlowsDialogOpen(true)}
        />

        {/* Property Summary Card */}
        <PropertySummaryCard 
          property={primaryResidence}
          totalEquity={totalEquity}
          yearsToRetirement={yearsToRetirement}
        />

        {/* Home Equity Projection Chart */}
        <div className="lg:col-span-2">
          <HomeEquityChart
            property={primaryResidence}
            currentAge={formValues.current_age}
            retirementAge={formValues.retirement_age}
          />
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

          {/* Portfolio Allocation Display - 5 Asset Classes */}
          <div className="mb-6 p-3 rounded-lg bg-secondary/30 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Portfolio Allocation (5-Asset)</p>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full" style={{ width: `${allocation.domesticStocks * 100}%`, backgroundColor: ASSET_CLASS_COLORS.domesticStocks }} />
                <div className="h-full" style={{ width: `${allocation.intlStocks * 100}%`, backgroundColor: ASSET_CLASS_COLORS.intlStocks }} />
                <div className="h-full" style={{ width: `${allocation.bonds * 100}%`, backgroundColor: ASSET_CLASS_COLORS.bonds }} />
                <div className="h-full" style={{ width: `${allocation.realEstate * 100}%`, backgroundColor: ASSET_CLASS_COLORS.realEstate }} />
                <div className="h-full" style={{ width: `${allocation.cash * 100}%`, backgroundColor: ASSET_CLASS_COLORS.cash }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {Object.entries(allocation).map(([key, value]) => (
                <div key={key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ASSET_CLASS_COLORS[key as keyof AssetAllocation] }} />
                  <span className="text-muted-foreground">{ASSET_CLASS_LABELS[key as keyof AssetAllocation]}:</span>
                  <span className="font-mono">{(value * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
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

      {/* Guardrail Stress Test Chart */}
      <div className="mt-8">
        <GuardrailChart 
          guardrailEvents={simulationResult?.guardrailEvents || []}
          totalIterations={5000}
          loading={simulating}
        />
      </div>

      {/* Technical Details */}
      <div className="mt-8 p-4 rounded-lg bg-secondary/30 border border-border">
        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Info className="h-4 w-4" />
          Simulation Methodology
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="font-medium text-foreground">Latin Hypercube Sampling</p>
            <p>5,000 stratified iterations for better coverage</p>
          </div>
          <div>
            <p className="font-medium text-foreground">5-Asset Cholesky Matrix</p>
            <p>Correlated returns: US/Intl Stocks, Bonds, REITs, Cash</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Stochastic Inflation</p>
            <p>Correlated with bonds/cash (μ=3%, σ=1.5%)</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Dynamic Guardrails</p>
            <p>10% spending cut if portfolio &lt;80% of start</p>
          </div>
          <div>
            <p className="font-medium text-foreground">Input Bridge</p>
            <p>Allocation from linked accounts via ticker mapping</p>
          </div>
        </div>
      </div>
      {/* Money Flows Dialog */}
      <MoneyFlowsDialog 
        open={moneyFlowsDialogOpen} 
        onOpenChange={setMoneyFlowsDialogOpen}
        currentAge={formValues.current_age}
      />
    </DashboardLayout>
  );
}
