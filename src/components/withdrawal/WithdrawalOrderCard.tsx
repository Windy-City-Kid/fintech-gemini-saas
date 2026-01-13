import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  GripVertical, 
  Wallet, 
  PiggyBank, 
  TrendingDown,
  ArrowDown,
  Ban,
  Info,
} from 'lucide-react';
import { 
  WithdrawalAccount, 
  WithdrawalOrder,
  WITHDRAWAL_ORDER_DESCRIPTIONS,
  AccountTaxType,
} from '@/lib/withdrawalEngine';
import { WithdrawalOrderStrategy } from '@/hooks/useWithdrawalStrategy';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WithdrawalOrderCardProps {
  accounts: WithdrawalAccount[];
  sortedAccounts: WithdrawalAccount[];
  orderStrategy: WithdrawalOrderStrategy;
  customOrder: WithdrawalOrder[];
  onStrategyChange: (strategy: WithdrawalOrderStrategy) => void;
  onCustomOrderChange: (order: WithdrawalOrder[]) => void;
  onToggleExclusion: (accountId: string) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);

const getTypeIcon = (type: AccountTaxType) => {
  switch (type) {
    case 'taxable':
      return <Wallet className="h-4 w-4 text-blue-500" />;
    case 'pretax':
      return <PiggyBank className="h-4 w-4 text-orange-500" />;
    case 'roth':
      return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  }
};

const getTypeLabel = (type: AccountTaxType) => {
  switch (type) {
    case 'taxable':
      return 'Taxable';
    case 'pretax':
      return 'Tax-Deferred';
    case 'roth':
      return 'Roth';
  }
};

export function WithdrawalOrderCard({
  accounts,
  sortedAccounts,
  orderStrategy,
  customOrder,
  onStrategyChange,
  onCustomOrderChange,
  onToggleExclusion,
}: WithdrawalOrderCardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, accountId: string) => {
    setDraggedId(accountId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentOrder = customOrder.length > 0 
      ? [...customOrder]
      : accounts.map((acc, idx) => ({ accountId: acc.id, priority: idx }));

    const draggedIdx = currentOrder.findIndex(o => o.accountId === draggedId);
    const targetIdx = currentOrder.findIndex(o => o.accountId === targetId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    // Reorder
    const [removed] = currentOrder.splice(draggedIdx, 1);
    currentOrder.splice(targetIdx, 0, removed);

    // Reassign priorities
    const newOrder = currentOrder.map((o, idx) => ({ ...o, priority: idx }));
    onCustomOrderChange(newOrder);
    setDraggedId(null);
  };

  const displayAccounts = orderStrategy === 'custom' && customOrder.length > 0
    ? [...accounts].sort((a, b) => {
        const priorityA = customOrder.find(o => o.accountId === a.id)?.priority ?? 999;
        const priorityB = customOrder.find(o => o.accountId === b.id)?.priority ?? 999;
        return priorityA - priorityB;
      })
    : sortedAccounts;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ArrowDown className="h-5 w-5 text-primary" />
              Withdrawal Order
            </CardTitle>
            <CardDescription>
              Set the sequence for automated gap-filling withdrawals
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  When income doesn't cover expenses, the engine withdraws from accounts 
                  in this order. Within each category, lowest-return accounts are used first.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs 
          value={orderStrategy} 
          onValueChange={(v) => onStrategyChange(v as WithdrawalOrderStrategy)}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="traditional">Traditional</TabsTrigger>
            <TabsTrigger value="reverse">Reverse</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="traditional" className="mt-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-2">
                {WITHDRAWAL_ORDER_DESCRIPTIONS.traditional.name}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {WITHDRAWAL_ORDER_DESCRIPTIONS.traditional.description}
              </p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                  1. Taxable
                </Badge>
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                  2. Tax-Deferred
                </Badge>
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                  3. Roth
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reverse" className="mt-4">
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <p className="text-sm font-medium mb-2">
                {WITHDRAWAL_ORDER_DESCRIPTIONS.reverse.name}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {WITHDRAWAL_ORDER_DESCRIPTIONS.reverse.description}
              </p>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600">
                  1. Roth
                </Badge>
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-600">
                  2. Tax-Deferred
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                  3. Taxable
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Drag accounts to set your preferred withdrawal order:
            </p>
          </TabsContent>
        </Tabs>

        {/* Account List */}
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {orderStrategy === 'custom' ? 'Drag to reorder:' : 'Current order:'}
          </p>
          
          <div className="space-y-2">
            {displayAccounts.map((account, index) => (
              <div
                key={account.id}
                draggable={orderStrategy === 'custom'}
                onDragStart={(e) => handleDragStart(e, account.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, account.id)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-all
                  ${account.excludeFromWithdrawals 
                    ? 'bg-muted/30 border-dashed opacity-60' 
                    : 'bg-background border-border'}
                  ${orderStrategy === 'custom' ? 'cursor-grab active:cursor-grabbing' : ''}
                  ${draggedId === account.id ? 'opacity-50' : ''}
                `}
              >
                {orderStrategy === 'custom' && (
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                
                <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                  {index + 1}
                </span>
                
                {getTypeIcon(account.type)}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{account.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getTypeLabel(account.type)} • {formatCurrency(account.balance)}
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {account.excludeFromWithdrawals && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Ban className="h-3 w-3" />
                      Excluded
                    </Badge>
                  )}
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!account.excludeFromWithdrawals}
                            onCheckedChange={() => onToggleExclusion(account.id)}
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          {account.excludeFromWithdrawals 
                            ? 'Enable automatic withdrawals' 
                            : 'Exclude from automatic withdrawals'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            ))}
          </div>
          
          {displayAccounts.length === 0 && (
            <div className="p-6 text-center text-muted-foreground border border-dashed rounded-lg">
              <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No accounts available for withdrawals</p>
              <p className="text-xs">Add accounts in the Accounts section</p>
            </div>
          )}
        </div>

        {/* Exclusion Warning */}
        {accounts.some(a => a.excludeFromWithdrawals) && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              <strong>Note:</strong> Excluded accounts won't be touched during automated withdrawals. 
              If other funds are exhausted, this may result in "Lifetime Debt" rather than 
              accessing these accounts.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
