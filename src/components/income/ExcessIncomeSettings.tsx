import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PiggyBank, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ExcessIncomeSettingsProps {
  enabled: boolean;
  savePercentage: number;
  targetAccount: string;
  estimatedAnnualExcess: number;
  onSettingsChange: (settings: {
    enabled: boolean;
    savePercentage: number;
    targetAccount: string;
  }) => void;
}

const TARGET_ACCOUNTS = [
  { value: 'brokerage', label: 'Taxable Brokerage' },
  { value: '401k', label: '401(k)' },
  { value: 'ira', label: 'Traditional IRA' },
  { value: 'roth', label: 'Roth IRA' },
  { value: 'hsa', label: 'HSA' },
  { value: 'savings', label: 'High-Yield Savings' },
];

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(amount);

export function ExcessIncomeSettings({
  enabled,
  savePercentage,
  targetAccount,
  estimatedAnnualExcess,
  onSettingsChange,
}: ExcessIncomeSettingsProps) {
  const estimatedSavings = enabled ? (estimatedAnnualExcess * savePercentage / 100) : 0;
  const estimatedSpent = enabled ? (estimatedAnnualExcess - estimatedSavings) : estimatedAnnualExcess;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Excess Income Handling</CardTitle>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => 
              onSettingsChange({ enabled: checked, savePercentage, targetAccount })
            }
          />
        </div>
        <CardDescription>
          Choose what happens when your income exceeds expenses
        </CardDescription>
      </CardHeader>
      
      <CardContent className={`space-y-6 ${!enabled && 'opacity-50 pointer-events-none'}`}>
        {/* Estimated Excess Display */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-muted-foreground">Estimated Annual Excess</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Based on your current income sources minus projected expenses and taxes
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-500">
            {formatCurrency(Math.max(0, estimatedAnnualExcess))}
          </p>
        </div>

        {/* Save Percentage Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Save Percentage</Label>
            <span className="text-lg font-bold text-primary">{savePercentage}%</span>
          </div>
          <Slider
            value={[savePercentage]}
            onValueChange={([value]) => 
              onSettingsChange({ enabled, savePercentage: value, targetAccount })
            }
            min={0}
            max={100}
            step={5}
            disabled={!enabled}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Spend all</span>
            <span>Save 50%</span>
            <span>Save all</span>
          </div>
        </div>

        {/* Target Account */}
        <div className="space-y-2">
          <Label>Target Savings Account</Label>
          <Select 
            value={targetAccount} 
            onValueChange={(value) => 
              onSettingsChange({ enabled, savePercentage, targetAccount: value })
            }
            disabled={!enabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {TARGET_ACCOUNTS.map(account => (
                <SelectItem key={account.value} value={account.value}>
                  {account.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Allocation Preview */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="p-3 bg-emerald-500/10 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Annual Savings</p>
            <p className="text-lg font-bold font-mono text-emerald-500">
              {formatCurrency(estimatedSavings)}
            </p>
            <p className="text-xs text-muted-foreground">
              → {TARGET_ACCOUNTS.find(a => a.value === targetAccount)?.label}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Discretionary Spend</p>
            <p className="text-lg font-bold font-mono">
              {formatCurrency(estimatedSpent)}
            </p>
            <p className="text-xs text-muted-foreground">
              Additional lifestyle
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
