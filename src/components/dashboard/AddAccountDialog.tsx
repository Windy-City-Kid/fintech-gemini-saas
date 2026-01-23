import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const accountSchema = z.object({
  account_name: z.string().min(1, 'Account name is required'),
  institution_name: z.string().min(1, 'Institution name is required'),
  account_type: z.enum(['401k', 'IRA', 'Brokerage', 'Cash', 'Savings', 'Checking', 'HSA', 'Other']),
  current_balance: z.string().min(1, 'Balance is required'),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddAccountDialog({ open, onOpenChange, onSuccess }: AddAccountDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      account_type: '401k',
    },
  });

  const onSubmit = async (data: AccountFormData) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.from('accounts').insert({
        user_id: user.id,
        account_name: data.account_name,
        institution_name: data.institution_name,
        account_type: data.account_type,
        current_balance: parseFloat(data.current_balance.replace(/[^0-9.-]+/g, '')),
        is_manual_entry: true,
      });

      if (error) throw error;

      toast.success('Account added successfully');
      reset();
      onSuccess();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error('Failed to add account', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogDescription>
            Manually add a financial account to track your net worth.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account_name">Account Name</Label>
            <Input
              id="account_name"
              placeholder="My 401(k)"
              {...register('account_name')}
            />
            {errors.account_name && (
              <p className="text-sm text-destructive">{errors.account_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution_name">Institution</Label>
            <Input
              id="institution_name"
              placeholder="Fidelity"
              {...register('institution_name')}
            />
            {errors.institution_name && (
              <p className="text-sm text-destructive">{errors.institution_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">Account Type</Label>
            <Select 
              onValueChange={(value) => setValue('account_type', value as AccountFormData['account_type'])}
              defaultValue="401k"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="401k">401(k)</SelectItem>
                <SelectItem value="IRA">IRA</SelectItem>
                <SelectItem value="Brokerage">Brokerage</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Savings">Savings</SelectItem>
                <SelectItem value="Checking">Checking</SelectItem>
                <SelectItem value="HSA">HSA</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.account_type && (
              <p className="text-sm text-destructive">{errors.account_type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_balance">Current Balance</Label>
            <Input
              id="current_balance"
              placeholder="$50,000"
              {...register('current_balance')}
            />
            {errors.current_balance && (
              <p className="text-sm text-destructive">{errors.current_balance.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Adding...' : 'Add Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
