/**
 * 2026 Tax-Optimization Audit
 * Tax-Loss Harvesting, Charitable Bunching, and QCD suggestions
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Receipt, 
  TrendingDown, 
  Gift, 
  Heart,
  DollarSign,
  Check,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { TaxLossCandidate, CharitableStrategy, IRS_LIMITS_2026 } from '@/lib/rebalanceAuditEngine';

interface TaxOptimizationAuditProps {
  taxLossCandidates: TaxLossCandidate[];
  taxStrategies: CharitableStrategy[];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

const strategyIcons = {
  tax_loss_harvest: TrendingDown,
  charitable_bunching: Gift,
  qcd: Heart,
};

const strategyColors = {
  tax_loss_harvest: 'text-destructive',
  charitable_bunching: 'text-primary',
  qcd: 'text-chart-2',
};

export function TaxOptimizationAudit({
  taxLossCandidates,
  taxStrategies,
}: TaxOptimizationAuditProps) {
  const [showHarvestDialog, setShowHarvestDialog] = useState(false);

  const totalLosses = taxLossCandidates.reduce((sum, c) => sum + c.unrealizedLoss, 0);
  const totalSavings = taxStrategies.reduce((sum, s) => sum + s.estimatedSavings, 0);
  const eligibleStrategies = taxStrategies.filter(s => s.isEligible);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            2026 Tax-Optimization Audit
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Harvestable Losses</p>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(totalLosses)}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Strategies Available</p>
              <p className="text-2xl font-bold text-primary">
                {eligibleStrategies.length}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/30">
              <p className="text-sm text-muted-foreground">Est. Tax Savings</p>
              <p className="text-2xl font-bold text-chart-2">
                {formatCurrency(totalSavings)}
              </p>
            </div>
          </div>

          {/* Smart Tax Moves */}
          <Accordion type="multiple" className="w-full">
            {taxStrategies.map((strategy, index) => {
              const Icon = strategyIcons[strategy.type];
              const colorClass = strategyColors[strategy.type];

              return (
                <AccordionItem key={index} value={`strategy-${index}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        strategy.isEligible ? 'bg-chart-2/10' : 'bg-muted'
                      }`}>
                        <Icon className={`h-5 w-5 ${strategy.isEligible ? colorClass : 'text-muted-foreground'}`} />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{strategy.title}</p>
                        <div className="flex items-center gap-2">
                          {strategy.isEligible ? (
                            <Badge variant="default" className="bg-chart-2 gap-1">
                              <Check className="h-3 w-3" />
                              Eligible
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <X className="h-3 w-3" />
                              Not Eligible
                            </Badge>
                          )}
                          {strategy.estimatedSavings > 0 && (
                            <span className="text-sm text-chart-2 font-medium">
                              Save {formatCurrency(strategy.estimatedSavings)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <div className="space-y-3 pl-12">
                      <p className="text-muted-foreground">{strategy.description}</p>
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <ChevronRight className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{strategy.action}</span>
                      </div>
                      {strategy.type === 'tax_loss_harvest' && taxLossCandidates.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowHarvestDialog(true)}
                          className="gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          View Tax-Loss Candidates
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* IRS Limits Reference */}
          <div className="p-4 rounded-lg bg-muted/30 border">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              2026 IRS Limits
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capital Loss Deduction:</span>
                <span className="font-mono">{formatCurrency(IRS_LIMITS_2026.capitalLossDeduction)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">QCD Limit:</span>
                <span className="font-mono">{formatCurrency(IRS_LIMITS_2026.qcdMaxAnnual)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SALT Cap:</span>
                <span className="font-mono">{formatCurrency(IRS_LIMITS_2026.saltCap)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Standard Deduction (MFJ):</span>
                <span className="font-mono">{formatCurrency(IRS_LIMITS_2026.standardDeduction.married)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax-Loss Harvest Details Dialog */}
      <Dialog open={showHarvestDialog} onOpenChange={setShowHarvestDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" />
              Tax-Loss Harvesting Candidates
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These holdings have unrealized losses that can offset capital gains 
              or up to ${IRS_LIMITS_2026.capitalLossDeduction.toLocaleString()} in ordinary income.
            </p>

            {taxLossCandidates.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Security</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Cost Basis</TableHead>
                    <TableHead className="text-right">Market Value</TableHead>
                    <TableHead className="text-right">Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxLossCandidates.map((candidate, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{candidate.securityName}</p>
                          {candidate.tickerSymbol && (
                            <p className="text-xs text-muted-foreground">{candidate.tickerSymbol}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {candidate.accountName}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(candidate.costBasis)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(candidate.marketValue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive font-bold">
                        -{formatCurrency(candidate.unrealizedLoss)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingDown className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No tax-loss harvesting opportunities found.</p>
                <p className="text-sm">All holdings are currently at a gain.</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                ⚠️ Be aware of wash sale rules: You cannot repurchase substantially identical 
                securities within 30 days before or after the sale.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
