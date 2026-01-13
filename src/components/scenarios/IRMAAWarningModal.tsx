/**
 * IRMAA Bracket Warning Modal
 * 
 * Triggered when Roth conversions or RMDs push income into higher IRMAA brackets
 */

import { AlertTriangle, DollarSign, TrendingUp, Info } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  IRMAABracketChange,
  getNextIRMAAThreshold,
  IRMAA_BRACKETS_2026,
} from '@/lib/medicareCalculator';

interface IRMAAWarningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bracketChange: IRMAABracketChange | null;
  currentMAGI: number;
  proposedAmount: number;
  transactionType: 'roth_conversion' | 'rmd';
  isMarried: boolean;
  onProceed?: () => void;
  onCancel?: () => void;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
};

export function IRMAAWarningModal({
  open,
  onOpenChange,
  bracketChange,
  currentMAGI,
  proposedAmount,
  transactionType,
  isMarried,
  onProceed,
  onCancel,
}: IRMAAWarningModalProps) {
  if (!bracketChange) return null;

  const transactionLabel = transactionType === 'roth_conversion' 
    ? 'Roth Conversion' 
    : 'Required Minimum Distribution';

  const nextThreshold = getNextIRMAAThreshold(currentMAGI + proposedAmount, isMarried);
  
  // Calculate how much could be converted without hitting new bracket
  const safeAmount = bracketChange.magiThresholdExceeded - currentMAGI;
  const safePercentage = safeAmount > 0 ? (safeAmount / proposedAmount) * 100 : 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            IRMAA Bracket Warning
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-sm">
                This <strong>{transactionLabel}</strong> of{' '}
                <strong className="text-foreground">{formatCurrency(proposedAmount)}</strong>{' '}
                will push your income into a higher Medicare premium bracket next year.
              </p>

              {/* Bracket Transition Visual */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <Badge variant="outline" className="mb-1">
                      {bracketChange.previousBracket.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground">Current</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-amber-500" />
                  <div className="text-center">
                    <Badge variant="destructive" className="mb-1">
                      {bracketChange.newBracket.label}
                    </Badge>
                    <p className="text-xs text-muted-foreground">New</p>
                  </div>
                </div>
                
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Part B Premium (Monthly)</span>
                    <div className="text-right">
                      <span className="text-muted-foreground line-through mr-2">
                        ${bracketChange.previousBracket.partBMonthly}
                      </span>
                      <span className="font-semibold text-red-600">
                        ${bracketChange.newBracket.partBMonthly}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Part D Surcharge (Monthly)</span>
                    <div className="text-right">
                      <span className="text-muted-foreground line-through mr-2">
                        +${bracketChange.previousBracket.partDSurcharge}
                      </span>
                      <span className="font-semibold text-red-600">
                        +${bracketChange.newBracket.partDSurcharge}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Annual Impact */}
              <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium">Annual Premium Increase</span>
                </div>
                <span className="text-lg font-bold text-red-600">
                  +{formatCurrency(bracketChange.annualPremiumIncrease)}
                </span>
              </div>

              {/* Safe Amount Suggestion */}
              {safeAmount > 0 && safeAmount < proposedAmount && (
                <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 space-y-2">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-green-700 dark:text-green-400">
                        Stay in Current Bracket
                      </p>
                      <p className="text-muted-foreground">
                        You can {transactionType === 'roth_conversion' ? 'convert' : 'withdraw'} up to{' '}
                        <strong className="text-foreground">{formatCurrency(safeAmount)}</strong>{' '}
                        without triggering higher IRMAA premiums.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Safe amount</span>
                      <span>{safePercentage.toFixed(0)}% of proposed</span>
                    </div>
                    <Progress value={safePercentage} className="h-2" />
                  </div>
                </div>
              )}

              {/* Threshold Info */}
              <div className="text-xs text-muted-foreground">
                <p>
                  IRMAA threshold exceeded: {formatCurrency(bracketChange.magiThresholdExceeded)}{' '}
                  ({isMarried ? 'Married Filing Jointly' : 'Single'})
                </p>
                <p className="mt-1">
                  Your MAGI after this transaction: {formatCurrency(currentMAGI + proposedAmount)}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Adjust Amount
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onProceed}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Proceed Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============= IRMAA Alert Hook =============

import { useState, useCallback } from 'react';
import { checkIRMAABracketChange } from '@/lib/medicareCalculator';

interface UseIRMAAAlertReturn {
  showWarning: boolean;
  bracketChange: IRMAABracketChange | null;
  checkAmount: (amount: number) => boolean;
  openWarning: () => void;
  closeWarning: () => void;
  currentMAGI: number;
  proposedAmount: number;
}

export function useIRMAAAlert(
  baseMAGI: number,
  isMarried: boolean
): UseIRMAAAlertReturn {
  const [showWarning, setShowWarning] = useState(false);
  const [bracketChange, setBracketChange] = useState<IRMAABracketChange | null>(null);
  const [proposedAmount, setProposedAmount] = useState(0);

  const checkAmount = useCallback((amount: number): boolean => {
    const change = checkIRMAABracketChange(baseMAGI, amount, isMarried);
    
    if (change) {
      setBracketChange(change);
      setProposedAmount(amount);
      setShowWarning(true);
      return true; // Would trigger bracket change
    }
    
    setBracketChange(null);
    return false; // Safe, no bracket change
  }, [baseMAGI, isMarried]);

  const openWarning = useCallback(() => setShowWarning(true), []);
  const closeWarning = useCallback(() => setShowWarning(false), []);

  return {
    showWarning,
    bracketChange,
    checkAmount,
    openWarning,
    closeWarning,
    currentMAGI: baseMAGI,
    proposedAmount,
  };
}