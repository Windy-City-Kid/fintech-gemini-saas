import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  ArrowRightLeft,
  DollarSign,
  Info,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { ExcessIncomeSettings } from '@/lib/cashFlowEngine';

interface CashFlowCommandCenterProps {
  // Monthly cash flow inputs
  monthlyIncome: number;
  monthlySavings: number;
  monthlyExpenses: number;
  monthlyTaxes: number;
  monthlyDebt: number;
  monthlyMedical: number;
  
  // Excess settings
  excessSettings: ExcessIncomeSettings;
  onExcessSettingsChange: (settings: ExcessIncomeSettings) => void;
  
  // Calculated values
  currentSurplus: number;
  currentGap: number;
  
  // Account options
  accountOptions?: { value: string; label: string }[];
}

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const DEFAULT_ACCOUNTS = [
  { value: 'brokerage', label: 'Taxable Brokerage' },
  { value: 'cash', label: 'Cash/Savings (0% growth)' },
  { value: '401k', label: '401(k)' },
  { value: 'ira', label: 'Traditional IRA' },
  { value: 'roth', label: 'Roth IRA' },
  { value: 'hsa', label: 'HSA' },
];

export function CashFlowCommandCenter({
  monthlyIncome,
  monthlySavings,
  monthlyExpenses,
  monthlyTaxes,
  monthlyDebt,
  monthlyMedical,
  excessSettings,
  onExcessSettingsChange,
  currentSurplus,
  currentGap,
  accountOptions = DEFAULT_ACCOUNTS,
}: CashFlowCommandCenterProps) {
  // Calculate the cash flow formula
  const totalOutflows = monthlySavings + monthlyExpenses + monthlyTaxes + monthlyDebt + monthlyMedical;
  const netCashFlow = monthlyIncome - totalOutflows;
  const isSurplus = netCashFlow >= 0;
  
  // Calculate saved vs spent amounts
  const savedAmount = isSurplus && excessSettings.enabled 
    ? netCashFlow * (excessSettings.savePercentage / 100) 
    : 0;
  const spentAmount = isSurplus 
    ? (excessSettings.enabled ? netCashFlow - savedAmount : netCashFlow)
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Cash Flow Command Center
        </CardTitle>
        <CardDescription>
          Monthly order of operations and excess income settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* The Formula Display */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Monthly Cash Flow Formula</span>
          </div>
          
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Income</span>
              <span className="font-mono text-emerald-500">+{formatCurrency(monthlyIncome)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Planned Savings</span>
              <span className="font-mono text-blue-500">-{formatCurrency(monthlySavings)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expenses</span>
              <span className="font-mono text-orange-500">-{formatCurrency(monthlyExpenses)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxes</span>
              <span className="font-mono text-red-500">-{formatCurrency(monthlyTaxes)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Debt Payments</span>
              <span className="font-mono text-rose-500">-{formatCurrency(monthlyDebt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Medical/Healthcare</span>
              <span className="font-mono text-purple-500">-{formatCurrency(monthlyMedical)}</span>
            </div>
          </div>
          
          <div className="border-t border-border pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Net Cash Flow</span>
              <div className="flex items-center gap-2">
                {isSurplus ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Surplus
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Gap
                  </Badge>
                )}
                <span className={`text-xl font-bold font-mono ${isSurplus ? 'text-emerald-500' : 'text-red-500'}`}>
                  {isSurplus ? '+' : ''}{formatCurrency(netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Surplus Logic - Only show if surplus */}
        {isSurplus && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-500" />
                <Label className="text-base font-medium">Excess Income Settings</Label>
              </div>
              <Switch
                checked={excessSettings.enabled}
                onCheckedChange={(checked) => 
                  onExcessSettingsChange({ ...excessSettings, enabled: checked })
                }
              />
            </div>
            
            {excessSettings.enabled && (
              <div className="space-y-4 pl-7">
                {/* Save Percentage */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Save Percentage</Label>
                    <span className="text-lg font-bold text-primary">{excessSettings.savePercentage}%</span>
                  </div>
                  <Slider
                    value={[excessSettings.savePercentage]}
                    onValueChange={([value]) => 
                      onExcessSettingsChange({ ...excessSettings, savePercentage: value })
                    }
                    min={0}
                    max={100}
                    step={5}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Spend All</span>
                    <span>Save All</span>
                  </div>
                </div>
                
                {/* Target Account */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Designated Savings Account</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            Choose where excess income should be deposited. 
                            Cash accounts default to 0% growth.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select 
                    value={excessSettings.targetAccount} 
                    onValueChange={(value) => 
                      onExcessSettingsChange({ ...excessSettings, targetAccount: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accountOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Allocation Preview */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Monthly Saved</p>
                    <p className="text-lg font-bold font-mono text-emerald-500">
                      {formatCurrency(savedAmount)}
                    </p>
                    <p className="text-xs text-emerald-600">
                      → {accountOptions.find(a => a.value === excessSettings.targetAccount)?.label || 'Brokerage'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Extra Lifestyle</p>
                    <p className="text-lg font-bold font-mono text-amber-600">
                      {formatCurrency(spentAmount)}
                    </p>
                    <p className="text-xs text-amber-600">
                      Added to expenses
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {!excessSettings.enabled && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 ml-7">
                <p className="text-sm text-amber-700">
                  <strong>All surplus ({formatCurrency(netCashFlow)}/mo)</strong> will be treated as 
                  additional lifestyle spending and added to total expenses.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Gap Logic - Only show if gap */}
        {!isSurplus && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <Label className="text-base font-medium">Shortfall Withdrawal Engine</Label>
            </div>
            
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 ml-7 space-y-3">
              <p className="text-sm text-red-700">
                <strong>Monthly gap of {formatCurrency(Math.abs(netCashFlow))}</strong> will be 
                funded from your savings using the tax-efficient withdrawal order:
              </p>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-[10px]">1</span>
                  <span>Taxable Brokerage</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-[10px]">2</span>
                  <span>Pre-tax (401k, IRA)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold text-[10px]">3</span>
                  <span>Roth Accounts</span>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                If all savings are exhausted, the remaining gap becomes "Lifetime Debt."
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
