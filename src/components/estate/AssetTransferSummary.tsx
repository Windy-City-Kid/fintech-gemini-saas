/**
 * Asset Transfer Summary Component
 * Shows step-up in basis and 10-year rule implications
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { EstateAsset, EstateProjectionResult, formatEstateCurrency } from '@/lib/estateCalculator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AssetTransferSummaryProps {
  projection: EstateProjectionResult | null;
  assets: EstateAsset[];
  hasSpouseBeneficiary: boolean;
}

export function AssetTransferSummary({
  projection,
  assets,
  hasSpouseBeneficiary,
}: AssetTransferSummaryProps) {
  if (!projection) return null;

  const brokerageAssets = assets.filter(a => a.type === 'brokerage');
  const realEstateAssets = assets.filter(a => a.type === 'real_estate');
  const traditionalAssets = assets.filter(a => a.type === 'ira' || a.type === '401k');

  return (
    <div className="space-y-4">
      {/* Step-Up in Basis Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-chart-2" />
            Step-Up in Basis
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>When you pass away, your heirs receive a &quot;step-up&quot; in cost basis to the current market value, eliminating capital gains tax on appreciation during your lifetime.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Tax-Free Stepped-Up Value</span>
              <span className="text-2xl font-bold text-chart-2">
                {formatEstateCurrency(projection.stepUpBasis)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This is the capital gains your heirs will NOT have to pay taxes on
            </p>
          </div>

          {(brokerageAssets.length > 0 || realEstateAssets.length > 0) && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Eligible Assets:</p>
              <div className="grid gap-2">
                {brokerageAssets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                    <span>{asset.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Brokerage</Badge>
                      <span className="font-mono">{formatEstateCurrency(asset.value - asset.costBasis)}</span>
                    </div>
                  </div>
                ))}
                {realEstateAssets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                    <span>{asset.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">Real Estate</Badge>
                      <span className="font-mono">{formatEstateCurrency(asset.value - asset.costBasis)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 10-Year Rule Card */}
      {traditionalAssets.length > 0 && (
        <Card className={!hasSpouseBeneficiary ? 'border-chart-4/50' : ''}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-chart-4" />
              The 10-Year Rule
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Under the SECURE Act, non-spouse beneficiaries must empty inherited IRAs within 10 years, potentially pushing them into higher tax brackets.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium">Traditional IRA/401k Balance</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatEstateCurrency(projection.traditionalIraBalance)}
              </p>
            </div>

            {hasSpouseBeneficiary ? (
              <div className="p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                  <span className="text-sm font-medium text-chart-2">Spouse Rollover Available</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your spouse can roll inherited IRAs into their own IRA, avoiding the 10-year rule
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-chart-4/10 border border-chart-4/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-chart-4" />
                  <span className="text-sm font-medium text-chart-4">Heir Tax Liability Warning</span>
                </div>
                <p className="text-lg font-bold text-chart-4">
                  Estimated Tax: {formatEstateCurrency(projection.heir10YearTaxEstimate)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Non-spouse heirs must empty the account within 10 years. Consider Roth conversions to reduce this burden.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Tax-Deferred Accounts:</p>
              <div className="grid gap-2">
                {traditionalAssets.map((asset, i) => (
                  <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                    <span>{asset.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{asset.type.toUpperCase()}</Badge>
                      <span className="font-mono">{formatEstateCurrency(asset.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
