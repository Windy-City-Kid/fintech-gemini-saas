/**
 * Bucket Status Chart
 * Shows the "fullness" of each bucket compared to target years of coverage
 * Underfunded buckets are highlighted in yellow/warning color
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BucketState, BUCKET_CONFIGS } from '@/lib/bucketEngine';

interface BucketStatusChartProps {
  buckets: BucketState[];
  totalPortfolioValue: number;
  annualExpenses: number;
}

export function BucketStatusChart({ 
  buckets, 
  totalPortfolioValue, 
  annualExpenses 
}: BucketStatusChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const bucketConfigs = useMemo(() => {
    return buckets.map(bucket => {
      const config = BUCKET_CONFIGS.find(c => c.id === bucket.bucket)!;
      return { ...bucket, config };
    });
  }, [buckets]);

  const totalYearsCovered = useMemo(() => {
    return buckets.reduce((sum, b) => {
      return sum + (annualExpenses > 0 ? b.currentValue / annualExpenses : 0);
    }, 0);
  }, [buckets, annualExpenses]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Bucket Status
            </CardTitle>
            <CardDescription>
              Coverage: {totalYearsCovered.toFixed(1)} years of expenses funded
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-sm">
            Total: {formatCurrency(totalPortfolioValue)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {bucketConfigs.map(({ bucket, currentValue, targetValue, percentFull, ytdReturn, isUnderfunded, targetYears, config }) => (
          <div key={bucket} className="space-y-2">
            {/* Bucket Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: config.color }}
                />
                <span className="font-medium">{config.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({config.description})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* YTD Return Badge */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs",
                        ytdReturn > 0 ? "text-success border-success/50" : "text-destructive border-destructive/50"
                      )}
                    >
                      {ytdReturn > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                      {ytdReturn > 0 ? '+' : ''}{ytdReturn.toFixed(1)}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Year-to-date return
                  </TooltipContent>
                </Tooltip>

                {/* Status Icon */}
                {isUnderfunded ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertTriangle className="h-4 w-4 text-warning animate-pulse" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Underfunded - below 80% of target
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative">
              <Progress 
                value={Math.min(percentFull, 100)} 
                className={cn(
                  "h-6",
                  isUnderfunded && "[&>div]:bg-warning"
                )}
              />
              {/* Overflow indicator if > 100% */}
              {percentFull > 100 && (
                <div 
                  className="absolute top-0 right-0 h-6 bg-success/30 rounded-r-full border-l-2 border-success"
                  style={{ width: `${Math.min((percentFull - 100), 50)}%` }}
                />
              )}
              {/* Percentage label inside bar */}
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-foreground/80">
                {percentFull.toFixed(0)}% ({(currentValue / annualExpenses).toFixed(1)} years)
              </span>
            </div>

            {/* Values */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Current: {formatCurrency(currentValue)}</span>
              <span>Target: {formatCurrency(targetValue)} ({targetYears} years)</span>
            </div>

            {/* Asset Types */}
            <div className="flex flex-wrap gap-1">
              {config.assetTypes.slice(0, 3).map(assetType => (
                <Badge key={assetType} variant="secondary" className="text-xs">
                  {assetType}
                </Badge>
              ))}
              {config.assetTypes.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{config.assetTypes.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>Fully Funded</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Underfunded (&lt;80%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary/50" />
              <span>Overfunded (&gt;100%)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
