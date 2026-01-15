import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const password = watch('password');

  useEffect(() => {
    // Preserve hash in URL for Supabase token processing
    // Supabase needs the hash parameters to process the recovery token
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      // Ensure hash persists in URL - Supabase will extract tokens from it
      // Don't manipulate the hash - let Supabase handle it
    }

    // Check if user has a valid session (from password recovery email)
    // Don't redirect away if we're already on this page - let the user reset their password
    const checkSession = async () => {
      // Check if we're in password recovery flow by looking at hash params
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // If there's an access_token in the hash, Supabase will handle it
      // Don't redirect immediately - wait for auth state to settle
      if (type === 'recovery' || accessToken) {
        // Supabase will process this automatically via onAuthStateChange
        // Give it time to process the token
        return;
      }

      // Only check session after a longer delay to let auth state fully settle
      // This ensures Supabase has time to process the recovery token from the hash
      const timer = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        // Only redirect if there's no session AND no recovery token in hash
        if (!session && !accessToken && !hash.includes('type=recovery') && window.location.pathname === '/reset-password') {
          toast.error('Invalid or expired reset link', {
            description: 'Please request a new password reset email.',
          });
          navigate('/auth');
        }
      }, 2000); // Increased delay to allow Supabase to process hash tokens

      return () => clearTimeout(timer);
    };

    checkSession();
  }, [navigate]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsResetting(true);

    try {
      // Verify we still have a valid session before updating password
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (!currentSession || sessionError) {
        throw new Error('Session expired. Please request a new password reset email.');
      }

      // Update password using Supabase auth
      // This will trigger USER_UPDATED event in AuthContext
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      // Wait a moment for the auth state to update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Log password change event
      if (currentSession.user) {
        try {
          await supabase.rpc('log_security_event', {
            p_user_id: currentSession.user.id,
            p_event_type: 'password_change',
            p_ip_address: null,
            p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
            p_metadata: { timestamp: new Date().toISOString() },
          });
        } catch (logError) {
          console.error('Failed to log password change:', logError);
          // Don't fail the reset if logging fails
        }
      }

      // Only show success and redirect AFTER password update is confirmed
      setIsSuccess(true);
      toast.success('Password reset successfully', {
        description: 'Redirecting to sign in...',
      });

      // OPTIONAL: Log user out to force them to sign in with new password
      // This verifies the new password works before accessing dashboard
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Sign out user to confirm new credentials work
      await supabase.auth.signOut();
      
      // Clear hash from URL
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      // Redirect to auth page to sign in with new password
      setTimeout(() => {
        navigate('/auth', { replace: true });
      }, 500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      toast.error('Password reset failed', {
        description: errorMessage,
      });
      setIsResetting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
          <div>
            <h1 className="text-2xl font-bold mb-2">Password Reset Successful</h1>
            <p className="text-muted-foreground">
              Your password has been updated. Redirecting to dashboard...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Reset Your Password</h1>
          <p className="text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
            {password && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Password must contain:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li className={password.length >= 8 ? 'text-success' : ''}>
                    At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(password) ? 'text-success' : ''}>
                    One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(password) ? 'text-success' : ''}>
                    One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(password) ? 'text-success' : ''}>
                    One number
                  </li>
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isResetting}>
            {isResetting ? 'Resetting Password...' : 'Reset Password'}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
