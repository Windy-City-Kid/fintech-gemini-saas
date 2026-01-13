import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { usePlaidLink } from '@/hooks/usePlaidLink';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Connections() {
  const { open, ready, isLoading, isSyncing, fetchLinkToken } = usePlaidLink();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Connections"
        description="Connect your financial accounts for automatic syncing"
        previousPage={{ label: 'Summary', path: '/summary' }}
        nextPage={{ label: 'Accounts & Assets', path: '/accounts' }}
        showManageConnections={false}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Link Financial Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Securely connect your bank accounts, investment accounts, and credit cards using Plaid.
            </p>
            <div className="flex gap-3">
              <Button onClick={ready ? open : fetchLinkToken} disabled={isLoading || isSyncing}>
                {isLoading ? 'Initializing...' : isSyncing ? 'Syncing...' : 'Link Account'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Click "Link Account" above to connect your financial institutions.
            </p>
          </CardContent>
        </Card>

        <CategoryCard
          title="Manual Account Entry"
          subtitle="Add accounts that can't be connected automatically"
          icon={<CheckCircle2 className="h-5 w-5" />}
          onStart={() => navigate('/accounts')}
          startLabel="Add Manually"
        />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
