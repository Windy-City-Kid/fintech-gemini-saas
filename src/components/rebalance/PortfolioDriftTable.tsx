/**
 * Portfolio Drift Analysis Table
 * Shows current vs target allocation with drift highlighting
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PieChart, Calculator, TrendingUp, TrendingDown } from 'lucide-react';
import { AllocationDrift, RebalanceTrade } from '@/lib/rebalanceAuditEngine';

interface PortfolioDriftTableProps {
  driftAnalysis: AllocationDrift[];
  suggestedTrades: RebalanceTrade[];
  totalPortfolioValue: number;
}

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function PortfolioDriftTable({
  driftAnalysis,
  suggestedTrades,
  totalPortfolioValue,
}: PortfolioDriftTableProps) {
  const [showTradesDialog, setShowTradesDialog] = useState(false);
  const hasDrift = driftAnalysis.some(d => d.exceedsDriftThreshold);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            Portfolio Drift Analysis
          </CardTitle>
          <Button
            onClick={() => setShowTradesDialog(true)}
            disabled={suggestedTrades.length === 0}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            Calculate Rebalance Trades
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Class</TableHead>
                <TableHead className="text-right">Current %</TableHead>
                <TableHead className="text-right">Target %</TableHead>
                <TableHead className="text-right">Drift</TableHead>
                <TableHead className="text-right">$ Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {driftAnalysis.map((drift) => (
                <TableRow
                  key={drift.assetClass}
                  className={drift.exceedsDriftThreshold ? 'bg-destructive/10' : ''}
                >
                  <TableCell className="font-medium">{drift.assetClass}</TableCell>
                  <TableCell className="text-right font-mono">
                    {drift.currentPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {drift.targetPercent.toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono flex items-center justify-end gap-1 ${
                      drift.driftPercent > 0 ? 'text-chart-2' : drift.driftPercent < 0 ? 'text-destructive' : ''
                    }`}>
                      {drift.driftPercent > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : drift.driftPercent < 0 ? (
                        <TrendingDown className="h-3 w-3" />
                      ) : null}
                      {drift.driftPercent > 0 ? '+' : ''}{drift.driftPercent.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {drift.driftAmount > 0 ? '+' : ''}{formatCurrency(drift.driftAmount)}
                  </TableCell>
                  <TableCell className="text-center">
                    {drift.exceedsDriftThreshold ? (
                      <Badge variant="destructive">Rebalance</Badge>
                    ) : (
                      <Badge variant="secondary">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {hasDrift && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">
                ⚠️ One or more asset classes have drifted more than 5% from target. 
                Click "Calculate Rebalance Trades" to see recommended actions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rebalance Trades Dialog */}
      <Dialog open={showTradesDialog} onOpenChange={setShowTradesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Suggested Rebalance Trades
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Execute these trades to reset your portfolio to target allocation:
            </p>

            <div className="space-y-3">
              {suggestedTrades.map((trade, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    trade.action === 'SELL'
                      ? 'bg-destructive/10 border-destructive/30'
                      : 'bg-chart-2/10 border-chart-2/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={trade.action === 'SELL' ? 'destructive' : 'default'}>
                        {trade.action}
                      </Badge>
                      <span className="font-medium">{trade.assetClass}</span>
                    </div>
                    <span className="font-mono font-bold">
                      {formatCurrency(trade.amount)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{trade.reason}</p>
                </div>
              ))}
            </div>

            {suggestedTrades.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Your portfolio is well-balanced!</p>
                <p className="text-sm">No rebalancing trades needed.</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Note: These are suggestions only. Consider tax implications before executing trades.
                Selling in taxable accounts may trigger capital gains.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
