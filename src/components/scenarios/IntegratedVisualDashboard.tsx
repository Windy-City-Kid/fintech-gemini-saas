import { useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, TrendingUp, Gauge, RefreshCw } from 'lucide-react';
import { GaugeChart } from '@/components/charts/GaugeChart';
import { ExpenseProjectionChart } from './ExpenseProjectionChart';
import { SavingsProjectionChart } from './SavingsProjectionChart';
import { CashFlowSankey } from './CashFlowSankey';
import { TaxWaterfallChart } from './TaxWaterfallChart';

interface IntegratedVisualDashboardProps {
  // Form values (controlled)
  currentAge: number;
  retirementAge: number;
  monthlySpending: number;
  annualContribution: number;
  currentSavings: number;
  socialSecurityIncome: number;
  
  // Rate assumptions
  inflationRate: number;
  medicalInflation: number;
  expectedReturn: number;
  
  // Location
  currentState: string;
  destinationState?: string;
  
  // Simulation results
  successRate: number;
  simulationMedian?: number[];
  
  // Property data
  homeValue?: number;
  propertyTaxRate?: number;
  currentPropertyTaxRate?: number;
  destinationPropertyTaxRate?: number;
  
  // State options
  stateOptions: Array<{ code: string; name: string }>;
  
  // Callbacks
  onInflationChange: (value: number) => void;
  onMedicalInflationChange: (value: number) => void;
  onExpectedReturnChange: (value: number) => void;
  onDestinationStateChange: (value: string) => void;
  onRunSimulation: () => void;
  isSimulating?: boolean;
}

