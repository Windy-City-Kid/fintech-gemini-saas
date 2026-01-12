import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionState {
  isLoading: boolean;
  isPro: boolean;
  plan: 'free' | 'pro';
}

// Cache subscription status to prevent excessive API calls
let cachedState: SubscriptionState | null = null;
let lastCheckTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>(
    cachedState || {
      isLoading: true,
      isPro: false,
      plan: 'free',
    }
  );
  const isChecking = useRef(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !session) {
        const newState = { isLoading: false, isPro: false, plan: 'free' as const };
        setState(newState);
        cachedState = newState;
        return;
      }

      // Use cached result if available and not expired
      const now = Date.now();
      if (cachedState && now - lastCheckTime < CACHE_DURATION) {
        setState(cachedState);
        return;
      }

      // Prevent concurrent checks
      if (isChecking.current) return;
      isChecking.current = true;

      try {
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;

        const newState = {
          isLoading: false,
          isPro: data.subscribed,
          plan: data.plan,
        };
        setState(newState);
        cachedState = newState;
        lastCheckTime = Date.now();
      } catch (error) {
        console.error('Error checking subscription:', error);
        const newState = { isLoading: false, isPro: false, plan: 'free' as const };
        setState(newState);
        cachedState = newState;
      } finally {
        isChecking.current = false;
      }
    };

    checkSubscription();
  }, [user, session]);

  const startCheckout = useCallback(async (plan: 'monthly' | 'annual' = 'monthly') => {
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { returnUrl: window.location.origin, plan },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.url) {
        // Open in new tab to prevent app from hanging
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
    }
  }, [session]);

  return { ...state, startCheckout };
}
