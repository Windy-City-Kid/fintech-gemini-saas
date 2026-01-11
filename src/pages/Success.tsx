import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ComplianceHeader } from '@/components/layout/ComplianceHeader';
import { PlaidLinkButton } from '@/components/dashboard/PlaidLinkButton';

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showPlaidPrompt, setShowPlaidPrompt] = useState(false);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // After a brief celebration delay, show Plaid prompt
    const timer = setTimeout(() => {
      setShowPlaidPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleSuccess = () => {
    // Navigate to dashboard after successful bank connection
    navigate('/');
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen">
      <ComplianceHeader />
      
      <div className="min-h-screen flex items-center justify-center p-8 pt-16">
        <div className="max-w-md w-full text-center">
          {/* Success animation */}
          <div className="mb-8 animate-fade-in">
            <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse-glow">
              <CheckCircle className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Account Upgraded!</h1>
            <p className="text-muted-foreground">
              Welcome to WealthPlan Pro. You now have access to all premium features.
            </p>
          </div>

          {/* Plaid connection prompt */}
          {showPlaidPrompt && (
            <div className="animate-fade-in space-y-6">
              <div className="stat-card p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-chart-2" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold">Connect Your First Bank</h3>
                    <p className="text-sm text-muted-foreground">
                      Start syncing your accounts automatically
                    </p>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6">
                  Connect to 12,000+ financial institutions and see your complete net worth 
                  update in real-time.
                </p>

                <div className="flex flex-col gap-3">
                  <PlaidLinkButton 
                    onSuccess={handleSuccess} 
                    size="lg" 
                    className="w-full"
                  />
                  <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                    Skip for now
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                🔒 Bank connections are secured with 256-bit encryption via Plaid
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