export function IntegratedVisualDashboard({
  currentAge,
  retirementAge,
  monthlySpending,
  annualContribution,
  currentSavings,
  socialSecurityIncome,
  inflationRate,
  medicalInflation,
  expectedReturn,
  currentState,
  destinationState,
  successRate,
  simulationMedian,
  homeValue = 500000,
  propertyTaxRate = 1.1,
  currentPropertyTaxRate = 1.1,
  destinationPropertyTaxRate,
  stateOptions,
  onInflationChange,
  onMedicalInflationChange,
  onExpectedReturnChange,
  onDestinationStateChange,
  onRunSimulation,
  isSimulating = false,
}: IntegratedVisualDashboardProps) {
  // Calculate cash flow and tax data
  const { cashFlowData, taxData } = useMemo(() => {
    const annualSpending = monthlySpending * 12;
    const isRetired = currentAge >= retirementAge;
    
    // Estimated income sources
    const grossIncome = isRetired ? annualSpending * 1.1 : annualSpending + annualContribution;
    const ssIncome = isRetired ? socialSecurityIncome : 0;
    const investmentIncome = isRetired ? annualSpending * 0.4 : currentSavings * (expectedReturn / 100) * 0.3;
    
    // Tax calculations - current state
    const federalTax = grossIncome * 0.15; // Simplified federal rate
    const currentStateTaxRate = 0.05; // Placeholder, would come from state rules
    const currentStateTaxAmount = grossIncome * currentStateTaxRate;
    const currentFICA = isRetired ? 0 : grossIncome * 0.062;
    const currentMedicare = isRetired ? 4800 : grossIncome * 0.0145;
    const currentPropTax = (homeValue * (currentPropertyTaxRate / 100));
    
    // Destination state taxes (if selected)
    const destinationStateTaxRate = destinationState ? 0.03 : undefined; // Would come from state rules
    const destinationStateTaxAmount = destinationState ? grossIncome * (destinationStateTaxRate || 0) : undefined;
    const destinationPropTax = destinationState && destinationPropertyTaxRate 
      ? (homeValue * (destinationPropertyTaxRate / 100))
      : undefined;
    
    // Get state names
    const currentStateName = stateOptions.find(s => s.code === currentState)?.name || currentState;
    const destinationStateName = destinationState 
      ? stateOptions.find(s => s.code === destinationState)?.name || destinationState 
      : undefined;
    
    // Expenses
    const housing = annualSpending * 0.30;
    const medical = annualSpending * 0.10;
    const living = annualSpending * 0.35;
    const discretionary = annualSpending * 0.15;
    const savings = isRetired ? 0 : annualContribution;
    
    return {
      cashFlowData: {
        grossIncome,
        socialSecurityIncome: ssIncome,
        investmentIncome,
        pensionIncome: 0,
        federalTax,
        stateTax: currentStateTaxAmount,
        medicarePremium: currentMedicare,
        housingExpense: housing,
        medicalExpense: medical,
        livingExpense: living,
        discretionaryExpense: discretionary,
        savingsContribution: savings,
      },
      taxData: {
        grossIncome,
        currentFederalTax: federalTax,
        currentStateTax: currentStateTaxAmount,
        currentFICA,
        currentMedicare,
        currentPropertyTax: currentPropTax,
        currentStateName,
        destinationFederalTax: federalTax, // Federal stays same
        destinationStateTax: destinationStateTaxAmount,
        destinationFICA: currentFICA, // FICA stays same
        destinationMedicare: currentMedicare, // Medicare stays same
        destinationPropertyTax: destinationPropTax,
        destinationStateName,
        isRetired,
      },
    };
  }, [
    currentAge, retirementAge, monthlySpending, annualContribution, currentSavings, 
    socialSecurityIncome, expectedReturn, homeValue, currentPropertyTaxRate, 
    destinationPropertyTaxRate, currentState, destinationState, stateOptions
  ]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Panel - Inputs (1/3 width on large screens) */}
      <div className="lg:col-span-4 space-y-4">
        {/* Rate Assumptions Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Rate Assumptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Inflation Rate */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">General Inflation</Label>
                <span className="text-xs font-mono text-muted-foreground">{inflationRate.toFixed(1)}%</span>
              </div>
              <Slider
                value={[inflationRate]}
                onValueChange={(v) => onInflationChange(v[0])}
                min={1}
                max={6}
                step={0.1}
                className="py-1"
              />
            </div>

            {/* Medical Inflation */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Medical Inflation</Label>
                <span className="text-xs font-mono text-muted-foreground">{medicalInflation.toFixed(1)}%</span>
              </div>
              <Slider
                value={[medicalInflation]}
                onValueChange={(v) => onMedicalInflationChange(v[0])}
                min={2}
                max={8}
                step={0.1}
                className="py-1"
              />
            </div>

            {/* Expected Return */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Expected Return</Label>
                <span className="text-xs font-mono text-muted-foreground">{expectedReturn.toFixed(1)}%</span>
              </div>
              <Slider
                value={[expectedReturn]}
                onValueChange={(v) => onExpectedReturnChange(v[0])}
                min={2}
                max={12}
                step={0.1}
                className="py-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Relocation Selector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              Relocation What-If
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current State</Label>
              <Input value={currentState} disabled className="h-8 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Destination State</Label>
              <Select value={destinationState || '__none__'} onValueChange={(val) => onDestinationStateChange(val === '__none__' ? '' : val)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select state..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No relocation</SelectItem>
                  {stateOptions.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Success Gauge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Gauge className="h-4 w-4 text-primary" />
              Monte Carlo Success
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            <GaugeChart
              value={successRate}
              maxValue={100}
              size="lg"
              thresholds={{ low: 60, medium: 80, high: 100 }}
              subtitle="Success Rate"
            />
            <Button
              onClick={onRunSimulation}
              disabled={isSimulating}
              size="sm"
              className="mt-4 w-full gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSimulating ? 'animate-spin' : ''}`} />
              {isSimulating ? 'Running...' : 'Re-run Simulation'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Charts (2/3 width on large screens) */}
      <div className="lg:col-span-8 space-y-4">
        {/* Top row: Expense & Savings charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExpenseProjectionChart
            currentAge={currentAge}
            retirementAge={retirementAge}
            monthlySpending={monthlySpending}
            medicalInflation={medicalInflation}
            generalInflation={inflationRate}
            propertyTaxRate={propertyTaxRate}
            homeValue={homeValue}
          />
          <SavingsProjectionChart
            currentAge={currentAge}
            retirementAge={retirementAge}
            currentSavings={currentSavings}
            annualContribution={annualContribution}
            monthlySpending={monthlySpending}
            expectedReturn={expectedReturn}
            inflationRate={inflationRate}
            simulationMedian={simulationMedian}
          />
        </div>

        {/* Tax Waterfall - Before/After Comparison */}
        <TaxWaterfallChart
          grossIncome={taxData.grossIncome}
          currentFederalTax={taxData.currentFederalTax}
          currentStateTax={taxData.currentStateTax}
          currentFICA={taxData.currentFICA}
          currentMedicare={taxData.currentMedicare}
          currentPropertyTax={taxData.currentPropertyTax}
          currentStateName={taxData.currentStateName}
          destinationFederalTax={taxData.destinationFederalTax}
          destinationStateTax={taxData.destinationStateTax}
          destinationFICA={taxData.destinationFICA}
          destinationMedicare={taxData.destinationMedicare}
          destinationPropertyTax={taxData.destinationPropertyTax}
          destinationStateName={taxData.destinationStateName}
          showComparison={!!destinationState}
          isRetired={taxData.isRetired}
        />

        {/* Bottom: Sankey Cash Flow */}
        <CashFlowSankey {...cashFlowData} />
      </div>
    </div>
  );
}
