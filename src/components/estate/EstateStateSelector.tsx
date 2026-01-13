/**
 * Estate State Selector Component
 * Allows users to select their state for estate tax calculations
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, AlertTriangle, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  STATE_ESTATE_TAX_2026, 
  STATE_INHERITANCE_TAX_2026,
  calculateStateEstateTax2026,
  getStateName,
} from '@/lib/stateEstateTaxEngine';
import { formatEstateCurrency } from '@/lib/estateCalculator';

interface EstateStateSelectorProps {
  selectedState: string;
  onStateChange: (stateCode: string) => void;
  grossEstate: number;
}

// All 50 states + DC
const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID',
  'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO',
  'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
  'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function EstateStateSelector({
  selectedState,
  onStateChange,
  grossEstate,
}: EstateStateSelectorProps) {
  const taxResult = useMemo(() => {
    return calculateStateEstateTax2026(grossEstate, selectedState);
  }, [grossEstate, selectedState]);

  const stateType = useMemo(() => {
    if (STATE_ESTATE_TAX_2026[selectedState]) {
      return selectedState === 'MD' ? 'both' : 'estate';
    }
    if (STATE_INHERITANCE_TAX_2026[selectedState]) {
      return 'inheritance';
    }
    return 'none';
  }, [selectedState]);

  const estateTaxData = STATE_ESTATE_TAX_2026[selectedState];
  const inheritanceTaxData = STATE_INHERITANCE_TAX_2026[selectedState];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">State of Residence</CardTitle>
          </div>
          {stateType !== 'none' && (
            <Badge variant={taxResult.estateTax > 0 ? 'destructive' : 'secondary'}>
              {stateType === 'both' ? 'Estate & Inheritance Tax' : 
               stateType === 'estate' ? 'Estate Tax State' : 'Inheritance Tax State'}
            </Badge>
          )}
        </div>
        <CardDescription>
          Select your state to calculate state-level estate taxes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedState} onValueChange={onStateChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {ALL_STATES.map((code) => {
              const hasEstateTax = !!STATE_ESTATE_TAX_2026[code];
              const hasInheritanceTax = !!STATE_INHERITANCE_TAX_2026[code];
              return (
                <SelectItem key={code} value={code}>
                  <div className="flex items-center gap-2">
                    <span>{getStateName(code)}</span>
                    {hasEstateTax && (
                      <Badge variant="outline" className="text-xs ml-2">E</Badge>
                    )}
                    {hasInheritanceTax && (
                      <Badge variant="outline" className="text-xs">I</Badge>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Tax Summary */}
        {stateType === 'none' ? (
          <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <p className="text-sm text-green-700 dark:text-green-400">
              ✓ {getStateName(selectedState)} has no state estate or inheritance tax
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Estate Tax Details */}
            {estateTaxData && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Estate Tax Exemption</span>
                  <span className="text-sm font-mono">
                    {formatEstateCurrency(estateTaxData.exemption)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Top Rate</span>
                  <span className="text-sm font-mono">{(estateTaxData.topRate * 100).toFixed(1)}%</span>
                </div>
                {taxResult.estateTax > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-sm font-semibold text-destructive flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Estimated State Estate Tax
                    </span>
                    <span className="text-sm font-bold text-destructive">
                      {formatEstateCurrency(taxResult.estateTax)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Inheritance Tax Details */}
            {inheritanceTaxData && (
              <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Inheritance Tax Rates by Heir Type
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Spouse:</span>
                    <span className="font-mono">
                      {inheritanceTaxData.spouseRate === 0 ? 'Exempt' : `${(inheritanceTaxData.spouseRate * 100)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Children:</span>
                    <span className="font-mono">
                      {inheritanceTaxData.childRate === 0 ? 'Exempt' : `${(inheritanceTaxData.childRate * 100)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Siblings:</span>
                    <span className="font-mono">
                      {inheritanceTaxData.siblingRate === 0 ? 'Exempt' : `${(inheritanceTaxData.siblingRate * 100)}%`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Others:</span>
                    <span className="font-mono text-destructive">
                      {(inheritanceTaxData.otherRate * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {taxResult.notes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 cursor-help">
                      <Info className="h-3 w-3" />
                      {taxResult.notes}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-64 text-xs">{taxResult.notes}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
