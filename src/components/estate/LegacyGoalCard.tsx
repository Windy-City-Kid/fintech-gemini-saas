/**
 * Legacy Goal Card Component
 * Allows users to set and track their legacy goal with success indicator
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Target, AlertTriangle, CheckCircle2, TrendingDown } from 'lucide-react';
import { formatEstateCurrency, checkLegacyGoalStatus } from '@/lib/estateCalculator';

interface LegacyGoalCardProps {
  currentGoal: number;
  projectedEstateValue: number;
  onSaveGoal: (amount: number) => void;
  isSaving?: boolean;
}

export function LegacyGoalCard({
  currentGoal,
  projectedEstateValue,
  onSaveGoal,
  isSaving = false,
}: LegacyGoalCardProps) {
  const [inputValue, setInputValue] = useState(currentGoal > 0 ? currentGoal.toString() : '');
  
  const hasGoal = currentGoal > 0;
  const status = hasGoal ? checkLegacyGoalStatus(projectedEstateValue, currentGoal) : null;

  const handleSave = () => {
    const amount = parseFloat(inputValue) || 0;
    onSaveGoal(amount);
  };

  return (
    <Card className={`overflow-hidden ${status?.isAtRisk ? 'border-destructive/50' : ''}`}>
      <CardHeader className="bg-gradient-to-r from-chart-3/10 to-chart-3/5 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-chart-3" />
            Legacy Goal
          </CardTitle>
          {hasGoal && (
            <Badge 
              variant={status?.isAtRisk ? 'destructive' : 'default'}
              className="gap-1"
            >
              {status?.isAtRisk ? (
                <>
                  <AlertTriangle className="h-3 w-3" />
                  At Risk
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  On Track
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Set a target amount you want to leave to your heirs. We'll track your progress and alert you if your plan falls short.
        </p>

        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="legacyGoal">Target Amount</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="legacyGoal"
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="e.g., 1,000,000"
                className="pl-7"
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {hasGoal && projectedEstateValue > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your Goal</span>
              <span className="font-mono font-medium">{formatEstateCurrency(currentGoal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Projected Estate</span>
              <span className="font-mono font-medium">{formatEstateCurrency(projectedEstateValue)}</span>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                  status?.isAtRisk ? 'bg-destructive' : 'bg-chart-2'
                }`}
                style={{ 
                  width: `${Math.min(100, (projectedEstateValue / currentGoal) * 100)}%` 
                }}
              />
            </div>

            {/* Status Message */}
            <div className={`p-3 rounded-lg ${
              status?.isAtRisk 
                ? 'bg-destructive/10 border border-destructive/20' 
                : 'bg-chart-2/10 border border-chart-2/20'
            }`}>
              {status?.isAtRisk ? (
                <div className="flex items-start gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">Legacy Goal at Risk</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Your projected estate is {formatEstateCurrency(status.shortfall)} below your goal. 
                      Consider adjusting your savings rate or retirement spending.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-chart-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-chart-2">On Track</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {status?.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
