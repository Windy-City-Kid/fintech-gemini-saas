/**
 * Probabilistic Estate Report
 * Shows Monte Carlo simulation results for estate planning
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';
import { formatEstateCurrency } from '@/lib/estateCalculator';

interface PercentileData {
  p10: number;
  p50: number;
  p90: number;
}

interface ProbabilisticEstateReportProps {
  estatePercentiles: PercentileData | null;
  legacyGoal: number;
  isLoading?: boolean;
}

export function ProbabilisticEstateReport({
  estatePercentiles,
  legacyGoal,
  isLoading = false,
}: ProbabilisticEstateReportProps) {
  // Calculate probability of exceeding legacy goal
  const legacyProbability = useMemo(() => {
    if (!estatePercentiles || legacyGoal <= 0) return null;
    
    const { p10, p50, p90 } = estatePercentiles;
    
    // Linear interpolation to estimate probability
    if (legacyGoal <= p10) {
      // Goal is below 10th percentile, >90% chance
      return 95;
    } else if (legacyGoal <= p50) {
      // Between 10th and 50th percentile
      const ratio = (legacyGoal - p10) / (p50 - p10);
      return Math.round(90 - (ratio * 40)); // 90% down to 50%
    } else if (legacyGoal <= p90) {
      // Between 50th and 90th percentile
      const ratio = (legacyGoal - p50) / (p90 - p50);
      return Math.round(50 - (ratio * 40)); // 50% down to 10%
    } else {
      // Goal exceeds 90th percentile
      return 5;
    }
  }, [estatePercentiles, legacyGoal]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Activity className="h-8 w-8 mx-auto mb-2 animate-pulse text-primary" />
          <p className="text-muted-foreground">Running Monte Carlo simulation...</p>
        </CardContent>
      </Card>
    );
  }

  if (!estatePercentiles) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Run a simulation to see probabilistic estate projections
        </CardContent>
      </Card>
    );
  }

  const { p10, p50, p90 } = estatePercentiles;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-chart-2/10 border-b border-border">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Probabilistic Estate Report
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Legacy Goal Headline */}
        {legacyGoal > 0 && legacyProbability !== null && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Legacy Goal Probability</span>
            </div>
            <p className="text-3xl font-bold text-primary mb-2">
              {legacyProbability}% Chance
            </p>
            <p className="text-sm text-muted-foreground">
              Your heirs have a <span className="font-semibold">{legacyProbability}%</span> chance 
              of receiving a legacy greater than your <span className="font-mono">{formatEstateCurrency(legacyGoal)}</span> target
            </p>
          </div>
        )}

        {/* Percentile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 10th Percentile - Conservative */}
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Pessimistic (10th %ile)</span>
            </div>
            <p className="text-2xl font-bold">{formatEstateCurrency(p10)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              90% chance of exceeding this amount
            </p>
          </div>

          {/* 50th Percentile - Median */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Median (50th %ile)</span>
            </div>
            <p className="text-2xl font-bold text-primary">{formatEstateCurrency(p50)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Most likely outcome
            </p>
            {legacyGoal > 0 && (
              <Badge 
                variant={p50 >= legacyGoal ? 'default' : 'destructive'} 
                className="mt-2"
              >
                {p50 >= legacyGoal ? '✓ Exceeds Goal' : '⚠ Below Goal'}
              </Badge>
            )}
          </div>

          {/* 90th Percentile - Optimistic */}
          <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-chart-2" />
              <span className="text-sm font-medium">Optimistic (90th %ile)</span>
            </div>
            <p className="text-2xl font-bold text-chart-2">{formatEstateCurrency(p90)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              10% chance of exceeding this amount
            </p>
          </div>
        </div>

        {/* Spread Indicator */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Estate Value Spread</span>
            <span className="font-mono font-medium">
              {formatEstateCurrency(p10)} – {formatEstateCurrency(p90)}
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-destructive via-primary to-chart-2"
              style={{ width: '100%' }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Conservative</span>
            <span>Median</span>
            <span>Optimistic</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
