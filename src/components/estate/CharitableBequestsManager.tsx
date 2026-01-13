/**
 * Charitable Bequests Manager
 * Full CRUD for charitable giving in estate planning
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Heart, Plus, Trash2, DollarSign, Percent } from 'lucide-react';
import { useCharitableBequests, CharitableBequest } from '@/hooks/useCharitableBequests';
import { formatEstateCurrency } from '@/lib/estateCalculator';

interface CharitableBequestsManagerProps {
  totalEstateValue: number;
}

export function CharitableBequestsManager({ totalEstateValue }: CharitableBequestsManagerProps) {
  const {
    bequests,
    isLoading,
    addBequest,
    deleteBequest,
    isAddingBequest,
  } = useCharitableBequests();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBequest, setNewBequest] = useState({
    organization_name: '',
    amount: 0,
    is_percentage: false,
  });

  const handleAddBequest = () => {
    addBequest(newBequest);
    setNewBequest({
      organization_name: '',
      amount: 0,
      is_percentage: false,
    });
    setIsAddDialogOpen(false);
  };

  const calculateBequestValue = (bequest: CharitableBequest) => {
    if (bequest.is_percentage) {
      return totalEstateValue * (bequest.amount / 100);
    }
    return bequest.amount;
  };

  const totalBequestsValue = bequests.reduce((sum, b) => sum + calculateBequestValue(b), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-chart-5" />
          Charitable Bequests
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Bequest
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Charitable Bequest</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="org_name">Organization Name</Label>
                <Input
                  id="org_name"
                  value={newBequest.organization_name}
                  onChange={(e) => setNewBequest({ ...newBequest, organization_name: e.target.value })}
                  placeholder="e.g., American Red Cross"
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Fixed Amount</span>
                </div>
                <Switch
                  checked={newBequest.is_percentage}
                  onCheckedChange={(checked) =>
                    setNewBequest({ ...newBequest, is_percentage: checked, amount: 0 })
                  }
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm">Percentage</span>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {newBequest.is_percentage ? 'Percentage of Estate' : 'Fixed Amount'}
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    value={newBequest.amount || ''}
                    onChange={(e) => setNewBequest({ ...newBequest, amount: parseFloat(e.target.value) || 0 })}
                    placeholder={newBequest.is_percentage ? 'e.g., 5' : 'e.g., 50000'}
                    className={newBequest.is_percentage ? 'pr-8' : 'pl-8'}
                  />
                  {newBequest.is_percentage ? (
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  ) : (
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                {newBequest.is_percentage && newBequest.amount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Estimated value: {formatEstateCurrency(totalEstateValue * (newBequest.amount / 100))}
                  </p>
                )}
              </div>
              <Button
                onClick={handleAddBequest}
                disabled={!newBequest.organization_name || newBequest.amount <= 0 || isAddingBequest}
                className="w-full"
              >
                {isAddingBequest ? 'Adding...' : 'Add Bequest'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {bequests.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bequests.map((bequest) => (
                  <TableRow key={bequest.id}>
                    <TableCell className="font-medium">{bequest.organization_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {bequest.is_percentage ? `${bequest.amount}%` : formatEstateCurrency(bequest.amount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-chart-5">
                      {formatEstateCurrency(calculateBequestValue(bequest))}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBequest(bequest.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Total Deduction */}
            <div className="mt-4 p-3 rounded-lg bg-chart-5/10 border border-chart-5/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Charitable Deduction</span>
                <span className="text-lg font-bold text-chart-5">
                  {formatEstateCurrency(totalBequestsValue)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Reduces your taxable estate dollar-for-dollar
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No charitable bequests added</p>
            <p className="text-sm">Add organizations to reduce your taxable estate</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
