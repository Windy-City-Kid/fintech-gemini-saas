import { useState } from 'react';
import { Lock, Zap, TrendingUp, Building2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { startCheckout, isLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');

  const handleUpgrade = async () => {
    await startCheckout(selectedPlan);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Unlock Pro Features</DialogTitle>
          <DialogDescription className="text-center text-base">
            Unlock real-time Plaid syncing and 1,000+ retirement simulations with Pro.
          </DialogDescription>
        </DialogHeader>

        {/* Plan Selection */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <button
            onClick={() => setSelectedPlan('monthly')}
            className={cn(
              "relative p-4 rounded-lg border-2 text-left transition-all",
              selectedPlan === 'monthly'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            {selectedPlan === 'monthly' && (
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <p className="font-semibold">Monthly</p>
            <p className="text-2xl font-bold mt-1">$9<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
          </button>

          <button
            onClick={() => setSelectedPlan('annual')}
            className={cn(
              "relative p-4 rounded-lg border-2 text-left transition-all",
              selectedPlan === 'annual'
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            {selectedPlan === 'annual' && (
              <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
            <div className="absolute -top-2 left-3 px-2 py-0.5 bg-chart-2 text-chart-2-foreground text-xs font-medium rounded">
              Save 17%
            </div>
            <p className="font-semibold">Annual</p>
            <p className="text-2xl font-bold mt-1">$90<span className="text-sm font-normal text-muted-foreground">/yr</span></p>
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
            <div className="h-10 w-10 rounded-lg bg-chart-1/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="font-medium">Automatic Bank Syncing</p>
              <p className="text-sm text-muted-foreground">
                Connect 12,000+ institutions via Plaid for real-time balance updates
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
            <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="font-medium">Advanced Retirement Simulations</p>
              <p className="text-sm text-muted-foreground">
                Run 1,000+ Monte Carlo scenarios with custom market conditions
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30">
            <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="font-medium">Priority Support</p>
              <p className="text-sm text-muted-foreground">
                Get faster responses and dedicated assistance
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <Button 
            onClick={handleUpgrade} 
            size="lg" 
            className="w-full gap-2"
            disabled={isLoading}
          >
            <Zap className="h-4 w-4" />
            {selectedPlan === 'annual' ? 'Upgrade to Pro (Annual)' : 'Upgrade to Pro (Monthly)'}
          </Button>
          <Button 
            variant="ghost" 
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground"
          >
            Maybe later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
