import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Mail, Lock, User, ArrowRight, AlertCircle, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().optional(),
});

type AuthFormData = z.infer<typeof authSchema>;

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { signIn, signUp, user, resetPassword } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, reset } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
  });

  // THE SCALPEL FOR RESET: Only in Auth component, check for recovery hash
  // If window.location.hash contains type=recovery, then and ONLY then, navigate to /reset-password
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) {
        navigate('/reset-password' + hash, { replace: true });
      }
    }
  }, [navigate]);

  // Handle authenticated user redirect (only for sign-in, not signup)
  useEffect(() => {
    if (user && !signupSuccess) {
      // User is authenticated and NOT in signup success state - redirect to dashboard/onboarding
      const checkOnboarding = async () => {
        const { data: scenarios } = await supabase
          .from('scenarios')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1);
        
        if (scenarios && scenarios.length > 0) {
          navigate('/');
        } else {
          navigate('/onboarding');
        }
      };
      checkOnboarding();
    }
  }, [user, signupSuccess, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setIsLoading(true);
    try {
      if (isSignUp) {
        const { error } = await signUp(data.email, data.password, data.fullName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Account already exists', { 
              description: 'Please sign in instead or use a different email.' 
            });
          } else {
            throw error;
          }
          setSignupSuccess(false);
        } else {
          // FIX: Show 'Check your email' message instead of forcing redirect
          // After supabase.auth.signUp, if no error, show message and don't redirect
          setSignupSuccess(true);
          toast.success('Account created!', { 
            description: 'Please check your email to verify your account.' 
          });
          reset();
          // DO NOT redirect - user stays on auth page to see success message
        }
      } else {
        const { error } = await signIn(data.email, data.password);
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid credentials', { 
              description: 'Please check your email and password.' 
            });
          } else {
            throw error;
          }
        }
        // Sign-in success - useEffect will handle redirect
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Authentication failed', { description: errorMessage });
      setSignupSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 30% 20%, hsl(152 76% 45% / 0.15) 0%, transparent 50%)',
        }} />
        
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <span className="text-2xl font-semibold">WealthPlan Pro</span>
          </div>
          
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Take Control of Your
            <br />
            <span className="text-primary">Financial Future</span>
          </h1>
          
          <p className="text-muted-foreground text-lg max-w-md mb-8">
            Comprehensive retirement planning with real-time portfolio tracking, 
            scenario modeling, and secure data management.
          </p>

          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <KeyRound className="h-4 w-4 text-primary" />
              </div>
              <span className="text-muted-foreground">Bank-level security & encryption</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <span className="text-muted-foreground">MFA-ready authentication</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold">WealthPlan Pro</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">
              {signupSuccess ? 'Check your email' : (isSignUp ? 'Create your account' : 'Welcome back')}
            </h2>
            <p className="text-muted-foreground">
              {signupSuccess 
                ? 'We sent you a verification email. Click the link in the email to activate your account.'
                : (isSignUp 
                  ? 'Start planning your financial future today' 
                  : 'Sign in to access your dashboard')}
            </p>
          </div>

          {signupSuccess ? (
            <div className="space-y-4 p-6 rounded-lg bg-muted/30 border border-border">
              <p className="text-sm text-muted-foreground text-center">
                Check your email inbox (and spam folder) for the verification link.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSignupSuccess(false);
                  setIsSignUp(false);
                  reset();
                }}
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    className="pl-10"
                    {...register('fullName')}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-10"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('password')}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={isLoading}>
              {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          )}

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={async () => {
                  const email = (document.getElementById('email') as HTMLInputElement)?.value;
                  if (!email) {
                    toast.error('Please enter your email address');
                    return;
                  }
                  setIsResetting(true);
                  const { error } = await resetPassword(email);
                  setIsResetting(false);
                  if (error) {
                    toast.error('Failed to send reset email', { description: error.message });
                  } else {
                    toast.success('Reset email sent', {
                      description: 'Check your email for password reset instructions.',
                    });
                  }
                }}
                disabled={isResetting}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {isResetting ? 'Sending...' : 'Forgot password?'}
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"}
            </button>
          </div>

          <div className="mt-8 p-4 rounded-lg bg-muted/30 border border-border">
            <p className="text-xs text-muted-foreground text-center">
              🔒 MFA Placeholder: Multi-factor authentication will be enabled in a future update 
              for enhanced security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
