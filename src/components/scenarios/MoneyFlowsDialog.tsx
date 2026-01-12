import { useEffect, useState } from 'react';
import { Plus, Trash2, LinkIcon, Percent, DollarSign } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface MoneyFlow {
  id: string;
  contribution_name: string;
  account_type: string;
  annual_amount: number;
  is_income_linked: boolean;
  income_link_percentage: number | null;
  start_age: number;
  end_age: number;
  excess_income_enabled: boolean;
  excess_save_percentage: number | null;
  excess_target_account: string | null;
}

interface MoneyFlowsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ACCOUNT_TYPES = ['401k', 'IRA', 'Roth', 'Brokerage'];

export function MoneyFlowsDialog({ open, onOpenChange }: MoneyFlowsDialogProps) {
  const { user } = useAuth();
  const [flows, setFlows] = useState<MoneyFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Excess Income Rule (global setting)
  const [excessEnabled, setExcessEnabled] = useState(false);
  const [excessPercentage, setExcessPercentage] = useState(50);
  const [excessTargetAccount, setExcessTargetAccount] = useState('Brokerage');

  useEffect(() => {
    if (open && user) {
      fetchFlows();
    }
  }, [open, user]);

  const fetchFlows = async () => {
    try {
      const { data, error } = await supabase
        .from('money_flows')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setFlows(data || []);
      
      // Check if any flow has excess income enabled
      const excessFlow = data?.find(f => f.excess_income_enabled);
      if (excessFlow) {
        setExcessEnabled(true);
        setExcessPercentage(Number(excessFlow.excess_save_percentage) || 50);
        setExcessTargetAccount(excessFlow.excess_target_account || 'Brokerage');
      }
    } catch (err) {
      console.error('Error fetching money flows:', err);
      toast.error('Failed to load money flows');
    } finally {
      setLoading(false);
    }
  };

  const addContribution = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('money_flows')
        .insert({
          user_id: user.id,
          contribution_name: 'New Contribution',
          account_type: '401k',
          annual_amount: 0,
          is_income_linked: false,
          start_age: 25,
          end_age: 65,
        })
        .select()
        .single();

      if (error) throw error;
      setFlows([...flows, data]);
      toast.success('Contribution added');
    } catch (err) {
      console.error('Error adding contribution:', err);
      toast.error('Failed to add contribution');
    }
  };

  const updateFlow = async (id: string, updates: Partial<MoneyFlow>) => {
    try {
      const { error } = await supabase
        .from('money_flows')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      setFlows(flows.map(f => f.id === id ? { ...f, ...updates } : f));
    } catch (err) {
      console.error('Error updating flow:', err);
      toast.error('Failed to update');
    }
  };

  const deleteFlow = async (id: string) => {
    try {
      const { error } = await supabase
        .from('money_flows')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setFlows(flows.filter(f => f.id !== id));
      toast.success('Contribution removed');
    } catch (err) {
      console.error('Error deleting flow:', err);
      toast.error('Failed to delete');
    }
  };

  const saveExcessIncomeRule = async () => {
    if (!user || flows.length === 0) return;
    
    setSaving(true);
    try {
      // Update the first flow with excess income settings
      const firstFlowId = flows[0].id;
      
      // First, disable excess on all flows
      await supabase
        .from('money_flows')
        .update({ excess_income_enabled: false })
        .eq('user_id', user.id);

      // Then enable on the first one if enabled
      if (excessEnabled) {
        await supabase
          .from('money_flows')
          .update({
            excess_income_enabled: true,
            excess_save_percentage: excessPercentage,
            excess_target_account: excessTargetAccount,
          })
          .eq('id', firstFlowId);
      }

      toast.success('Excess income rule saved');
    } catch (err) {
      console.error('Error saving excess income rule:', err);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Money Flows</DialogTitle>
          <DialogDescription>
            Configure recurring contributions and withdrawal rules
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Recurring Contributions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recurring Contributions</h3>
              <Button variant="outline" size="sm" onClick={addContribution}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contribution
              </Button>
            </div>

            {flows.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No contributions configured. Add one to get started.
              </p>
            )}

            {flows.map((flow) => (
              <div key={flow.id} className="p-4 rounded-lg border border-border space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Input
                    value={flow.contribution_name}
                    onChange={(e) => updateFlow(flow.id, { contribution_name: e.target.value })}
                    className="flex-1"
                    placeholder="Contribution name"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFlow(flow.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Account Type</Label>
                    <Select
                      value={flow.account_type}
                      onValueChange={(value) => updateFlow(flow.id, { account_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Annual Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={flow.annual_amount}
                        onChange={(e) => updateFlow(flow.id, { annual_amount: Number(e.target.value) })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Start Age</Label>
                    <Input
                      type="number"
                      value={flow.start_age}
                      onChange={(e) => updateFlow(flow.id, { start_age: Number(e.target.value) })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">End Age</Label>
                    <Input
                      type="number"
                      value={flow.end_age}
                      onChange={(e) => updateFlow(flow.id, { end_age: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Income-Linked</p>
                      <p className="text-xs text-muted-foreground">Prioritize over expenses</p>
                    </div>
                  </div>
                  <Switch
                    checked={flow.is_income_linked}
                    onCheckedChange={(checked) => updateFlow(flow.id, { is_income_linked: checked })}
                  />
                </div>

                {flow.is_income_linked && (
                  <div className="space-y-2">
                    <Label className="text-xs">% of Income to Contribute</Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={flow.income_link_percentage || 0}
                        onChange={(e) => updateFlow(flow.id, { income_link_percentage: Number(e.target.value) })}
                        className="pl-9"
                        max={100}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Excess Income Rule */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-semibold">Excess Income Rule</h3>
            <p className="text-sm text-muted-foreground">
              Automatically save surplus income to a designated account
            </p>

            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div>
                <p className="text-sm font-medium">Enable Excess Income Savings</p>
                <p className="text-xs text-muted-foreground">If Surplus &gt; 0, save automatically</p>
              </div>
              <Switch
                checked={excessEnabled}
                onCheckedChange={setExcessEnabled}
              />
            </div>

            {excessEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Save % of Surplus</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={excessPercentage}
                      onChange={(e) => setExcessPercentage(Number(e.target.value))}
                      className="pl-9"
                      max={100}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Target Account</Label>
                  <Select value={excessTargetAccount} onValueChange={setExcessTargetAccount}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {flows.length > 0 && (
              <Button onClick={saveExcessIncomeRule} disabled={saving} className="w-full">
                {saving ? 'Saving...' : 'Save Excess Income Rule'}
              </Button>
            )}
          </div>

          {/* Withdrawal Hierarchy Info */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h3 className="font-semibold">Withdrawal Hierarchy</h3>
            <p className="text-sm text-muted-foreground">
              The simulation uses the traditional tax-efficient withdrawal order:
            </p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">1</span>
                <div>
                  <p className="text-sm font-medium">Taxable Accounts (Brokerage)</p>
                  <p className="text-xs text-muted-foreground">Withdraw first to preserve tax-advantaged growth</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">2</span>
                <div>
                  <p className="text-sm font-medium">Pre-tax Accounts (401k, IRA)</p>
                  <p className="text-xs text-muted-foreground">Draw down before Roth to manage tax brackets</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">3</span>
                <div>
                  <p className="text-sm font-medium">Roth Accounts</p>
                  <p className="text-xs text-muted-foreground">Last resort - tax-free growth continues longest</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
