import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { useMoneyFlows } from '@/hooks/useMoneyFlows';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Heart, ShoppingCart, Home, Stethoscope, Plus, Calendar, Tag, AlertTriangle, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { HealthcareCostChart } from '@/components/scenarios/HealthcareCostChart';
import {
  getBaselineMedicareCosts,
  HEALTH_INCIDENTALS,
  PART_D_PRESCRIPTION_CAP,
  MEDICARE_PART_B_STANDARD,
  MEDICARE_PART_D_BASE,
  type HealthCondition,
  type MedicareChoice,
} from '@/lib/medicareCalculator';

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

interface HealthcarePreferences {
  health_condition: 'excellent' | 'good' | 'poor';
  medicare_choice: 'advantage' | 'medigap';
}

export default function Expenses() {
  const { user } = useAuth();
  const { flows, loading, refetch } = useMoneyFlows();
  const navigate = useNavigate();
  
  const [healthPrefs, setHealthPrefs] = useState<HealthcarePreferences>({
    health_condition: 'good',
    medicare_choice: 'advantage',
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    startAge: '25',
    endAge: '100',
    priority: 'discretionary' as 'mandatory' | 'discretionary',
  });

  const expenseFlows = flows.filter(f => f.account_type.toLowerCase().includes('expense'));
  const totalExpenses = expenseFlows.reduce((sum, f) => sum + f.annual_amount, 0);
  const mandatoryExpenses = expenseFlows.filter(f => f.priority === 'mandatory');
  const discretionaryExpenses = expenseFlows.filter(f => f.priority === 'discretionary' || !f.priority);

  // Fetch healthcare preferences
  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('health_condition, medicare_choice')
        .maybeSingle();
      
      if (data) {
        setHealthPrefs({
          health_condition: (data.health_condition as HealthcarePreferences['health_condition']) || 'good',
          medicare_choice: (data.medicare_choice as HealthcarePreferences['medicare_choice']) || 'advantage',
        });
      }
    };
    fetchPreferences();
  }, [user]);

  const saveHealthPreferences = async () => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          health_condition: healthPrefs.health_condition,
          medicare_choice: healthPrefs.medicare_choice,
        })
        .eq('user_id', user.id);
      
      if (error) throw error;
      toast.success('Healthcare preferences saved');
    } catch (err) {
      console.error('Error saving preferences:', err);
      toast.error('Failed to save preferences');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleAddExpense = async () => {
    if (!user || !newExpense.name || !newExpense.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase.from('money_flows').insert({
        user_id: user.id,
        contribution_name: newExpense.name,
        account_type: 'Expense',
        annual_amount: parseFloat(newExpense.amount),
        start_age: parseInt(newExpense.startAge),
        end_age: parseInt(newExpense.endAge),
        priority: newExpense.priority,
      });

      if (error) throw error;
      
      toast.success('Expense added successfully');
      setAddExpenseOpen(false);
      setNewExpense({ name: '', amount: '', startAge: '25', endAge: '100', priority: 'discretionary' });
      refetch();
    } catch (err) {
      console.error('Error adding expense:', err);
      toast.error('Failed to add expense');
    }
  };

  const updateExpensePriority = async (flowId: string, priority: 'mandatory' | 'discretionary') => {
    try {
      const { error } = await supabase
        .from('money_flows')
        .update({ priority })
        .eq('id', flowId);
      
      if (error) throw error;
      toast.success('Priority updated');
      refetch();
    } catch (err) {
      console.error('Error updating priority:', err);
      toast.error('Failed to update priority');
    }
  };

  // Calculate healthcare breakdown using the 2026 Medicare Health Status Engine
  const healthcareBreakdown = useMemo(() => {
    const breakdown = getBaselineMedicareCosts(
      healthPrefs.health_condition as HealthCondition,
      healthPrefs.medicare_choice as MedicareChoice
    );
    return breakdown;
  }, [healthPrefs.health_condition, healthPrefs.medicare_choice]);

  // Get incidentals description based on health status
  const getIncidentalsDescription = () => {
    switch (healthPrefs.health_condition) {
      case 'excellent':
        return 'Dental, vision, and hearing';
      case 'good':
        return 'Coinsurance and deductibles';
      case 'poor':
        return 'Higher utilization + Part D cap';
      default:
        return 'Out-of-pocket costs';
    }
  };

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Expenses and Healthcare"
        description="Track your regular expenses and healthcare costs"
        previousPage={{ label: 'Income', path: '/income' }}
        nextPage={{ label: 'Money Flows', path: '/money-flows' }}
        onManageConnections={() => navigate('/connections')}
      >
        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Annual Expenses</p>
                <p className="text-3xl font-bold font-mono">{loading ? '...' : formatCurrency(totalExpenses)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Monthly Average</p>
                <p className="text-xl font-bold text-warning font-mono">{formatCurrency(totalExpenses / 12)}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-destructive/20 text-destructive border-destructive/30">
                  Mandatory
                </Badge>
                <span className="text-sm font-mono">
                  {formatCurrency(mandatoryExpenses.reduce((sum, f) => sum + f.annual_amount, 0))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Discretionary</Badge>
                <span className="text-sm font-mono">
                  {formatCurrency(discretionaryExpenses.reduce((sum, f) => sum + f.annual_amount, 0))}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Healthcare Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Healthcare Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="health-condition">Health Condition</Label>
                <Select
                  value={healthPrefs.health_condition}
                  onValueChange={(val) => setHealthPrefs(p => ({ ...p, health_condition: val as HealthcarePreferences['health_condition'] }))}
                >
                  <SelectTrigger id="health-condition">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent (-20% medical costs)</SelectItem>
                    <SelectItem value="good">Good (baseline)</SelectItem>
                    <SelectItem value="poor">Poor (+20% medical costs)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Adjusts out-of-pocket medical projections by ±20%
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="medicare-choice">Medicare Choice</Label>
                <Select
                  value={healthPrefs.medicare_choice}
                  onValueChange={(val) => setHealthPrefs(p => ({ ...p, medicare_choice: val as HealthcarePreferences['medicare_choice'] }))}
                >
                  <SelectTrigger id="medicare-choice">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advantage">Medicare Advantage (Part C)</SelectItem>
                    <SelectItem value="medigap">Medigap Plan G + Part D</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {healthPrefs.medicare_choice === 'advantage' 
                    ? 'Lower premiums, network restrictions' 
                    : 'Higher premiums, more flexibility'}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                Health multiplier: <span className="font-mono font-medium text-foreground">{healthcareBreakdown.healthMultiplier}x</span>
              </p>
              <Button onClick={saveHealthPreferences} disabled={savingPrefs}>
                {savingPrefs ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Healthcare Breakdown Card - 2026 Medicare Engine */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Healthcare Breakdown</CardTitle>
                  <CardDescription>2026 Medicare projections at age 65</CardDescription>
                </div>
              </div>
              {healthPrefs.health_condition === 'poor' && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Part D Cap Active
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Premium Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Part B Premium</span>
                </div>
                <span className="font-mono font-medium">{formatCurrency(MEDICARE_PART_B_STANDARD)}/mo</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Part D Premium (avg)</span>
                </div>
                <span className="font-mono font-medium">{formatCurrency(MEDICARE_PART_D_BASE)}/mo</span>
              </div>
              {healthPrefs.medicare_choice === 'medigap' && (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Medigap Plan G</span>
                  </div>
                  <span className="font-mono font-medium">+$175/mo</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Monthly Premiums</span>
                <span className="font-mono font-semibold text-primary">
                  {formatCurrency(healthcareBreakdown.totalMonthlyPremiums)}
                </span>
              </div>
            </div>

            {/* Out-of-Pocket Costs */}
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Estimated Out-of-Pocket ({healthPrefs.health_condition} health)
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm">{getIncidentalsDescription()}</span>
                <span className="font-mono font-medium">
                  {formatCurrency(HEALTH_INCIDENTALS[healthPrefs.health_condition as HealthCondition])}/yr
                </span>
              </div>
              {healthPrefs.health_condition === 'poor' && (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Part D Prescription Cap</span>
                  <span className="font-mono font-medium text-destructive">
                    {formatCurrency(PART_D_PRESCRIPTION_CAP)}/yr
                  </span>
                </div>
              )}
            </div>

            {/* Total Annual Liability */}
            <Separator />
            <div className="bg-primary/5 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-muted-foreground">Total Annual Liability</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Premiums + Out-of-Pocket ({healthPrefs.health_condition})
                  </p>
                </div>
                <p className="text-2xl font-bold font-mono text-primary">
                  {formatCurrency(healthcareBreakdown.totalAnnualLiability)}
                </p>
              </div>
            </div>

            {/* End-of-Life Warning */}
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
              <span>
                <strong>End-of-Life Planning:</strong> Medical costs increase by 150% in the final 3 years 
                of simulation (ages 97-100) to model long-term care and nursing needs.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Add Expense Button */}
        <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2" variant="outline">
              <Plus className="h-4 w-4" />
              Add Future Spending Change
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="expense-name">Expense Name</Label>
                <Input
                  id="expense-name"
                  placeholder="e.g., Travel, Hobbies, Healthcare"
                  value={newExpense.name}
                  onChange={(e) => setNewExpense(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Annual Amount</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  placeholder="10000"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start-age" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Start Age
                  </Label>
                  <Input
                    id="start-age"
                    type="number"
                    value={newExpense.startAge}
                    onChange={(e) => setNewExpense(p => ({ ...p, startAge: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-age" className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    End Age
                  </Label>
                  <Input
                    id="end-age"
                    type="number"
                    value={newExpense.endAge}
                    onChange={(e) => setNewExpense(p => ({ ...p, endAge: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  Priority
                </Label>
                <Select
                  value={newExpense.priority}
                  onValueChange={(val) => setNewExpense(p => ({ ...p, priority: val as 'mandatory' | 'discretionary' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mandatory">Mandatory (Essential)</SelectItem>
                    <SelectItem value="discretionary">Discretionary (Flexible)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAddExpense} className="w-full">
                Add Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Expense List */}
        {expenseFlows.map((flow) => (
          <Card key={flow.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <ShoppingCart className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">{flow.contribution_name}</p>
                    <p className="text-sm text-muted-foreground">
                      Ages {flow.start_age} - {flow.end_age}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select
                    value={flow.priority || 'discretionary'}
                    onValueChange={(val) => updateExpensePriority(flow.id, val as 'mandatory' | 'discretionary')}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mandatory">Mandatory</SelectItem>
                      <SelectItem value="discretionary">Discretionary</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="font-mono text-warning font-semibold">
                    {formatCurrency(flow.annual_amount)}/yr
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Healthcare Cost Projection Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Projected Healthcare Costs (Age 65-100)
            </CardTitle>
            <CardDescription>
              Including IRMAA surcharges and end-of-life care surge
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="chart" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chart">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Chart View
                </TabsTrigger>
                <TabsTrigger value="categories">
                  <Tag className="h-4 w-4 mr-2" />
                  Expense Categories
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="chart" className="pt-4">
                <HealthcareCostChart
                  currentAge={55}
                  targetAge={100}
                  baseMAGI={100000}
                  annualMAGIGrowth={0.02}
                  healthCondition={healthPrefs.health_condition as HealthCondition}
                  medicareChoice={healthPrefs.medicare_choice as MedicareChoice}
                  isMarried={false}
                  medicalInflationRate={0.0336}
                  height={350}
                />
              </TabsContent>
              
              <TabsContent value="categories" className="pt-4 space-y-4">
                {/* Essential vs Discretionary Categories */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs">Essential</Badge>
                        Mandatory Expenses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {mandatoryExpenses.length > 0 ? (
                        mandatoryExpenses.map(expense => (
                          <div key={expense.id} className="flex justify-between text-sm">
                            <span>{expense.contribution_name}</span>
                            <span className="font-mono">{formatCurrency(expense.annual_amount)}/yr</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No mandatory expenses added</p>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold text-sm">
                        <span>Total</span>
                        <span className="font-mono text-destructive">
                          {formatCurrency(mandatoryExpenses.reduce((sum, e) => sum + e.annual_amount, 0))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-muted bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">Flexible</Badge>
                        Discretionary Expenses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {discretionaryExpenses.length > 0 ? (
                        discretionaryExpenses.map(expense => (
                          <div key={expense.id} className="flex justify-between text-sm">
                            <span>{expense.contribution_name}</span>
                            <span className="font-mono">{formatCurrency(expense.annual_amount)}/yr</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground">No discretionary expenses added</p>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold text-sm">
                        <span>Total</span>
                        <span className="font-mono">
                          {formatCurrency(discretionaryExpenses.reduce((sum, e) => sum + e.annual_amount, 0))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Budget Alert */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Budget Insight</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Essential expenses should be covered by guaranteed income (Social Security, pensions). 
                        Discretionary expenses can be adjusted if markets underperform.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Category Cards */}
        <CategoryCard
          title="Medicare Planning"
          subtitle="Medicare premiums and IRMAA surcharges"
          icon={<Heart className="h-5 w-5" />}
          onStart={() => navigate('/scenarios')}
          startLabel="Plan"
        />
        <CategoryCard
          title="Long-term Care"
          subtitle="Nursing home and assisted living costs"
          icon={<Stethoscope className="h-5 w-5" />}
          onStart={() => setAddExpenseOpen(true)}
          startLabel="Add"
        />
        <CategoryCard
          title="Living Expenses"
          subtitle="Housing, utilities, daily costs"
          icon={<Home className="h-5 w-5" />}
          onStart={() => setAddExpenseOpen(true)}
          startLabel="Add"
        />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
