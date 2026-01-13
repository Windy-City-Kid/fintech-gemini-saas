import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { useIncomeSources, IncomeCategory, IncomeSource, IncomeSourceInsert } from '@/hooks/useIncomeSources';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { IncomeCategoryCard } from '@/components/income/IncomeCategoryCard';
import { IncomeSourceForm } from '@/components/income/IncomeSourceForm';
import { LifetimeIncomeChart } from '@/components/income/LifetimeIncomeChart';
import { CashFlowGapChart } from '@/components/income/CashFlowGapChart';
import { ExcessIncomeSettings } from '@/components/income/ExcessIncomeSettings';
import { projectRMDs, getRMDStartAge } from '@/lib/rmdCalculator';

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const CATEGORIES: IncomeCategory[] = ['work', 'social_security', 'pension', 'annuity', 'passive', 'windfall'];

export default function Income() {
  const { sources, loading, addSource, updateSource, deleteSource, getTotalAnnualIncome } = useIncomeSources();
  const navigate = useNavigate();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory>('work');
  
  // Mock data - in production, fetch from profiles/scenarios
  const currentAge = 45;
  const retirementAge = 65;
  const birthYear = 1980;
  const iraBalance = 250000;
  const balance401k = 500000;
  const annualExpenses = 60000;
  const annualDebt = 12000;
  const estimatedTaxes = 15000;
  
  const [excessSettings, setExcessSettings] = useState({
    enabled: true,
    savePercentage: 50,
    targetAccount: 'brokerage',
  });

  const totalIncome = getTotalAnnualIncome();
  const rmdStartInfo = getRMDStartAge(birthYear);
  
  const rmdProjections = useMemo(() => {
    const projections = projectRMDs(currentAge, birthYear, iraBalance, balance401k, 0.06, 0.025, 100);
    return projections.map(p => ({ age: p.age, amount: p.rmdAmount }));
  }, [currentAge, birthYear, iraBalance, balance401k]);

  const estimatedAnnualExcess = totalIncome - annualExpenses - annualDebt - estimatedTaxes;

  const handleAdd = (category: IncomeCategory) => {
    setSelectedCategory(category);
    setEditingSource(null);
    setFormOpen(true);
  };

  const handleEdit = (source: IncomeSource) => {
    setEditingSource(source);
    setSelectedCategory(source.category);
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSource(id);
      toast.success('Income source deleted');
    } catch (error) {
      toast.error('Failed to delete income source');
    }
  };

  const handleSubmit = async (data: IncomeSourceInsert) => {
    try {
      if (editingSource) {
        await updateSource(editingSource.id, data);
        toast.success('Income source updated');
      } else {
        await addSource(data);
        toast.success('Income source added');
      }
    } catch (error) {
      toast.error('Failed to save income source');
      throw error;
    }
  };

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Income"
        description="Track all sources of income throughout your lifetime"
        previousPage={{ label: 'Debts', path: '/debts' }}
        nextPage={{ label: 'Expenses and Healthcare', path: '/expenses' }}
        onManageConnections={() => navigate('/connections')}
      >
        {/* Summary Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Total Annual Income</p>
                <p className="text-3xl font-bold font-mono">{loading ? '...' : formatCurrency(totalIncome)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Income Sources</p>
                <p className="text-2xl font-bold">{sources.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">RMD Start Age</p>
                <p className="text-2xl font-bold">{rmdStartInfo.age}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="sources" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sources">Income Sources</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
          </TabsList>

          <TabsContent value="sources" className="space-y-4">
            {CATEGORIES.map(category => (
              <IncomeCategoryCard
                key={category}
                category={category}
                sources={sources.filter(s => s.category === category)}
                onAdd={() => handleAdd(category)}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
            
            {/* RMD Card - Auto-calculated */}
            <IncomeCategoryCard
              category="rmd"
              sources={[]}
              onAdd={() => {}}
              onEdit={() => {}}
              onDelete={() => {}}
              isRMD
              rmdAmount={rmdProjections.find(r => r.age === rmdStartInfo.age)?.amount || 0}
            />
          </TabsContent>

          <TabsContent value="projections" className="space-y-6">
            <LifetimeIncomeChart
              sources={sources}
              currentAge={currentAge}
              retirementAge={retirementAge}
              annualExpenses={annualExpenses}
              annualDebt={annualDebt}
              estimatedTaxes={estimatedTaxes}
              rmdProjections={rmdProjections}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CashFlowGapChart
                sources={sources}
                currentAge={currentAge}
                retirementAge={retirementAge}
                annualExpenses={annualExpenses}
                annualDebt={annualDebt}
                estimatedTaxes={estimatedTaxes}
                rmdProjections={rmdProjections}
              />
              
              <ExcessIncomeSettings
                enabled={excessSettings.enabled}
                savePercentage={excessSettings.savePercentage}
                targetAccount={excessSettings.targetAccount}
                estimatedAnnualExcess={estimatedAnnualExcess}
                onSettingsChange={setExcessSettings}
              />
            </div>
          </TabsContent>
        </Tabs>

        <IncomeSourceForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleSubmit}
          initialData={editingSource || undefined}
          defaultCategory={selectedCategory}
          retirementYear={new Date().getFullYear() + (retirementAge - currentAge)}
          birthYear={birthYear}
        />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
