import { useState, useCallback } from 'react';
import { usePlaidLink as usePlaidLinkSDK, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UsePlaidLinkReturn {
  open: () => void;
  ready: boolean;
  isLoading: boolean;
  error: string | null;
  fetchLinkToken: () => Promise<void>;
}

export function usePlaidLink(onSuccess?: () => void): UsePlaidLinkReturn {
  const { session } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async () => {
    if (!session) {
      setError('Not authenticated');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-link-token', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      setLinkToken(data.link_token);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to initialize Plaid';
      console.error('Error fetching link token:', err);
      setError(message);
      toast.error('Failed to initialize bank connection', { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const handleSuccess: PlaidLinkOnSuccess = useCallback(async (publicToken, metadata) => {
    if (!session) return;

    setIsLoading(true);
    try {
      console.log('Plaid Link success, exchanging token...');
      
      const { data, error: fnError } = await supabase.functions.invoke('exchange-public-token', {
        body: { 
          public_token: publicToken,
          metadata: {
            institution: metadata.institution,
            accounts: metadata.accounts,
          },
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Bank accounts connected!', { 
        description: `Successfully linked ${data.accounts_linked} account(s)` 
      });
      
      // Clear link token so it can be re-fetched if needed
      setLinkToken(null);
      
      // Call success callback
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect accounts';
      console.error('Error exchanging token:', err);
      toast.error('Failed to connect accounts', { description: message });
    } finally {
      setIsLoading(false);
    }
  }, [session, onSuccess]);

  const config: PlaidLinkOptions = {
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: (err) => {
      if (err) {
        console.log('Plaid Link exit with error:', err);
      }
      setLinkToken(null);
    },
  };

  const { open, ready } = usePlaidLinkSDK(config);

  const openPlaid = useCallback(() => {
    open();
  }, [open]);

  return {
    open: openPlaid,
    ready: ready && !!linkToken,
    isLoading,
    error,
    fetchLinkToken,
  };
}
