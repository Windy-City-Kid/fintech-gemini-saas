/**
 * Beneficiaries Table Component
 * Manages heir allocations with 10-year rule tax projections
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Users, Plus, Trash2, AlertTriangle, Info } from 'lucide-react';
import { useBeneficiaries, Beneficiary } from '@/hooks/useBeneficiaries';
import { formatEstateCurrency } from '@/lib/estateCalculator';

interface BeneficiariesTableProps {
  traditionalIraBalance: number;
}

export function BeneficiariesTable({ traditionalIraBalance }: BeneficiariesTableProps) {
  const {
    beneficiaries,
    isLoading,
    totalAllocation,
    isValidAllocation,
    addBeneficiary,
    updateBeneficiary,
    deleteBeneficiary,
    isAddingBeneficiary,
  } = useBeneficiaries();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState({
    name: '',
    relationship: 'child' as Beneficiary['relationship'],
    allocation_percentage: 0,
    receives_traditional_ira: false,
    estimated_marginal_rate: 0.32,
  });

  const handleAddBeneficiary = () => {
    addBeneficiary(newBeneficiary);
    setNewBeneficiary({
      name: '',
      relationship: 'child',
      allocation_percentage: 0,
      receives_traditional_ira: false,
      estimated_marginal_rate: 0.32,
    });
    setIsAddDialogOpen(false);
  };

  // Calculate 10-year rule tax leakage for non-spouse heirs
  const calculate10YearTaxLeakage = (beneficiary: Beneficiary) => {
    if (beneficiary.relationship === 'spouse' || !beneficiary.receives_traditional_ira) {
      return 0;
    }
    const iraShare = traditionalIraBalance * (beneficiary.allocation_percentage / 100);
    return iraShare * beneficiary.estimated_marginal_rate;
  };

  const relationshipLabels: Record<Beneficiary['relationship'], string> = {
    spouse: 'Spouse',
    child: 'Child',
    sibling: 'Sibling',
    other: 'Other',
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Beneficiaries
        </CardTitle>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Beneficiary
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Beneficiary</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newBeneficiary.name}
                  onChange={(e) => setNewBeneficiary({ ...newBeneficiary, name: e.target.value })}
                  placeholder="Enter beneficiary name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Select
                  value={newBeneficiary.relationship}
                  onValueChange={(value: Beneficiary['relationship']) =>
                    setNewBeneficiary({ ...newBeneficiary, relationship: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                    <SelectItem value="sibling">Sibling</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Allocation Percentage: {newBeneficiary.allocation_percentage}%</Label>
                <Slider
                  value={[newBeneficiary.allocation_percentage]}
                  onValueChange={([value]) =>
                    setNewBeneficiary({ ...newBeneficiary, allocation_percentage: value })
                  }
                  max={100}
                  step={1}
                />
              </div>
              {newBeneficiary.relationship !== 'spouse' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="receives_ira">Receives Traditional IRA</Label>
                    <Switch
                      id="receives_ira"
                      checked={newBeneficiary.receives_traditional_ira}
                      onCheckedChange={(checked) =>
                        setNewBeneficiary({ ...newBeneficiary, receives_traditional_ira: checked })
                      }
                    />
                  </div>
                  {newBeneficiary.receives_traditional_ira && (
                    <div className="space-y-2">
                      <Label>Estimated Marginal Tax Rate: {Math.round(newBeneficiary.estimated_marginal_rate * 100)}%</Label>
                      <Slider
                        value={[newBeneficiary.estimated_marginal_rate * 100]}
                        onValueChange={([value]) =>
                          setNewBeneficiary({ ...newBeneficiary, estimated_marginal_rate: value / 100 })
                        }
                        max={50}
                        step={1}
                      />
                    </div>
                  )}
                </>
              )}
              <Button
                onClick={handleAddBeneficiary}
                disabled={!newBeneficiary.name || isAddingBeneficiary}
                className="w-full"
              >
                {isAddingBeneficiary ? 'Adding...' : 'Add Beneficiary'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Allocation Status */}
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Total Allocation</span>
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${isValidAllocation ? 'text-chart-2' : 'text-destructive'}`}>
                {totalAllocation.toFixed(0)}%
              </span>
              {!isValidAllocation && beneficiaries.length > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Must equal 100%
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Beneficiaries Table */}
        {beneficiaries.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead className="text-right">Allocation</TableHead>
                <TableHead className="text-right">10-Year Rule Tax</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {beneficiaries.map((beneficiary) => {
                const taxLeakage = calculate10YearTaxLeakage(beneficiary);
                return (
                  <TableRow key={beneficiary.id}>
                    <TableCell className="font-medium">{beneficiary.name}</TableCell>
                    <TableCell>
                      <Badge variant={beneficiary.relationship === 'spouse' ? 'default' : 'secondary'}>
                        {relationshipLabels[beneficiary.relationship]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {beneficiary.allocation_percentage}%
                    </TableCell>
                    <TableCell className="text-right">
                      {taxLeakage > 0 ? (
                        <div className="flex items-center justify-end gap-1 text-destructive">
                          <span className="font-mono">{formatEstateCurrency(taxLeakage)}</span>
                          <Info className="h-3 w-3" />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBeneficiary(beneficiary.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No beneficiaries added yet</p>
            <p className="text-sm">Add beneficiaries to plan your estate distribution</p>
          </div>
        )}

        {/* 10-Year Rule Info */}
        {beneficiaries.some(b => b.relationship !== 'spouse' && b.receives_traditional_ira) && (
          <div className="mt-4 p-3 rounded-lg bg-chart-4/10 border border-chart-4/20">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-chart-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-chart-4">10-Year Distribution Rule</p>
                <p className="text-muted-foreground">
                  Non-spouse heirs must empty inherited Traditional IRAs within 10 years, 
                  triggering the estimated tax shown above.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
