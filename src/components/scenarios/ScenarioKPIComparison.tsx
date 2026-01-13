/**
 * Side-by-Side KPI Tiles for scenario comparison
 */

import { 
  Shield, 
  Home, 
  Receipt, 
  TrendingUp,
  Star,
  ChevronUp,
  ChevronDown,
  Minus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Scenario } from '@/hooks/useScenarios';
import { cn } from '@/lib/utils';

interface ScenarioKPIComparisonProps {
  scenarios: Scenario[];
  baselineId?: string;
  onForecastModeChange: (id: string, mode: 'optimistic' | 'average' | 'pessimistic') => void;
}

export function ScenarioKPIComparison({
  scenarios,
  baselineId,
  onForecastModeChange,
}: ScenarioKPIComparisonProps) {
  const formatCurrency = (value: number | null) => {
    if (value === null) return '—';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercent = (value: number | null) => {
    if (value === null) return '—';
    return `${value.toFixed(1)}%`;
  };

  // Get baseline values for comparison
  const baseline = scenarios.find(s => s.id === baselineId);
  const baselineSuccess = baseline?.cached_success_rate ?? null;
  const baselineEstate = baseline?.cached_estate_value ?? null;
  const baselineTaxes = baseline?.total_lifetime_taxes ?? null;

  // Calculate difference from baseline
  const getDiff = (current: number | null, base: number | null) => {
    if (current === null || base === null || base === 0) return null;
    return ((current - base) / base) * 100;
  };

  const DiffIndicator = ({ diff, inverse = false }: { diff: number | null; inverse?: boolean }) => {
    if (diff === null) return null;
    
    const isPositive = inverse ? diff < 0 : diff > 0;
    const isNeutral = Math.abs(diff) < 0.5;
    
    if (isNeutral) {
      return (
        <span className="flex items-center text-xs text-muted-foreground">
          <Minus className="h-3 w-3 mr-0.5" />
          0%
        </span>
      );
    }

    return (
      <span className={cn(
        "flex items-center text-xs font-medium",
        isPositive ? "text-green-600" : "text-red-600"
      )}>
        {diff > 0 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {Math.abs(diff).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">KPI Comparison</h3>
          <p className="text-sm text-muted-foreground">
            Key metrics across selected scenarios
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                Metric
              </th>
              {scenarios.map((s) => (
                <th key={s.id} className="text-center py-3 px-4 min-w-32">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm truncate max-w-24">
                        {s.scenario_name}
                      </span>
                      {s.is_baseline && (
                        <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    {/* Forecast Mode Toggle */}
                    <Select
                      value={s.forecast_mode || 'average'}
                      onValueChange={(v) => onForecastModeChange(s.id, v as any)}
                    >
                      <SelectTrigger className="h-6 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="optimistic">Optimistic</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="pessimistic">Pessimistic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Success Score */}
            <tr className="border-b border-border/50">
              <td className="py-4 px-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Success Score</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Monte Carlo probability
                </p>
              </td>
              {scenarios.map((s) => (
                <td key={s.id} className="text-center py-4 px-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className={cn(
                      "text-xl font-bold font-mono",
                      s.cached_success_rate !== null && s.cached_success_rate >= 80 && "text-green-600",
                      s.cached_success_rate !== null && s.cached_success_rate < 80 && s.cached_success_rate >= 60 && "text-yellow-600",
                      s.cached_success_rate !== null && s.cached_success_rate < 60 && "text-red-600"
                    )}>
                      {formatPercent(s.cached_success_rate)}
                    </span>
                    {!s.is_baseline && (
                      <DiffIndicator diff={getDiff(s.cached_success_rate, baselineSuccess)} />
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Estate Value */}
            <tr className="border-b border-border/50">
              <td className="py-4 px-2">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Estate Value at 100</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Portfolio + Home Equity
                </p>
              </td>
              {scenarios.map((s) => (
                <td key={s.id} className="text-center py-4 px-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl font-bold font-mono text-foreground">
                      {formatCurrency(s.cached_estate_value)}
                    </span>
                    {!s.is_baseline && (
                      <DiffIndicator diff={getDiff(s.cached_estate_value, baselineEstate)} />
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Total Lifetime Taxes */}
            <tr className="border-b border-border/50">
              <td className="py-4 px-2">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Lifetime Taxes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total federal + state
                </p>
              </td>
              {scenarios.map((s) => (
                <td key={s.id} className="text-center py-4 px-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xl font-bold font-mono text-foreground">
                      {formatCurrency(s.total_lifetime_taxes)}
                    </span>
                    {!s.is_baseline && (
                      <DiffIndicator 
                        diff={getDiff(s.total_lifetime_taxes, baselineTaxes)} 
                        inverse // Lower taxes is better
                      />
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Retirement Age */}
            <tr>
              <td className="py-4 px-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Retirement Age</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Target retirement
                </p>
              </td>
              {scenarios.map((s) => (
                <td key={s.id} className="text-center py-4 px-4">
                  <span className="text-xl font-bold font-mono text-foreground">
                    {s.retirement_age}
                  </span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {scenarios.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>Select scenarios to compare their key metrics</p>
        </div>
      )}
    </div>
  );
}
