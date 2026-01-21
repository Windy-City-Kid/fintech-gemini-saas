import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Recovery Guard Component
 * 
 * URL-Based Interception: Checks window.location.hash BEFORE anything else.
 * If hash contains type=recovery, immediately navigates to /reset-password
 * This prevents auto-login redirects to dashboard.
 */
export function RecoveryGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // PRIORITY #1: Check hash for recovery indicators before any other logic
    const hash = window.location.hash;
    const isRecoveryFlow = hash.includes('type=recovery');

    if (isRecoveryFlow && location.pathname !== '/reset-password') {
      // Immediately navigate to reset-password with hash preserved
      const resetUrl = `/reset-password${hash}`;
      navigate(resetUrl, { replace: true });
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
}
