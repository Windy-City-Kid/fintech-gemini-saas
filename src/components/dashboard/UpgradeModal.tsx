import { Lock, Zap, TrendingUp, Building2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSubscription } from '@/hooks/useSubscription';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  const { startCheckout, isLoading } = useSubscription();

  const handleUpgrade = async () => {
    await startCheckout();
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

        <div className="space-y-4 my-6">
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

        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleUpgrade} 
            size="lg" 
            className="w-full gap-2"
            disabled={isLoading}
          >
            <Zap className="h-4 w-4" />
            Upgrade to Pro
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
