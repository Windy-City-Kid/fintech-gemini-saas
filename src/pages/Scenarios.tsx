import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Calculator, TrendingUp, Calendar, DollarSign, Percent, Save } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const [accounts, setAccounts] = useState<{ current_balance: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        const [scenarioRes, accountsRes] = await Promise.all([
          supabase.from('scenarios').select('*').eq('is_active', true).single(),
          supabase.from('accounts').select('current_balance'),
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

  // Calculate projection data
  const currentSavings = accounts.reduce((sum, acc) => sum + Number(acc.current_balance), 0);
  const yearsToRetirement = formValues.retirement_age - formValues.current_age;
  
  const projectionData = [];
  let balance = currentSavings;
  
  for (let year = 0; year <= yearsToRetirement + 30; year++) {
    const age = formValues.current_age + year;
    
    if (year <= yearsToRetirement) {
      // Accumulation phase
      balance = balance * (1 + formValues.expected_return) + formValues.annual_contribution;
    } else {
      // Withdrawal phase (adjusted for inflation)
      const inflationAdjustedSpending = formValues.monthly_retirement_spending * 12 * 
        Math.pow(1 + formValues.inflation_rate, year - yearsToRetirement);
      balance = balance * (1 + formValues.expected_return * 0.5) - inflationAdjustedSpending;
    }
    
    projectionData.push({
      age,
      balance: Math.max(0, balance),
      phase: year <= yearsToRetirement ? 'accumulation' : 'withdrawal',
    });
  }

  const retirementBalance = projectionData.find(d => d.age === formValues.retirement_age)?.balance || 0;
  const yearsOfRetirement = projectionData.filter(d => d.phase === 'withdrawal' && d.balance > 0).length;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Retirement Scenarios</h1>
        <p className="text-muted-foreground">Model your path to financial independence</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projection Chart */}
        <div className="lg:col-span-2 stat-card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Retirement Projection</h3>
              <p className="text-sm text-muted-foreground">Based on current assumptions</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold font-mono text-primary">
                {formatCurrency(retirementBalance)}
              </p>
              <p className="text-sm text-muted-foreground">at retirement</p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={projectionData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
                <XAxis 
                  dataKey="age" 
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis 
                  stroke="hsl(215, 20%, 55%)"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={formatCurrency}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 47%, 12%)',
                    border: '1px solid hsl(217, 33%, 20%)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Balance']}
                  labelFormatter={(age) => `Age ${age}`}
                />
                <ReferenceLine 
                  x={formValues.retirement_age} 
                  stroke="hsl(38, 92%, 50%)" 
                  strokeDasharray="5 5"
                  label={{ value: 'Retirement', fill: 'hsl(38, 92%, 50%)', fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="hsl(152, 76%, 45%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">{yearsToRetirement}</p>
              <p className="text-sm text-muted-foreground">Years to retirement</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono text-primary">{formatCurrency(retirementBalance)}</p>
              <p className="text-sm text-muted-foreground">Projected nest egg</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold font-mono">{yearsOfRetirement}+</p>
              <p className="text-sm text-muted-foreground">Years funded</p>
            </div>
          </div>
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
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label>Expected Return: {(formValues.expected_return * 100).toFixed(1)}%</Label>
              </div>
              <Slider
                value={[formValues.expected_return * 100]}
                onValueChange={(value) => setValue('expected_return', value[0] / 100)}
                min={3}
                max={12}
                step={0.5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <Label>Inflation Rate: {(formValues.inflation_rate * 100).toFixed(1)}%</Label>
              </div>
              <Slider
                value={[formValues.inflation_rate * 100]}
                onValueChange={(value) => setValue('inflation_rate', value[0] / 100)}
                min={1}
                max={6}
                step={0.25}
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

            <Button type="submit" className="w-full gap-2" disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Scenario'}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
