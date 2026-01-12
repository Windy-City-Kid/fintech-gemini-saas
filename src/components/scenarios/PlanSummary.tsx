/**
 * Plan Summary Dashboard
 * Shows Success Score, Estimated Estate Value, and Social Security Strategy
 */

import { TrendingUp, Landmark, Heart, Target } from 'lucide-react';
import { SimulationResult } from '@/hooks/useMonteCarloSimulation';

interface PlanSummaryProps {
  simulationResult: SimulationResult | null;
  isMarried: boolean;
  primaryClaimingAge: number;
  spouseClaimingAge?: number;
  legacyGoal: number;
}

export function PlanSummary({
  simulationResult,
  isMarried,
  primaryClaimingAge,
  spouseClaimingAge,
  legacyGoal,
}: PlanSummaryProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const getSuccessLabel = (rate: number): string => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 80) return 'Good';
    if (rate >= 70) return 'Moderate';
    if (rate >= 60) return 'Caution';
    return 'At Risk';
  };

  const getSuccessColor = (rate: number): string => {
    if (rate >= 90) return 'text-chart-2';
    if (rate >= 80) return 'text-primary';
    if (rate >= 70) return 'text-chart-4';
    return 'text-destructive';
  };

  const getClaimingStrategy = (): string => {
    if (!isMarried) {
      if (primaryClaimingAge >= 70) return 'Maximum Benefits (Age 70)';
      if (primaryClaimingAge >= 67) return 'Full Retirement Age';
      return 'Early Claiming';
    }

    const avgAge = spouseClaimingAge 
      ? (primaryClaimingAge + spouseClaimingAge) / 2 
      : primaryClaimingAge;
    
    if (avgAge >= 69) return 'Delayed Strategy';
    if (avgAge >= 67) return 'Balanced Strategy';
    return 'Early Filing Strategy';
  };

  const meetsLegacyGoal = simulationResult 
    ? simulationResult.medianEndBalance >= legacyGoal 
    : false;

  return (
    <div className="stat-card">
      <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" />
        Plan Summary
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Success Score */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Success Score</span>
          </div>
          {simulationResult ? (
            <>
              <p className={`text-3xl font-bold ${getSuccessColor(simulationResult.successRate)}`}>
                {simulationResult.successRate.toFixed(0)}%
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {getSuccessLabel(simulationResult.successRate)}
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-muted-foreground">--</p>
          )}
        </div>

        {/* Estimated Estate Value */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Est. Estate Value</span>
          </div>
          {simulationResult ? (
            <>
              <p className="text-3xl font-bold text-foreground">
                {formatCurrency(simulationResult.medianEndBalance)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Median at end of plan
              </p>
              {legacyGoal > 0 && (
                <div className={`mt-2 text-xs px-2 py-1 rounded inline-block ${
                  meetsLegacyGoal 
                    ? 'bg-chart-2/10 text-chart-2' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {meetsLegacyGoal ? '✓ Meets legacy goal' : '✗ Below legacy goal'}
                </div>
              )}
            </>
          ) : (
            <p className="text-2xl font-bold text-muted-foreground">--</p>
          )}
        </div>

        {/* Social Security Strategy */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">SS Strategy</span>
          </div>
          <p className="text-lg font-bold text-foreground">
            {getClaimingStrategy()}
          </p>
          <div className="mt-2 text-sm text-muted-foreground">
            {isMarried ? (
              <div className="space-y-1">
                <p>You: Age {primaryClaimingAge}</p>
                {spouseClaimingAge && <p>Spouse: Age {spouseClaimingAge}</p>}
              </div>
            ) : (
              <p>Claiming at age {primaryClaimingAge}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      {simulationResult && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">5th Percentile: </span>
              <span className="font-medium">
                {formatCurrency(simulationResult.percentiles.p5[simulationResult.percentiles.p5.length - 1])}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">95th Percentile: </span>
              <span className="font-medium">
                {formatCurrency(simulationResult.percentiles.p95[simulationResult.percentiles.p95.length - 1])}
              </span>
            </div>
            {simulationResult.guardrailActivations > 0 && (
              <div>
                <span className="text-muted-foreground">Guardrail Events: </span>
                <span className="font-medium text-chart-4">
                  {simulationResult.guardrailActivations.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
