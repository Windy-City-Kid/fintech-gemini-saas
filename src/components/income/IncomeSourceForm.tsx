import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthYearPicker } from './MonthYearPicker';
import { IncomeCategory, IncomeSourceInsert } from '@/hooks/useIncomeSources';
import { Briefcase, Shield, Building, LineChart, Wallet, Gift, Calculator } from 'lucide-react';

const CATEGORY_CONFIG: Record<IncomeCategory, { icon: React.ReactNode; label: string; subcategories: string[] }> = {
  work: {
    icon: <Briefcase className="h-4 w-4" />,
    label: 'Work Income',
    subcategories: ['Full-time', 'Part-time', 'Consulting', 'Self-employed', 'Contract'],
  },
  social_security: {
    icon: <Shield className="h-4 w-4" />,
    label: 'Social Security',
    subcategories: ['Retirement', 'Spouse', 'Survivor', 'Disability'],
  },
  pension: {
    icon: <Building className="h-4 w-4" />,
    label: 'Pension',
    subcategories: ['Monthly', 'Lump Sum', 'Cash Balance'],
  },
  annuity: {
    icon: <LineChart className="h-4 w-4" />,
    label: 'Annuity',
    subcategories: ['Fixed', 'Variable', 'Indexed'],
  },
  passive: {
    icon: <Wallet className="h-4 w-4" />,
    label: 'Passive Income',
    subcategories: ['Rental', 'Dividend', 'Interest', 'Royalties', 'Business'],
  },
  windfall: {
    icon: <Gift className="h-4 w-4" />,
    label: 'Windfall',
    subcategories: ['Inheritance', 'Bonus', 'Asset Sale', 'Lottery', 'Other'],
  },
  rmd: {
    icon: <Calculator className="h-4 w-4" />,
    label: 'RMD (Auto-calculated)',
    subcategories: [],
  },
};

const START_MILESTONES = [
  { value: 'retirement', label: 'At Retirement' },
  { value: 'age_62', label: 'Age 62' },
  { value: 'age_65', label: 'Age 65' },
  { value: 'age_70', label: 'Age 70' },
];

const END_MILESTONES = [
  { value: 'retirement', label: 'At Retirement' },
  { value: 'death', label: 'Lifetime' },
  { value: 'age_70', label: 'Age 70' },
  { value: 'age_75', label: 'Age 75' },
];

interface IncomeSourceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: IncomeSourceInsert) => Promise<void>;
  initialData?: Partial<IncomeSourceInsert>;
  defaultCategory?: IncomeCategory;
  retirementYear?: number;
  birthYear?: number;
}

