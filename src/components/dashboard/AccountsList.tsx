import { useState } from 'react';
import { Plus, Building2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddAccountDialog } from './AddAccountDialog';
import { PlaidLinkButton } from './PlaidLinkButton';
import { cn } from '@/lib/utils';

interface Account {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  current_balance: number;
  is_manual_entry: boolean;
}

interface AccountsListProps {
  accounts: Account[];
  onRefresh: () => void;
}

const accountTypeColors: Record<string, string> = {
  '401k': 'bg-chart-1/20 text-chart-1',
  'IRA': 'bg-chart-2/20 text-chart-2',
  'Brokerage': 'bg-chart-3/20 text-chart-3',
  'Cash': 'bg-chart-4/20 text-chart-4',
  'Savings': 'bg-chart-4/20 text-chart-4',
  'Checking': 'bg-chart-4/20 text-chart-4',
  'HSA': 'bg-chart-2/20 text-chart-2',
  'Other': 'bg-muted text-muted-foreground',
};

export function AccountsList({ accounts, onRefresh }: AccountsListProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const manualAccounts = accounts.filter(a => a.is_manual_entry);
  const linkedAccounts = accounts.filter(a => !a.is_manual_entry);

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Accounts</h3>
          <p className="text-sm text-muted-foreground">
            {linkedAccounts.length > 0 ? `${linkedAccounts.length} linked, ${manualAccounts.length} manual` : 'Manual entry accounts'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PlaidLinkButton 
            onSuccess={onRefresh} 
            size="sm" 
            variant="outline"
          />
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Manual
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">No accounts added yet</p>
          <p className="text-xs mt-1">Add your first account to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{account.account_name}</p>
                  <p className="text-sm text-muted-foreground">{account.institution_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  accountTypeColors[account.account_type] || accountTypeColors['Other']
                )}>
                  {account.account_type}
                </span>
                <span className="font-mono font-semibold text-lg">
                  {formatCurrency(account.current_balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddAccountDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          setIsAddDialogOpen(false);
          onRefresh();
        }}
      />
    </div>
  );
}
