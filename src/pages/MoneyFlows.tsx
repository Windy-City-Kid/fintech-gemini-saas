import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { useMoneyFlows } from '@/hooks/useMoneyFlows';
import { useCashFlowDashboard } from '@/hooks/useCashFlowDashboard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeftRight, Plus, Settings, Calculator, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { CashFlowCommandCenter } from '@/components/income/CashFlowCommandCenter';
import { SurplusGapChart } from '@/components/income/SurplusGapChart';
import { MoneyFlowsDialog } from '@/components/scenarios/MoneyFlowsDialog';

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

export default function MoneyFlows() {
  const { flows, loading } = useMoneyFlows();
  const { 
    projection, 
    currentAge, 
    retirementAge, 
    excessSettings,
    updateExcessSettings,
    totalLifetimeIncome,
    totalLifetimeSavings,
    totalLifetimeGaps,
    lifetimeDebt,
    isLoading,
  } = useCashFlowDashboard();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  
  // Calculate current monthly values
  const monthlyStats = useMemo(() => {
    const totalContributions = flows.reduce((sum, f) => sum + f.annual_amount, 0);
    return {
      income: 8000, // TODO: Pull from income sources
      savings: totalContributions / 12,
      expenses: 4000, // TODO: Pull from expenses
      taxes: 1500,
      debt: 500,
      medical: 300,
    };
  }, [flows]);
  
  const netCashFlow = monthlyStats.income - 
    (monthlyStats.savings + monthlyStats.expenses + monthlyStats.taxes + monthlyStats.debt + monthlyStats.medical);
  
  const isSurplus = netCashFlow >= 0;

  const handleExcessSettingsChange = async (settings: typeof excessSettings) => {
    try {
      await updateExcessSettings(settings);
      toast.success('Excess income settings updated');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Money Flows"
        description="Command center for cash flow, savings, and shortfall management"
        previousPage={{ label: 'Expenses and Healthcare', path: '/expenses' }}
        nextPage={{ label: 'Estate Planning', path: '/estate-planning' }}
        showManageConnections={false}
      >
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={`${isSurplus ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {isSurplus ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">Monthly Net</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${isSurplus ? 'text-emerald-500' : 'text-red-500'}`}>
                {isSurplus ? '+' : ''}{formatCurrency(netCashFlow)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <PiggyBank className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Lifetime Saved</span>
              </div>
              <p className="text-2xl font-bold font-mono text-primary">
                {formatCurrency(totalLifetimeSavings)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className="h-4 w-4 text-orange-500" />
                <span className="text-xs text-muted-foreground">Gaps Funded</span>
              </div>
              <p className="text-2xl font-bold font-mono text-orange-500">
                {formatCurrency(totalLifetimeGaps)}
              </p>
            </CardContent>
          </Card>
          
          <Card className={`${lifetimeDebt > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-muted/50 border-border'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className={`h-4 w-4 ${lifetimeDebt > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
                <span className="text-xs text-muted-foreground">Lifetime Debt</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${lifetimeDebt > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {formatCurrency(lifetimeDebt)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="command" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="command">Command Center</TabsTrigger>
            <TabsTrigger value="visualization">Surplus/Gap Chart</TabsTrigger>
            <TabsTrigger value="contributions">Contributions</TabsTrigger>
          </TabsList>

          <TabsContent value="command" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CashFlowCommandCenter
                monthlyIncome={monthlyStats.income}
                monthlySavings={monthlyStats.savings}
                monthlyExpenses={monthlyStats.expenses}
                monthlyTaxes={monthlyStats.taxes}
                monthlyDebt={monthlyStats.debt}
                monthlyMedical={monthlyStats.medical}
                excessSettings={excessSettings}
                onExcessSettingsChange={handleExcessSettingsChange}
                currentSurplus={isSurplus ? netCashFlow : 0}
                currentGap={isSurplus ? 0 : Math.abs(netCashFlow)}
              />
              
              {/* Order of Operations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Monthly Order of Operations
                  </CardTitle>
                  <CardDescription>
                    How the engine processes your cash flow each month
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">1</span>
                      <div>
                        <p className="text-sm font-medium">Calculate Total Income</p>
                        <p className="text-xs text-muted-foreground">Work, SS, pensions, passive income</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-sm">2</span>
                      <div>
                        <p className="text-sm font-medium">Deduct Planned Savings</p>
                        <p className="text-xs text-muted-foreground">401k, IRA, HSA contributions (income-linked first)</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold text-sm">3</span>
                      <div>
                        <p className="text-sm font-medium">Deduct Fixed Costs</p>
                        <p className="text-xs text-muted-foreground">Taxes, debt, medical, essential expenses</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <span className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500 font-bold text-sm">4</span>
                      <div>
                        <p className="text-sm font-medium">Deduct Discretionary</p>
                        <p className="text-xs text-muted-foreground">Variable and lifestyle expenses</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <span className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-sm">5</span>
                      <div>
                        <p className="text-sm font-medium">Process Result</p>
                        <p className="text-xs text-muted-foreground">
                          Surplus → Save/Spend per settings • Gap → Withdraw from savings
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    <strong>Why monthly?</strong> Monthly granularity captures mid-year events like 
                    retirement transitions, where you may have both saved surplus (Jan-Jun) and 
                    funded gaps (Jul-Dec) in the same year.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="visualization">
            {projection && projection.annualSummaries.length > 0 ? (
              <SurplusGapChart
                annualSummaries={projection.annualSummaries}
                currentAge={currentAge}
                retirementAge={retirementAge}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Add income sources and accounts to generate your lifetime cash flow projection.
                  </p>
                  <div className="flex justify-center gap-3 mt-4">
                    <Button variant="outline" onClick={() => navigate('/income')}>
                      Add Income
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/accounts')}>
                      Add Accounts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="contributions" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Recurring Contributions</h3>
                <p className="text-sm text-muted-foreground">
                  Manage 401k, IRA, HSA, and other savings
                </p>
              </div>
              <Button onClick={() => setDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Flows
              </Button>
            </div>
            
            {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
            
            {!loading && flows.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <ArrowLeftRight className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    No contributions configured yet.
                  </p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contribution
                  </Button>
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flows.map((flow) => (
                <Card key={flow.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{flow.contribution_name}</span>
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        {flow.account_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Ages {flow.start_age} - {flow.end_age}
                      </span>
                      <span className="text-lg font-bold font-mono text-primary">
                        {formatCurrency(flow.annual_amount)}/yr
                      </span>
                    </div>
                    {flow.is_income_linked && (
                      <div className="mt-2 text-xs text-blue-500">
                        📎 Income-linked ({flow.income_link_percentage}%)
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <MoneyFlowsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          currentAge={currentAge}
        />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