export function IncomeSourceForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  defaultCategory = 'work',
  retirementYear = 2035,
  birthYear = 1970,
}: IncomeSourceFormProps) {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<IncomeCategory>(initialData?.category || defaultCategory);
  const [startMonth, setStartMonth] = useState<number | null>(initialData?.start_month || null);
  const [startYear, setStartYear] = useState<number>(initialData?.start_year || new Date().getFullYear());
  const [endMonth, setEndMonth] = useState<number | null>(initialData?.end_month || null);
  const [endYear, setEndYear] = useState<number | null>(initialData?.end_year || null);
  const [startMilestone, setStartMilestone] = useState<string | null>(initialData?.start_milestone || null);
  const [endMilestone, setEndMilestone] = useState<string | null>(initialData?.end_milestone || 'death');
  const [frequency, setFrequency] = useState<'monthly' | 'annual' | 'one_time'>(
    (initialData?.frequency as 'monthly' | 'annual' | 'one_time') || 'annual'
  );
  const [inflationAdjusted, setInflationAdjusted] = useState(initialData?.inflation_adjusted || false);
  const [isTaxable, setIsTaxable] = useState(initialData?.is_taxable !== false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    setLoading(true);
    try {
      const data: IncomeSourceInsert = {
        category,
        subcategory: formData.get('subcategory') as string || null,
        name: formData.get('name') as string,
        description: formData.get('description') as string || null,
        amount: parseFloat(formData.get('amount') as string) || 0,
        frequency,
        start_month: startMonth,
        start_year: startYear,
        end_month: endMonth,
        end_year: endYear,
        start_milestone: startMilestone,
        end_milestone: endMilestone,
        pia_amount: category === 'social_security' ? parseFloat(formData.get('pia_amount') as string) || null : null,
        claiming_age: category === 'social_security' ? parseInt(formData.get('claiming_age') as string) || null : null,
        fra: 67,
        pension_type: category === 'pension' ? formData.get('pension_type') as string : null,
        cola_rate: parseFloat(formData.get('cola_rate') as string) || null,
        survivor_percentage: parseFloat(formData.get('survivor_percentage') as string) || null,
        annuity_type: category === 'annuity' ? formData.get('annuity_type') as string : null,
        guaranteed_period_years: parseInt(formData.get('guaranteed_period_years') as string) || null,
        windfall_type: category === 'windfall' ? formData.get('windfall_type') as string : null,
        expected_date: null,
        probability_percentage: parseFloat(formData.get('probability_percentage') as string) || 100,
        inflation_adjusted: inflationAdjusted,
        custom_inflation_rate: parseFloat(formData.get('custom_inflation_rate') as string) || null,
        is_taxable: isTaxable,
        tax_treatment: formData.get('tax_treatment') as string || 'ordinary',
        is_active: true,
      };

      await onSubmit(data);
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving income source:', error);
    } finally {
      setLoading(false);
    }
  };

  const config = CATEGORY_CONFIG[category];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            {initialData ? 'Edit' : 'Add'} {config.label}
          </DialogTitle>
          <DialogDescription>
            Configure your income source with start/end dates and tax treatment.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CATEGORY_CONFIG) as IncomeCategory[])
                .filter(c => c !== 'rmd')
                .map(c => (
                  <Button
                    key={c}
                    type="button"
                    variant={category === c ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategory(c)}
                    className="flex items-center gap-2"
                  >
                    {CATEGORY_CONFIG[c].icon}
                    {CATEGORY_CONFIG[c].label}
                  </Button>
                ))}
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                defaultValue={initialData?.name}
                placeholder={`e.g., ${category === 'work' ? 'Salary' : category === 'social_security' ? 'My SS Benefit' : 'Income'}`}
                required
              />
            </div>
            {config.subcategories.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="subcategory">Type</Label>
                <Select name="subcategory" defaultValue={initialData?.subcategory || config.subcategories[0]}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.subcategories.map(sub => (
                      <SelectItem key={sub} value={sub.toLowerCase().replace(' ', '_')}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Amount and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  defaultValue={initialData?.amount}
                  className="pl-7"
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-4">
            <MonthYearPicker
              label="Start Date"
              month={startMonth}
              year={startYear}
              onSelect={(m, y) => { setStartMonth(m); setStartYear(y); }}
              milestoneOptions={START_MILESTONES}
              selectedMilestone={startMilestone}
              onMilestoneSelect={setStartMilestone}
              placeholder="When does it start?"
            />
            <MonthYearPicker
              label="End Date"
              month={endMonth}
              year={endYear}
              onSelect={(m, y) => { setEndMonth(m); setEndYear(y); }}
              milestoneOptions={END_MILESTONES}
              selectedMilestone={endMilestone}
              onMilestoneSelect={setEndMilestone}
              placeholder="When does it end?"
            />
          </div>

          {/* Category-specific fields */}
          {category === 'social_security' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="pia_amount">PIA (Primary Insurance Amount)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="pia_amount"
                    name="pia_amount"
                    type="number"
                    className="pl-7"
                    placeholder="Monthly benefit at FRA"
                    defaultValue={initialData?.pia_amount || undefined}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="claiming_age">Claiming Age</Label>
                <Select name="claiming_age" defaultValue={initialData?.claiming_age?.toString() || '67'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[62, 63, 64, 65, 66, 67, 68, 69, 70].map(age => (
                      <SelectItem key={age} value={age.toString()}>
                        Age {age} {age === 67 && '(FRA)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {category === 'pension' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="pension_type">Pension Type</Label>
                <Select name="pension_type" defaultValue={initialData?.pension_type || 'monthly'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly Payment</SelectItem>
                    <SelectItem value="lump_sum">Lump Sum</SelectItem>
                    <SelectItem value="cash_balance">Cash Balance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cola_rate">Annual COLA (%)</Label>
                <Input
                  id="cola_rate"
                  name="cola_rate"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 2.0"
                  defaultValue={initialData?.cola_rate || undefined}
                />
              </div>
            </div>
          )}

          {category === 'windfall' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="windfall_type">Windfall Type</Label>
                <Select name="windfall_type" defaultValue={initialData?.windfall_type || 'inheritance'}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inheritance">Inheritance</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="sale">Asset Sale</SelectItem>
                    <SelectItem value="lottery">Lottery/Prize</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="probability_percentage">Probability (%)</Label>
                <Input
                  id="probability_percentage"
                  name="probability_percentage"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={initialData?.probability_percentage || 100}
                />
              </div>
            </div>
          )}

          {/* Tax & Inflation Settings */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="taxable"
                  checked={isTaxable}
                  onCheckedChange={setIsTaxable}
                />
                <Label htmlFor="taxable">Taxable Income</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="inflation"
                  checked={inflationAdjusted}
                  onCheckedChange={setInflationAdjusted}
                />
                <Label htmlFor="inflation">Inflation Adjusted</Label>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Add any notes about this income source..."
              defaultValue={initialData?.description || ''}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Income'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
