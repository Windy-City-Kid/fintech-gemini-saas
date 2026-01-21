import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Early Interceptor Component
 * 
 * Runs BEFORE any other auth logic to check window.location.hash directly.
 * If hash contains type=recovery, immediately navigates to /reset-password
 * and prevents all other redirects.
 */
export function EarlyInterceptor({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // EARLY INTERCEPTOR: Check hash BEFORE any other auth logic
    // This runs synchronously on mount to prevent race conditions
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      
      if (hash.includes('type=recovery')) {
        // Force immediate navigation to reset-password and stop all other logic
        const resetUrl = `/reset-password${hash}`;
        
        // Use replace to prevent back navigation issues
        navigate(resetUrl, { replace: true });
        
        // Set localStorage flag as backup guard
        window.localStorage.setItem('is_resetting_password', 'true');
        
        // Early return - prevent any other logic from running
        return;
      }
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
}
