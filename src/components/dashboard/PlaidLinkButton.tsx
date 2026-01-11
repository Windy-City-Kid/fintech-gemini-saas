import { useEffect, useState } from 'react';
import { Building2, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlaidLink } from '@/hooks/usePlaidLink';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from './UpgradeModal';

interface PlaidLinkButtonProps {
  onSuccess?: () => void;
  autoOpen?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export function PlaidLinkButton({ 
  onSuccess, 
  autoOpen = false,
  variant = 'default',
  size = 'default',
  className 
}: PlaidLinkButtonProps) {
  const { isPro, isLoading: isSubscriptionLoading } = useSubscription();
  const { open, ready, isLoading, fetchLinkToken } = usePlaidLink(onSuccess);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Auto-fetch link token and open when ready (for Pro users)
  useEffect(() => {
    if (autoOpen && isPro && !hasAutoOpened && !isLoading) {
      fetchLinkToken();
      setHasAutoOpened(true);
    }
  }, [autoOpen, isPro, hasAutoOpened, isLoading, fetchLinkToken]);

  // Auto-open Plaid Link when ready
  useEffect(() => {
    if (autoOpen && ready && hasAutoOpened) {
      open();
    }
  }, [autoOpen, ready, hasAutoOpened, open]);

  const handleClick = async () => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    if (!ready) {
      await fetchLinkToken();
    }
  };

  // Open Plaid Link when token is ready
  useEffect(() => {
    if (ready && !autoOpen) {
      open();
    }
  }, [ready, open, autoOpen]);

  const isButtonLoading = isLoading || isSubscriptionLoading;

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isButtonLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isButtonLoading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : isPro ? (
          <Building2 className="h-4 w-4 mr-2" />
        ) : (
          <Lock className="h-4 w-4 mr-2" />
        )}
        {isButtonLoading ? 'Connecting...' : 'Connect Bank Account'}
      </Button>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </>
  );
}
