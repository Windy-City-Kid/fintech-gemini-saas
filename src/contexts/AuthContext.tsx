import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isRecovering: boolean; // Flag to disable dashboard redirects during password recovery
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// VITE-COMPATIBLE EXPORT: Component as named export (stable for Fast Refresh)
// Fast Refresh requires components to be exported in a stable way
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false); // Local state for recovery mode
  const previousUserRef = useRef<User | null>(null);
  const passwordRecoveryRef = useRef<boolean>(false);

  useEffect(() => {
    // Helper function to log security events
    const logSecurityEvent = async (
      userId: string,
      eventType: 'login' | 'logout' | 'password_reset' | 'password_change' | 'email_change' | 'mfa_enabled' | 'mfa_disabled' | 'account_created',
      metadata?: Record<string, unknown>
    ) => {
      try {
        // Get IP address from headers (proxy-aware)
        const ipAddress = typeof window !== 'undefined' 
          ? (window as unknown as { ip?: string }).ip || null
          : null;
        const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : null;

        // Call database function to log security event
        const { error } = await supabase.rpc('log_security_event', {
          p_user_id: userId,
          p_event_type: eventType,
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
          p_metadata: metadata || null,
        });

        if (error) {
          console.error('Failed to log security event:', error);
        }
      } catch (error) {
        console.error('Error logging security event:', error);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // RECOVERY GUARD (Priority #1): Check for recovery indicators BEFORE any other logic
        // This must be the FIRST check to prevent any dashboard redirects
        if (typeof window !== 'undefined') {
          const hash = window.location.hash;
          const isRecoveryFlow = hash.includes('type=recovery') || event === 'PASSWORD_RECOVERY';
          
          // If we're in recovery flow, immediately navigate to reset-password with hash preserved
          if (isRecoveryFlow) {
            passwordRecoveryRef.current = true;
            setIsRecovering(true); // Set state to disable dashboard redirects
            
            // Set localStorage flag as backup guard
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('is_resetting_password', 'true');
            }
            
            // Log the password reset event
            if (session?.user && event === 'PASSWORD_RECOVERY') {
              await logSecurityEvent(session.user.id, 'password_reset', {
                timestamp: new Date().toISOString(),
              });
            }
            
            // Navigate to reset-password with hash preserved (if not already there)
            if (window.location.pathname !== '/reset-password') {
              // Preserve hash in URL - Supabase needs it to process the recovery token
              const resetUrl = hash 
                ? `/reset-password${hash}` 
                : '/reset-password';
              // Use href instead of replace to ensure hash is properly handled
              window.location.href = resetUrl;
              return; // Exit IMMEDIATELY - don't update state or process other events
            }
            
            // If already on reset-password, just ensure we don't process other redirects
            if (window.location.pathname === '/reset-password') {
              // Update state but don't trigger any redirects
              setSession(session);
              setUser(session?.user ?? null);
              previousUserRef.current = session?.user ?? null;
              setLoading(false);
              return; // Exit early to prevent dashboard redirect
            }
          }
        }

        // PRIORITY 2: Handle PASSWORD_RECOVERY event (if not caught by hash check above)
        if (event === 'PASSWORD_RECOVERY' && session?.user) {
          passwordRecoveryRef.current = true;
          setIsRecovering(true); // Set state to disable dashboard redirects
          
          // Set localStorage flag as backup guard
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('is_resetting_password', 'true');
          }
          
          // Log the password reset event
          await logSecurityEvent(session.user.id, 'password_reset', {
            timestamp: new Date().toISOString(),
          });
          
          // Redirect IMMEDIATELY to reset password page with hash preserved
          if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
            const hash = window.location.hash;
            // Preserve hash - Supabase needs it to process recovery token
            const resetUrl = hash 
              ? `/reset-password${hash}` 
              : '/reset-password';
            window.location.href = resetUrl;
            return; // Exit early - don't update state or process other events
          }
        }

        // Only update state and process other events if we're NOT in password recovery mode
        // Allow USER_UPDATED to process even during recovery (password change completion)
        if (!passwordRecoveryRef.current || event === 'USER_UPDATED') {
          // If we're on reset-password page during USER_UPDATED, don't process SIGNED_IN redirects
          if (event === 'SIGNED_IN' && passwordRecoveryRef.current && typeof window !== 'undefined') {
            if (window.location.pathname === '/reset-password') {
              // User is on reset password page - don't redirect
              setSession(session);
              setUser(session?.user ?? null);
              previousUserRef.current = session?.user ?? null;
              setLoading(false);
              return; // Exit early to prevent redirect
            }
          }
          const previousUser = previousUserRef.current;
          setSession(session);
          setUser(session?.user ?? null);
          previousUserRef.current = session?.user ?? null;
          setLoading(false);

          // Log security events for other event types
          if (session?.user) {
            switch (event) {
              case 'SIGNED_IN':
                // Skip logging if we're in password recovery mode (already logged)
                if (!passwordRecoveryRef.current) {
                  // Only log if this is a new sign-in (not initial session load)
                  if (previousUser?.id !== session.user.id) {
                    await logSecurityEvent(session.user.id, 'login', {
                      timestamp: new Date().toISOString(),
                    });
                  }
                }
                break;
              case 'USER_UPDATED':
                // Check if password or email was changed
                if (previousUser?.email !== session.user.email) {
                  await logSecurityEvent(session.user.id, 'email_change', {
                    timestamp: new Date().toISOString(),
                  });
                }
                // Reset password recovery flag after successful password update
                if (passwordRecoveryRef.current) {
                  passwordRecoveryRef.current = false;
                  setIsRecovering(false); // Clear recovery state to allow normal redirects
                  
                  // Cleanup localStorage flag
                  if (typeof window !== 'undefined') {
                    window.localStorage.removeItem('is_resetting_password');
                  }
                }
                break;
              default:
                break;
            }
          } else if (event === 'SIGNED_OUT' && previousUser) {
            await logSecurityEvent(previousUser.id, 'logout', {
              timestamp: new Date().toISOString(),
            });
            previousUserRef.current = null;
            passwordRecoveryRef.current = false;
            setIsRecovering(false); // Clear recovery state on sign out
            
            // Cleanup localStorage flag on sign out
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('is_resetting_password');
            }
          }
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      previousUserRef.current = session?.user ?? null;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    // FRONTEND SAFETY: Ensure we don't send null/undefined for required fields
    // Verify client-side call - ensure it isn't sending 'null' for required fields like full_name or email
    
    // Validate email is not null or undefined
    if (!email || email.trim() === '') {
      return { error: new Error('Email is required') };
    }
    
    // Validate password is not empty
    if (!password || password.trim() === '') {
      return { error: new Error('Password is required') };
    }
    
    // FRONTEND SAFETY: Ensure full_name is either a valid string or completely omitted
    // Only include full_name in metadata if it's actually provided and not empty
    // Never send null, undefined, or empty string - this prevents database errors
    const userMetadata: Record<string, string> = {};
    if (fullName && typeof fullName === 'string' && fullName.trim() !== '') {
      userMetadata.full_name = fullName.trim();
    }
    // If fullName is not provided or is empty, we don't include it in metadata at all
    // This prevents undefined/null from being sent to the database
    
    // SUPABASE CONFIG: Explicitly set emailRedirectTo to window.location.origin + '/dashboard'
    // This ensures Supabase redirects new users to the dashboard after email confirmation
    const redirectUrl = window.location.origin + '/dashboard';
    
    // Build options object - only include data if we have valid metadata
    // This ensures we never send empty objects or undefined values
    const signUpOptions: {
      emailRedirectTo: string;
      data?: Record<string, string>;
    } = {
      emailRedirectTo: redirectUrl,
    };
    
    // Only include data if we have at least one valid metadata field
    // This prevents sending empty objects or undefined metadata
    if (Object.keys(userMetadata).length > 0) {
      signUpOptions.data = userMetadata;
    }
    // If userMetadata is empty, we don't include the data field at all
    // This prevents Supabase from receiving undefined or empty metadata
    
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: signUpOptions,
    });
    
    // Log account creation
    if (data.user && !error) {
      try {
        await supabase.rpc('log_security_event', {
          p_user_id: data.user.id,
          p_event_type: 'account_created',
          p_ip_address: null,
          p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          p_metadata: { timestamp: new Date().toISOString() },
        });
      } catch (logError) {
        console.error('Failed to log account creation:', logError);
      }
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // SUPABASE CONFIG: Explicitly set redirectTo to window.location.origin + '/reset-password'
    // This ensures Supabase redirects to the reset page, not dashboard
    const redirectUrl = window.location.origin + '/reset-password';
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isRecovering, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// VITE-COMPATIBLE EXPORT: Hook as named export (stable for Fast Refresh)
// Hooks should be exported separately from components to prevent HMR invalidation
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Default export for backward compatibility (not recommended but prevents breaking changes)
export default AuthProvider;
