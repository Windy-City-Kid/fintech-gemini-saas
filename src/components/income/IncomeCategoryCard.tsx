import { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { IncomeCategory, IncomeSource } from '@/hooks/useIncomeSources';
import { Briefcase, Shield, Building, LineChart, Wallet, Gift, Calculator } from 'lucide-react';

const CATEGORY_CONFIG: Record<IncomeCategory, { 
  icon: React.ReactNode; 
  label: string; 
  description: string;
  color: string;
}> = {
  work: {
    icon: <Briefcase className="h-5 w-5" />,
    label: 'Work Income',
    description: 'Salary, wages, consulting, and self-employment',
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  },
  social_security: {
    icon: <Shield className="h-5 w-5" />,
    label: 'Social Security',
    description: 'Retirement, spouse, and survivor benefits',
    color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  },
  pension: {
    icon: <Building className="h-5 w-5" />,
    label: 'Pensions',
    description: 'Monthly, lump sum, and cash balance plans',
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  },
  annuity: {
    icon: <LineChart className="h-5 w-5" />,
    label: 'Annuities',
    description: 'Fixed, variable, and indexed annuities',
    color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  },
  passive: {
    icon: <Wallet className="h-5 w-5" />,
    label: 'Passive Income',
    description: 'Rental, dividends, interest, and royalties',
    color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20',
  },
  windfall: {
    icon: <Gift className="h-5 w-5" />,
    label: 'Windfalls',
    description: 'Inheritance, bonuses, and one-time events',
    color: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
  },
  rmd: {
    icon: <Calculator className="h-5 w-5" />,
    label: 'Required Minimum Distributions',
    description: 'Auto-calculated based on IRS rules',
    color: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  },
};

interface IncomeCategoryCardProps {
  category: IncomeCategory;
  sources: IncomeSource[];
  onAdd: () => void;
  onEdit: (source: IncomeSource) => void;
  onDelete: (id: string) => void;
  isRMD?: boolean;
  rmdAmount?: number;
}

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(amount);

const formatDate = (month: number | null, year: number | null, milestone: string | null) => {
  if (milestone) {
    const milestoneLabels: Record<string, string> = {
      retirement: 'At Retirement',
      death: 'Lifetime',
      age_62: 'Age 62',
      age_65: 'Age 65',
      age_70: 'Age 70',
      age_75: 'Age 75',
    };
    return milestoneLabels[milestone] || milestone;
  }
  if (!year) return 'Not set';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return month ? `${months[month - 1]} ${year}` : year.toString();
};

export function IncomeCategoryCard({
  category,
  sources,
  onAdd,
  onEdit,
  onDelete,
  isRMD = false,
  rmdAmount = 0,
}: IncomeCategoryCardProps) {
  const [isOpen, setIsOpen] = useState(sources.length > 0 || isRMD);
  const config = CATEGORY_CONFIG[category];
  
  const totalAnnual = isRMD 
    ? rmdAmount 
    : sources.reduce((sum, s) => {
        const annual = s.frequency === 'monthly' ? s.amount * 12 : s.amount;
        return sum + annual;
      }, 0);

  return (
    <Card className={`border ${config.color.split(' ').slice(2).join(' ')}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color.split(' ').slice(1, 3).join(' ')}`}>
                  {config.icon}
                </div>
                <div>
                  <CardTitle className="text-base">{config.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className={`text-lg font-bold font-mono ${config.color.split(' ')[0]}`}>
                    {formatCurrency(totalAnnual)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isRMD ? 'estimated' : `${sources.length} source${sources.length !== 1 ? 's' : ''}`}/yr
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {isRMD ? (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium">Auto-Calculated</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  RMDs are automatically calculated based on your IRA and 401(k) balances 
                  using the IRS Uniform Lifetime Table. They begin at age 73 or 75 depending 
                  on your birth year (SECURE Act 2.0).
                </p>
              </div>
            ) : (
              <>
                {sources.map(source => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{source.name}</span>
                        {source.subcategory && (
                          <Badge variant="outline" className="text-xs">
                            {source.subcategory}
                          </Badge>
                        )}
                        {!source.is_taxable && (
                          <Badge variant="secondary" className="text-xs">
                            Tax-free
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(source.start_month, source.start_year, source.start_milestone)}
                        {' → '}
                        {formatDate(source.end_month, source.end_year, source.end_milestone)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-mono font-medium">
                          {formatCurrency(source.frequency === 'monthly' ? source.amount * 12 : source.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {source.frequency === 'monthly' ? `${formatCurrency(source.amount)}/mo` : '/yr'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onEdit(source)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => onDelete(source.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  className="w-full border-dashed"
                  onClick={onAdd}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add {config.label}
                </Button>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
