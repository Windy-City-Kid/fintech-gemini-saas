import { AlertTriangle, Info, DollarSign } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { validateContribution, getContributionLimit } from '@/lib/irsLimits2026';

interface IRSLimitWarningProps {
  accountType: string;
  plannedAmount: number;
  age: number;
  isHighEarner?: boolean;
  hsaFamilyCoverage?: boolean;
}

export function IRSLimitWarning({
  accountType,
  plannedAmount,
  age,
  isHighEarner = false,
  hsaFamilyCoverage = false,
}: IRSLimitWarningProps) {
  const validation = validateContribution(
    accountType,
    plannedAmount,
    age,
    isHighEarner,
    hsaFamilyCoverage
  );

  if (!validation.warning) return null;

  const isExceeded = !validation.isValid;
  const limitInfo = getContributionLimit(accountType, age, isHighEarner, hsaFamilyCoverage);

  return (
    <Alert variant={isExceeded ? 'destructive' : 'default'} className="mt-3">
      {isExceeded ? (
        <AlertTriangle className="h-4 w-4" />
      ) : (
        <Info className="h-4 w-4" />
      )}
      <AlertTitle className="flex items-center gap-2">
        {isExceeded ? 'Contribution Limit Exceeded' : 'Roth Catch-Up Required'}
      </AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{validation.warning}</p>
        {isExceeded && (
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>Your plan:</strong> ${plannedAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                <strong>IRS limit:</strong> ${validation.maxAllowed.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2 text-destructive">
              <span className="text-sm">
                <strong>Excess:</strong> ${validation.excess.toLocaleString()}
              </span>
            </div>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {limitInfo.breakdown}
        </p>
      </AlertDescription>
    </Alert>
  );
}

interface ContributionLimitsSummaryProps {
  age: number;
  spouseAge?: number;
  isHighEarner?: boolean;
}

export function ContributionLimitsSummary({
  age,
  spouseAge,
  isHighEarner = false,
}: ContributionLimitsSummaryProps) {
  const limits401k = getContributionLimit('401k', age, isHighEarner);
  const limitsIRA = getContributionLimit('IRA', age);
  const limitsHSA = getContributionLimit('HSA', age, false, false);
  const limitsHSAFamily = getContributionLimit('HSA', age, false, true);

  // Check if in Super Catch-Up range
  const isInSuperCatchUp = age >= 60 && age <= 63;

  return (
    <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" />
        2026 IRS Contribution Limits
        {isInSuperCatchUp && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            Super Catch-Up Eligible
          </span>
        )}
      </h4>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="p-2 rounded bg-background border border-border">
          <p className="text-xs text-muted-foreground">401(k)/403(b)</p>
          <p className="font-mono font-semibold">${limits401k.maxContribution.toLocaleString()}</p>
          {limits401k.isRothCatchUp && (
            <p className="text-xs text-amber-500">Catch-up must be Roth</p>
          )}
        </div>
        
        <div className="p-2 rounded bg-background border border-border">
          <p className="text-xs text-muted-foreground">IRA/Roth IRA</p>
          <p className="font-mono font-semibold">${limitsIRA.maxContribution.toLocaleString()}</p>
          {spouseAge && (
            <p className="text-xs text-muted-foreground">
              +${getContributionLimit('IRA', spouseAge).maxContribution.toLocaleString()} spouse
            </p>
          )}
        </div>
        
        <div className="p-2 rounded bg-background border border-border">
          <p className="text-xs text-muted-foreground">HSA (Individual)</p>
          <p className="font-mono font-semibold">${limitsHSA.maxContribution.toLocaleString()}</p>
        </div>
        
        <div className="p-2 rounded bg-background border border-border">
          <p className="text-xs text-muted-foreground">HSA (Family)</p>
          <p className="font-mono font-semibold">${limitsHSAFamily.maxContribution.toLocaleString()}</p>
        </div>
      </div>
      
      {isHighEarner && (
        <p className="text-xs text-amber-500 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          SECURE 2.0: High earners (&gt;$150K) must make catch-up contributions as Roth
        </p>
      )}
    </div>
  );
}
