import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, TrendingDown, Shield, DollarSign } from 'lucide-react';
import { useStateTaxRules, StateTaxRule } from '@/hooks/useStateTaxRules';

interface TaxProfileCardProps {
  currentState?: string;
  relocationState?: string | null;
}

const friendlinessConfig = {
  excellent: { label: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700' },
  good: { label: 'Good', color: 'bg-emerald-400', textColor: 'text-emerald-700' },
  neutral: { label: 'Neutral', color: 'bg-amber-400', textColor: 'text-amber-700' },
  poor: { label: 'Poor', color: 'bg-red-400', textColor: 'text-red-700' },
};

function formatPercent(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function TaxProfileCard({ currentState = 'GA', relocationState }: TaxProfileCardProps) {
  const { getRule, isLoading } = useStateTaxRules();

  const currentRule = getRule(currentState);
  const relocationRule = relocationState ? getRule(relocationState) : null;
  
  const activeRule = relocationRule || currentRule;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeRule) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Select a state to view tax profile
        </CardContent>
      </Card>
    );
  }

  const config = friendlinessConfig[activeRule.retirement_friendliness];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Tax Profile
          </CardTitle>
          <Badge 
            variant="secondary" 
            className={`${config.color} text-white font-medium`}
          >
            {config.label} for Retirement
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* State Info */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">State</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{activeRule.state_name}</span>
            {relocationState && (
              <Badge variant="outline" className="text-xs">After Relocation</Badge>
            )}
          </div>
        </div>

        {/* Tax Rate */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingDown className="h-4 w-4" />
            Income Tax Rate
          </span>
          <span className="font-semibold">
            {activeRule.rate_type === 'none' ? (
              <span className="text-green-600">No Income Tax</span>
            ) : (
              <>
                {formatPercent(activeRule.base_rate)}
                <span className="text-xs text-muted-foreground ml-1">
                  ({activeRule.rate_type})
                </span>
              </>
            )}
          </span>
        </div>

        {/* Social Security */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Shield className="h-4 w-4" />
            Social Security
          </span>
          <span className={`font-medium ${activeRule.social_security_taxable ? 'text-red-600' : 'text-green-600'}`}>
            {activeRule.social_security_taxable ? 'Taxed' : 'Tax-Free'}
          </span>
        </div>

        {/* Retirement Exclusion */}
        {activeRule.retirement_exclusion_amount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Retirement Exclusion
            </span>
            <span className="font-semibold text-green-600">
              {formatCurrency(activeRule.retirement_exclusion_amount)}
            </span>
          </div>
        )}

        {/* Notes */}
        {activeRule.notes && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground italic">
              {activeRule.notes}
            </p>
          </div>
        )}

        {/* Comparison if relocating */}
        {relocationRule && currentRule && relocationRule.state_code !== currentRule.state_code && (
          <div className="pt-3 border-t">
            <div className="text-xs text-muted-foreground mb-2">Compared to {currentRule.state_name}:</div>
            <div className="flex items-center gap-2">
              {relocationRule.base_rate < currentRule.base_rate ? (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  ↓ {formatPercent(currentRule.base_rate - relocationRule.base_rate)} lower rate
                </Badge>
              ) : relocationRule.base_rate > currentRule.base_rate ? (
                <Badge variant="secondary" className="bg-red-100 text-red-700">
                  ↑ {formatPercent(relocationRule.base_rate - currentRule.base_rate)} higher rate
                </Badge>
              ) : (
                <Badge variant="secondary">Same rate</Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
