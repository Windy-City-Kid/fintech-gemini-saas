/**
 * Bucket Refill Waterfall Visual
 * Shows the automated refill logic based on market conditions
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Droplets, 
  TrendingUp, 
  TrendingDown, 
  Shield, 
  AlertTriangle,
  ArrowDown,
  CheckCircle,
} from 'lucide-react';
import { BucketRefillStatus } from '@/lib/rebalanceAuditEngine';

interface BucketRefillWaterfallProps {
  refillStatus: BucketRefillStatus;
  marketCondition: {
    sp500YtdReturn: number;
    bondIndexYtdReturn: number;
  };
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function BucketRefillWaterfall({
  refillStatus,
  marketCondition,
}: BucketRefillWaterfallProps) {
  const isMarketUp = marketCondition.sp500YtdReturn > 0;
  const isBondUp = marketCondition.bondIndexYtdReturn > 0;

  const getConditionStyle = (condition: 'A' | 'B' | 'C') => {
    switch (condition) {
      case 'A':
        return { bg: 'bg-chart-2/10', border: 'border-chart-2/30', text: 'text-chart-2' };
      case 'B':
        return { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' };
      case 'C':
        return { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' };
    }
  };

  const conditionStyle = getConditionStyle(refillStatus.condition);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          Bucket Refill Waterfall
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Market Conditions */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border ${isMarketUp ? 'bg-chart-2/10 border-chart-2/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <div className="flex items-center gap-2">
              {isMarketUp ? (
                <TrendingUp className="h-5 w-5 text-chart-2" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">S&P 500 YTD</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${isMarketUp ? 'text-chart-2' : 'text-destructive'}`}>
              {marketCondition.sp500YtdReturn > 0 ? '+' : ''}{marketCondition.sp500YtdReturn.toFixed(1)}%
            </p>
          </div>
          <div className={`p-4 rounded-lg border ${isBondUp ? 'bg-chart-2/10 border-chart-2/30' : 'bg-destructive/10 border-destructive/30'}`}>
            <div className="flex items-center gap-2">
              {isBondUp ? (
                <TrendingUp className="h-5 w-5 text-chart-2" />
              ) : (
                <TrendingDown className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">Bond Index YTD</span>
            </div>
            <p className={`text-2xl font-bold mt-1 ${isBondUp ? 'text-chart-2' : 'text-destructive'}`}>
              {marketCondition.bondIndexYtdReturn > 0 ? '+' : ''}{marketCondition.bondIndexYtdReturn.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Waterfall Logic Visual */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Refill Decision Logic
          </h4>

          {/* Condition A */}
          <div className={`p-3 rounded-lg border transition-all ${
            refillStatus.condition === 'A' ? 'bg-chart-2/10 border-chart-2 ring-2 ring-chart-2/20' : 'bg-muted/30 border-border opacity-60'
          }`}>
            <div className="flex items-center gap-2">
              {refillStatus.condition === 'A' ? (
                <CheckCircle className="h-5 w-5 text-chart-2" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
              )}
              <span className="font-medium">Condition A: Equities UP</span>
              <Badge variant={refillStatus.condition === 'A' ? 'default' : 'secondary'}>
                {isMarketUp ? 'TRUE' : 'FALSE'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Sell equity gains → Refill Cash Bucket
            </p>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Condition B */}
          <div className={`p-3 rounded-lg border transition-all ${
            refillStatus.condition === 'B' ? 'bg-primary/10 border-primary ring-2 ring-primary/20' : 'bg-muted/30 border-border opacity-60'
          }`}>
            <div className="flex items-center gap-2">
              {refillStatus.condition === 'B' ? (
                <CheckCircle className="h-5 w-5 text-primary" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
              )}
              <span className="font-medium">Condition B: Stocks DOWN, Bonds UP</span>
              <Badge variant={refillStatus.condition === 'B' ? 'default' : 'secondary'}>
                {!isMarketUp && isBondUp ? 'TRUE' : 'FALSE'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Sell bonds → Preserve equity positions
            </p>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* Condition C */}
          <div className={`p-3 rounded-lg border transition-all ${
            refillStatus.condition === 'C' ? 'bg-warning/10 border-warning ring-2 ring-warning/20' : 'bg-muted/30 border-border opacity-60'
          }`}>
            <div className="flex items-center gap-2">
              {refillStatus.condition === 'C' ? (
                <Shield className="h-5 w-5 text-warning" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
              )}
              <span className="font-medium">Condition C: BOTH DOWN</span>
              <Badge variant={refillStatus.condition === 'C' ? 'destructive' : 'secondary'}>
                {!isMarketUp && !isBondUp ? 'TRUE' : 'FALSE'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Suspend refills → Draw from cash reserve (Sequence Risk Protection)
            </p>
          </div>
        </div>

        {/* Current Status Alert */}
        <Alert className={`${conditionStyle.bg} ${conditionStyle.border}`}>
          {refillStatus.condition === 'C' ? (
            <AlertTriangle className={`h-4 w-4 ${conditionStyle.text}`} />
          ) : (
            <CheckCircle className={`h-4 w-4 ${conditionStyle.text}`} />
          )}
          <AlertTitle className={conditionStyle.text}>
            {refillStatus.action}
          </AlertTitle>
          <AlertDescription className="text-foreground/80">
            {refillStatus.notification}
          </AlertDescription>
        </Alert>

        {/* Refill Amount */}
        {refillStatus.canRefill && refillStatus.amount > 0 && (
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Recommended Refill</span>
              <span className="font-mono font-bold text-chart-2">
                {formatCurrency(refillStatus.amount)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Source: {refillStatus.sourceAsset} → Cash Bucket
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
