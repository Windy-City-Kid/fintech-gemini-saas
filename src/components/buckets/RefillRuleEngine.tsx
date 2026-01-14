/**
 * Refill Rule Engine Component
 * Displays the automated waterfall logic and allows manual execution
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowDown, 
  Shield, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RefillAction, RefillCondition, getConditionDescription } from '@/lib/bucketEngine';
import { RefillHistoryEntry } from '@/hooks/useBucketStrategy';

interface RefillRuleEngineProps {
  refillRecommendation: RefillAction;
  sequenceRiskProtected: boolean;
  onExecuteRefill: (sourceBucket: 'growth' | 'bonds', amount: number, condition: RefillCondition) => void;
  refillHistory: RefillHistoryEntry[];
  isLoading?: boolean;
}

export function RefillRuleEngine({
  refillRecommendation,
  sequenceRiskProtected,
  onExecuteRefill,
  refillHistory,
  isLoading,
}: RefillRuleEngineProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const conditionInfo = getConditionDescription(refillRecommendation.condition);

  const handleExecuteRefill = () => {
    if (refillRecommendation.sourceBucket && refillRecommendation.amount > 0) {
      onExecuteRefill(
        refillRecommendation.sourceBucket as 'growth' | 'bonds',
        refillRecommendation.amount,
        refillRecommendation.condition,
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Refill Rule Engine
        </CardTitle>
        <CardDescription>
          Automated waterfall logic to manage market volatility
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Market Condition */}
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Current Condition</span>
            <Badge 
              variant="outline" 
              className={cn(
                "font-mono",
                refillRecommendation.condition === 'A' && "bg-success/10 text-success border-success/50",
                refillRecommendation.condition === 'B' && "bg-primary/10 text-primary border-primary/50",
                refillRecommendation.condition === 'C' && "bg-warning/10 text-warning border-warning/50",
              )}
            >
              Condition {refillRecommendation.condition}: {conditionInfo.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{refillRecommendation.reason}</p>
        </div>

        {/* Sequence Risk Alert */}
        {sequenceRiskProtected && (
          <Alert variant="default" className="border-warning/50 bg-warning/5">
            <Shield className="h-4 w-4 text-warning" />
            <AlertTitle className="text-warning">Sequence Risk Protection Active</AlertTitle>
            <AlertDescription>
              Both growth and bond buckets are down. Drawing only from cash to avoid selling at a loss.
            </AlertDescription>
          </Alert>
        )}

        {/* Waterfall Rules Visualization */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Waterfall Rules</h4>
          
          <div className="space-y-2">
            {/* Condition A */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              refillRecommendation.condition === 'A' 
                ? "bg-success/10 border-success/50" 
                : "bg-muted/30 border-border"
            )}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/20">
                <TrendingUp className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Condition A: Growth is UP</p>
                <p className="text-xs text-muted-foreground">Sell gains from Bucket 3 → Refill Bucket 1</p>
              </div>
              {refillRecommendation.condition === 'A' && (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
            </div>

            <div className="flex justify-center">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Condition B */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              refillRecommendation.condition === 'B' 
                ? "bg-primary/10 border-primary/50" 
                : "bg-muted/30 border-border"
            )}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Condition B: Growth DOWN, Bonds UP</p>
                <p className="text-xs text-muted-foreground">Sell bonds from Bucket 2 → Refill Bucket 1</p>
              </div>
              {refillRecommendation.condition === 'B' && (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              )}
            </div>

            <div className="flex justify-center">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Condition C */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              refillRecommendation.condition === 'C' 
                ? "bg-warning/10 border-warning/50" 
                : "bg-muted/30 border-border"
            )}>
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/20">
                <Shield className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Condition C: BOTH DOWN</p>
                <p className="text-xs text-muted-foreground">Suspend refills → Draw only from Cash Bucket</p>
              </div>
              {refillRecommendation.condition === 'C' && (
                <AlertTriangle className="h-5 w-5 text-warning" />
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Execute Refill Action */}
        {refillRecommendation.canExecute && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium">Recommended Action</p>
                <p className="text-sm text-muted-foreground">
                  Transfer {formatCurrency(refillRecommendation.amount)} from {refillRecommendation.sourceBucket === 'growth' ? 'Growth' : 'Bonds'} to Cash
                </p>
              </div>
              <Button 
                onClick={handleExecuteRefill}
                disabled={isLoading}
                className="gap-2"
              >
                <Zap className="h-4 w-4" />
                Execute Refill
              </Button>
            </div>
          </div>
        )}

        {/* Refill History */}
        {refillHistory.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-3">Recent Refills</h4>
              <div className="space-y-2">
                {refillHistory.slice(0, 5).map(entry => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.condition_triggered}
                      </Badge>
                      <span className="text-muted-foreground">
                        {new Date(entry.refill_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        from {entry.source_bucket === 'bucket3' ? 'Growth' : 'Bonds'}
                      </span>
                      <span className="font-medium text-success">
                        +{formatCurrency(entry.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
