/**
 * Charitable Bequests Manager
 * Allows users to add charitable donations that reduce taxable estate
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Heart, Plus, Trash2, Gift } from 'lucide-react';
import { CharitableBequest, formatEstateCurrency } from '@/lib/estateCalculator';

interface CharitableBequestsCardProps {
  bequests: CharitableBequest[];
  totalEstateValue: number;
  onAddBequest: (bequest: CharitableBequest) => void;
  onRemoveBequest: (index: number) => void;
}

export function CharitableBequestsCard({
  bequests,
  totalEstateValue,
  onAddBequest,
  onRemoveBequest,
}: CharitableBequestsCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isPercentage, setIsPercentage] = useState(false);

  const handleAdd = () => {
    if (!name || !amount) return;
    
    onAddBequest({
      name,
      amount: parseFloat(amount),
      isPercentage,
    });
    
    setName('');
    setAmount('');
    setIsPercentage(false);
    setShowForm(false);
  };

  const totalBequests = bequests.reduce((sum, b) => {
    if (b.isPercentage) {
      return sum + (totalEstateValue * b.amount / 100);
    }
    return sum + b.amount;
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5 text-chart-5" />
            Charitable Bequests
          </CardTitle>
          {totalBequests > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Gift className="h-3 w-3" />
              {formatEstateCurrency(totalBequests)} to Charity
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Charitable bequests are deducted from your taxable estate, potentially reducing estate taxes while supporting causes you care about.
        </p>

        {/* Existing Bequests */}
        {bequests.length > 0 && (
          <div className="space-y-2">
            {bequests.map((bequest, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
              >
                <div>
                  <p className="font-medium">{bequest.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {bequest.isPercentage 
                      ? `${bequest.amount}% of estate`
                      : formatEstateCurrency(bequest.amount)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveBequest(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Add Form */}
        {showForm ? (
          <div className="space-y-4 p-4 rounded-lg bg-muted/30 border border-border">
            <div>
              <Label htmlFor="charityName">Organization Name</Label>
              <Input
                id="charityName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., American Red Cross"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="charityAmount">
                {isPercentage ? 'Percentage of Estate' : 'Fixed Amount'}
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {isPercentage ? '%' : '$'}
                </span>
                <Input
                  id="charityAmount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={isPercentage ? 'e.g., 10' : 'e.g., 50000'}
                  className="pl-7"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  id="isPercentage"
                  checked={isPercentage}
                  onCheckedChange={setIsPercentage}
                />
                <Label htmlFor="isPercentage" className="text-sm">
                  Specify as percentage
                </Label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd} className="flex-1">
                Add Bequest
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={() => setShowForm(true)}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Charitable Bequest
          </Button>
        )}

        {/* Tax Benefit Note */}
        {bequests.length > 0 && (
          <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/20">
            <p className="text-sm text-chart-2">
              <strong>Tax Benefit:</strong> Your {formatEstateCurrency(totalBequests)} in charitable bequests 
              reduces your taxable estate, potentially saving up to {formatEstateCurrency(totalBequests * 0.4)} in estate taxes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
