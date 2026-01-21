/**
 * Paycheck Dashboard
 * Monthly view that compiles all sources into a single "retirement paycheck"
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Wallet, 
  ArrowRight, 
  Minus, 
  Equal, 
  Building2, 
  TrendingUp,
  Landmark,
  Send,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaycheckBreakdown } from '@/lib/bucketEngine';
import { toast } from 'sonner';

interface PaycheckDashboardProps {
  paycheck: PaycheckBreakdown;
  currentMonth?: Date;
}

export function PaycheckDashboard({ 
  paycheck, 
  currentMonth = new Date() 
}: PaycheckDashboardProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [bankAccount, setBankAccount] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const getSourceIcon = (type: 'guaranteed' | 'variable') => {
    return type === 'guaranteed' ? Landmark : TrendingUp;
  };

  const handleSendToBank = async () => {
    setIsSending(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSending(false);
    setHasSent(true);
    setSendDialogOpen(false);
    toast.success(`Transfer of ${formatCurrency(paycheck.netPaycheck)} initiated to ${bankAccount || 'your bank account'}`);
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Your Retirement Paycheck
            </CardTitle>
            <CardDescription>{monthName}</CardDescription>
          </div>
          <Badge variant="outline" className="text-lg font-bold py-1.5 px-4">
            {formatCurrency(paycheck.netPaycheck)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Income Sources Breakdown */}
        <div className="space-y-3">
          {/* Guaranteed Income */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Landmark className="h-4 w-4" />
              <span>Guaranteed Income</span>
            </div>
            {paycheck.sources
              .filter(s => s.type === 'guaranteed')
              .map((source, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between pl-6 py-2 border-l-2 border-success/50"
                >
                  <span className="text-sm">{source.name}</span>
                  <span className="font-medium text-success">
                    +{formatCurrency(source.amount)}
                  </span>
                </div>
              ))}
            {paycheck.sources.filter(s => s.type === 'guaranteed').length === 0 && (
              <div className="pl-6 py-2 text-sm text-muted-foreground italic">
                No guaranteed income configured
              </div>
            )}
          </div>

          {/* Variable Bucket Withdrawal */}
          {paycheck.bucketWithdrawal > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Variable Withdrawal</span>
              </div>
              <div 
                className="flex items-center justify-between pl-6 py-2 border-l-2 border-primary/50"
              >
                <span className="text-sm">From Cash Bucket</span>
                <span className="font-medium text-primary">
                  +{formatCurrency(paycheck.bucketWithdrawal)}
                </span>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Calculation Summary */}
        <div className="space-y-3 p-4 rounded-lg bg-muted/30">
          {/* Gross */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <span>Gross Income</span>
            </div>
            <span className="font-medium">{formatCurrency(paycheck.grossTotal)}</span>
          </div>

          {/* Taxes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Minus className="h-4 w-4 text-destructive" />
              <span>Estimated Taxes</span>
            </div>
            <span className="font-medium text-destructive">
              -{formatCurrency(paycheck.estimatedTaxes)}
            </span>
          </div>

          <Separator />

          {/* Net */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Equal className="h-4 w-4 text-primary" />
              <span>Net Paycheck</span>
            </div>
            <span className="text-xl font-bold text-primary">
              {formatCurrency(paycheck.netPaycheck)}
            </span>
          </div>
        </div>

        {/* Send to Bank Button */}
        <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full gap-2" 
              size="lg"
              variant={hasSent ? "outline" : "default"}
              disabled={hasSent}
            >
              {hasSent ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Transfer Initiated
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Send to Bank
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Transfer to Bank Account
              </DialogTitle>
              <DialogDescription>
                This is a mockup demonstrating the &quot;retirement paycheck&quot; transfer feature.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(paycheck.netPaycheck)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Typically arrives in 1-2 business days</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank-account">Bank Account (Last 4 digits)</Label>
                <Input
                  id="bank-account"
                  placeholder="e.g., 1234"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  maxLength={4}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendToBank} disabled={isSending}>
                {isSending ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Confirm Transfer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Disclaimer */}
        <p className="text-xs text-center text-muted-foreground">
          This is a planning estimate. Actual amounts may vary based on market conditions and tax situations.
        </p>
      </CardContent>
    </Card>
  );
}
