import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink as usePlaidLinkSDK, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UsePlaidLinkReturn {
  open: () => void;
  ready: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  isResuming: boolean;
  error: string | null;
  fetchLinkToken: () => Promise<void>;
}

// Storage key for OAuth state
const PLAID_OAUTH_STATE_KEY = 'plaid_oauth_state';

export function usePlaidLink(onSuccess?: () => void): UsePlaidLinkReturn {
  const { session } = useAuth();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receivedRedirectUri, setReceivedRedirectUri] = useState<string | null>(null);

  // Check for OAuth redirect on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStateId = params.get('oauth_state_id');
    
    if (oauthStateId) {
      console.log('Detected OAuth redirect, resuming Plaid Link...');
      setIsResuming(true);
      
      // Store the full redirect URI for Plaid
      setReceivedRedirectUri(window.location.href);
      
      // Retrieve stored link token
      const storedState = localStorage.getItem(PLAID_OAUTH_STATE_KEY);
      if (storedState) {
        try {
          const { linkToken: storedToken, timestamp } = JSON.parse(storedState);
          // Check if token is less than 30 minutes old
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            setLinkToken(storedToken);
          } else {
            console.warn('Stored link token expired');
            localStorage.removeItem(PLAID_OAUTH_STATE_KEY);
            setIsResuming(false);
            toast.error('Session expired', { description: 'Please try connecting your bank again.' });
          }
        } catch (e) {
          console.error('Failed to parse stored OAuth state:', e);
          setIsResuming(false);
        }
      } else {
        console.warn('No stored link token found for OAuth resume');
        setIsResuming(false);
        toast.error('Session not found', { description: 'Please try connecting your bank again.' });
      }
      
      // Clean up URL params without page reload
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);

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

      // Store link token for OAuth redirect resume
      localStorage.setItem(PLAID_OAUTH_STATE_KEY, JSON.stringify({
        linkToken: data.link_token,
        timestamp: Date.now(),
      }));

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

    setIsSyncing(true);
    setIsResuming(false);
    
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
      
      // Clear link token and OAuth state
      setLinkToken(null);
      setReceivedRedirectUri(null);
      localStorage.removeItem(PLAID_OAUTH_STATE_KEY);
      
      // Call success callback
      onSuccess?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to connect accounts';
      console.error('Error exchanging token:', err);
      toast.error('Failed to connect accounts', { description: message });
    } finally {
      setIsSyncing(false);
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
      setReceivedRedirectUri(null);
      setIsResuming(false);
      localStorage.removeItem(PLAID_OAUTH_STATE_KEY);
    },
    // Include receivedRedirectUri for OAuth flow resumption
    ...(receivedRedirectUri && { receivedRedirectUri }),
  };

  const { open, ready } = usePlaidLinkSDK(config);
  
  // Auto-open Plaid Link when resuming from OAuth redirect
  useEffect(() => {
    if (receivedRedirectUri && linkToken && ready) {
      console.log('Auto-opening Plaid Link to resume OAuth flow');
      open();
    }
  }, [receivedRedirectUri, linkToken, ready, open]);

  const openPlaid = useCallback(() => {
    open();
  }, [open]);

  return {
    open: openPlaid,
    ready: ready && !!linkToken,
    isLoading,
    isSyncing,
    isResuming,
    error,
    fetchLinkToken,
  };
}
