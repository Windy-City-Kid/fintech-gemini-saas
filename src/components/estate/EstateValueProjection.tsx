/**
 * Estate Value Projection Component
 * Shows projected estate value with tax breakdown
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingUp, Building2, DollarSign, Receipt } from 'lucide-react';
import { 
  EstateProjectionResult, 
  formatEstateCurrency,
  FEDERAL_ESTATE_EXEMPTION_2026,
  STATE_ESTATE_TAXES,
} from '@/lib/estateCalculator';
import { AskAIButton } from '@/components/advisor/AskAIButton';

interface EstateValueProjectionProps {
  projection: EstateProjectionResult | null;
  longevityAge: number;
  stateCode: string;
  legacyGoal: number;
}

export function EstateValueProjection({
  projection,
  longevityAge,
  stateCode,
  legacyGoal,
}: EstateValueProjectionProps) {
  if (!projection) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Add accounts and properties to see your estate projection
        </CardContent>
      </Card>
    );
  }

  const isAtRisk = legacyGoal > 0 && projection.netToHeirs < legacyGoal;
  const stateHasEstateTax = !!STATE_ESTATE_TAXES[stateCode];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Net Worth at Death (Age {longevityAge})
          </CardTitle>
          <div className="flex items-center gap-2">
            <AskAIButton
              chartType="estateProjection"
              chartTitle="Estate Value Projection"
              chartData={{
                grossEstate: projection.grossEstate,
                federalEstateTax: projection.federalEstateTax,
                stateEstateTax: projection.stateEstateTax,
                netToHeirs: projection.netToHeirs,
                charitableDeductions: projection.charitableDeductions,
                legacyGoal,
                stateCode,
                longevityAge,
              }}
            />
            {isAtRisk && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Legacy Goal at Risk
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Main Estate Value */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-1">Estimated Estate Value</p>
          <p className="text-4xl font-bold text-foreground">
            {formatEstateCurrency(projection.grossEstate)}
          </p>
        </div>

        {/* Tax Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Federal Estate Tax */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Federal Estate Tax</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {projection.federalEstateTax > 0 
                ? `-${formatEstateCurrency(projection.federalEstateTax)}`
                : '$0'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              2026 Exemption: {formatEstateCurrency(FEDERAL_ESTATE_EXEMPTION_2026)} (40% above)
            </p>
          </div>

          {/* State Estate Tax */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">State Estate Tax ({stateCode})</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              {projection.stateEstateTax > 0 
                ? `-${formatEstateCurrency(projection.stateEstateTax)}`
                : '$0'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stateHasEstateTax 
                ? `${STATE_ESTATE_TAXES[stateCode].type} tax applies`
                : 'No state estate/inheritance tax'}
            </p>
          </div>
        </div>

        {/* Charitable Deductions */}
        {projection.charitableDeductions > 0 && (
          <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Charitable Deductions</span>
              <span className="text-lg font-bold text-chart-2">
                -{formatEstateCurrency(projection.charitableDeductions)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reduces taxable estate dollar-for-dollar
            </p>
          </div>
        )}

        {/* Net to Heirs */}
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold">Net to Heirs</span>
          </div>
          <p className="text-3xl font-bold text-primary">
            {formatEstateCurrency(projection.netToHeirs)}
          </p>
          {legacyGoal > 0 && (
            <div className="mt-2">
              {isAtRisk ? (
                <p className="text-sm text-destructive">
                  ⚠️ {formatEstateCurrency(legacyGoal - projection.netToHeirs)} below your legacy goal
                </p>
              ) : (
                <p className="text-sm text-chart-2">
                  ✓ {formatEstateCurrency(projection.netToHeirs - legacyGoal)} above your legacy goal
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
