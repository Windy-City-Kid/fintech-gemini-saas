import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface SubscriptionState {
  isLoading: boolean;
  isPro: boolean;
  plan: 'free' | 'pro';
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isLoading: true,
    isPro: false,
    plan: 'free',
  });

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !session) {
        setState({ isLoading: false, isPro: false, plan: 'free' });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('check-subscription', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) throw error;

        setState({
          isLoading: false,
          isPro: data.subscribed,
          plan: data.plan,
        });
      } catch (error) {
        console.error('Error checking subscription:', error);
        setState({ isLoading: false, isPro: false, plan: 'free' });
      }
    };

    checkSubscription();
  }, [user, session]);

  const startCheckout = async () => {
    if (!session) return;

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { returnUrl: window.location.origin },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Error starting checkout:', error);
    }
  };

  return { ...state, startCheckout };
}
