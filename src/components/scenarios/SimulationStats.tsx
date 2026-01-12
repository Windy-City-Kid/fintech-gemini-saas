import { TrendingUp, Shield, Percent, AlertTriangle } from 'lucide-react';
import { SimulationResult } from '@/hooks/useMonteCarloSimulation';

interface SimulationStatsProps {
  result: SimulationResult | null;
  retirementAge: number;
  currentAge: number;
}

export function SimulationStats({ result, retirementAge, currentAge }: SimulationStatsProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (!result) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-8 bg-muted rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  const retirementIndex = retirementAge - currentAge;
  const medianAtRetirement = result.percentiles.p50[retirementIndex] || 0;
  const pessimisticAtRetirement = result.percentiles.p5[retirementIndex] || 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Success Rate */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-2">
          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
            result.successRate >= 90 ? 'bg-primary/10' : 
            result.successRate >= 75 ? 'bg-yellow-500/10' : 'bg-destructive/10'
          }`}>
            <Shield className={`h-4 w-4 ${
              result.successRate >= 90 ? 'text-primary' : 
              result.successRate >= 75 ? 'text-yellow-500' : 'text-destructive'
            }`} />
          </div>
          <span className="text-sm text-muted-foreground">Success Rate</span>
        </div>
        <p className={`text-2xl font-bold font-mono ${
          result.successRate >= 90 ? 'text-primary' : 
          result.successRate >= 75 ? 'text-yellow-500' : 'text-destructive'
        }`}>
          {result.successRate.toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Probability of not running out
        </p>
      </div>

      {/* Median at Retirement */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm text-muted-foreground">Median Nest Egg</span>
        </div>
        <p className="text-2xl font-bold font-mono text-primary">
          {formatCurrency(medianAtRetirement)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          At retirement (50th percentile)
        </p>
      </div>

      {/* Pessimistic Scenario */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </div>
          <span className="text-sm text-muted-foreground">Pessimistic</span>
        </div>
        <p className="text-2xl font-bold font-mono text-yellow-500">
          {formatCurrency(pessimisticAtRetirement)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          5th percentile outcome
        </p>
      </div>

      {/* Inflation & Performance */}
      <div className="stat-card">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-8 w-8 rounded-lg bg-secondary/50 flex items-center justify-center">
            <Percent className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm text-muted-foreground">Inflation Range</span>
        </div>
        <p className="text-2xl font-bold font-mono">
          {result.inflationScenarios.low.toFixed(1)}-{result.inflationScenarios.high.toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Stochastic (10th-90th) • {result.executionTimeMs?.toFixed(0) || '?'}ms
        </p>
      </div>
    </div>
  );
}
