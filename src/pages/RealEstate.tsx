import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, Building2, Plus, RefreshCw, TrendingUp, TrendingDown, DollarSign, Percent, Calendar, MapPin, Edit2, Trash2 } from 'lucide-react';
import { useProperties, PropertyFormData } from '@/hooks/useProperties';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from '@/components/dashboard/UpgradeModal';
import { TaxProfileCard } from '@/components/scenarios/TaxProfileCard';
import { RelocationExplorer } from '@/components/scenarios/RelocationExplorer';
import { useStateTaxRules } from '@/hooks/useStateTaxRules';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (rate: number) => {
  return `${rate.toFixed(2)}%`;
};

export default function RealEstate() {
  const {
    properties,
    primaryResidence,
    totalEquity,
    totalMortgageBalance,
    totalPropertyValue,
    isLoading,
    addProperty,
    updateProperty,
    deleteProperty,
    syncLiabilities,
  } = useProperties();

  const { isPro } = useSubscription();
  const { rules: stateTaxRules } = useStateTaxRules();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showFutureChanges, setShowFutureChanges] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingProperty, setEditingProperty] = useState<string | null>(null);

  const [formData, setFormData] = useState<PropertyFormData>({
    property_name: 'Primary Residence',
    property_type: 'primary_residence',
    estimated_value: 500000,
    mortgage_balance: 300000,
    mortgage_interest_rate: 6.5,
    mortgage_monthly_payment: 2500,
    mortgage_term_months: 360,
  });

  const [futureChanges, setFutureChanges] = useState({
    relocation_age: 70,
    relocation_sale_price: 600000,
    relocation_new_purchase_price: 400000,
    relocation_new_mortgage_amount: 0,
    relocation_new_interest_rate: 6.0,
    relocation_new_term_months: 180,
    relocation_state: '',
  });

  const handleSync = async () => {
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }
    setIsSyncing(true);
    await syncLiabilities();
    setIsSyncing(false);
  };

  const handleAddProperty = async () => {
    await addProperty(formData);
    setShowAddDialog(false);
    setFormData({
      property_name: 'Primary Residence',
      property_type: 'primary_residence',
      estimated_value: 500000,
      mortgage_balance: 300000,
      mortgage_interest_rate: 6.5,
      mortgage_monthly_payment: 2500,
      mortgage_term_months: 360,
    });
  };

  const handleUpdateFutureChanges = async () => {
    if (primaryResidence) {
      await updateProperty(primaryResidence.id, {
        ...futureChanges,
      });
      setShowFutureChanges(false);
    }
  };

  const handleEditProperty = (property: typeof properties[0]) => {
    setEditingProperty(property.id);
    setFormData({
      property_name: property.property_name,
      property_type: property.property_type,
      estimated_value: property.estimated_value,
      mortgage_balance: property.mortgage_balance,
      mortgage_interest_rate: property.mortgage_interest_rate,
      mortgage_monthly_payment: property.mortgage_monthly_payment,
      mortgage_term_months: property.mortgage_term_months,
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (editingProperty) {
      await updateProperty(editingProperty, formData);
      setShowEditDialog(false);
      setEditingProperty(null);
    }
  };

  const equity = primaryResidence 
    ? primaryResidence.estimated_value - primaryResidence.mortgage_balance 
    : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Home & Real Estate</h1>
            <p className="text-muted-foreground">Track your properties, mortgages, and equity</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleSync} disabled={isSyncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync Mortgages
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Property</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Property Name</Label>
                    <Input
                      value={formData.property_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, property_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Value</Label>
                    <Input
                      type="number"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: Number(e.target.value) }))}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Mortgage Balance</Label>
                    <Input
                      type="number"
                      value={formData.mortgage_balance}
                      onChange={(e) => setFormData(prev => ({ ...prev, mortgage_balance: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Interest Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.mortgage_interest_rate}
                        onChange={(e) => setFormData(prev => ({ ...prev, mortgage_interest_rate: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Monthly Payment</Label>
                      <Input
                        type="number"
                        value={formData.mortgage_monthly_payment}
                        onChange={(e) => setFormData(prev => ({ ...prev, mortgage_monthly_payment: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Loan Term (months)</Label>
                    <Input
                      type="number"
                      value={formData.mortgage_term_months}
                      onChange={(e) => setFormData(prev => ({ ...prev, mortgage_term_months: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button onClick={handleAddProperty}>Add Property</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Property Value</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalPropertyValue)}</div>
              <p className="text-xs text-muted-foreground">{properties.length} propert{properties.length !== 1 ? 'ies' : 'y'}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Mortgage Balance</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalMortgageBalance)}</div>
              <p className="text-xs text-muted-foreground">Outstanding debt</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Equity</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalEquity)}</div>
              <p className="text-xs text-muted-foreground">
                {totalPropertyValue > 0 ? `${((totalEquity / totalPropertyValue) * 100).toFixed(0)}% equity` : 'No properties'}
              </p>
            </CardContent>
          </Card>

          {/* Tax Profile Card */}
          <TaxProfileCard 
            currentState="GA" 
            relocationState={primaryResidence?.relocation_state}
          />
        </div>

        {/* Primary Residence Card */}
        {primaryResidence ? (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle>{primaryResidence.property_name}</CardTitle>
                    <CardDescription>
                      {primaryResidence.is_manual_entry ? 'Manual Entry' : 'Synced from Bank'}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditProperty(primaryResidence)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteProperty(primaryResidence.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Home Value */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>Estimated Value</span>
                  </div>
                  <div className="text-2xl font-semibold">{formatCurrency(primaryResidence.estimated_value)}</div>
                </div>

                {/* Mortgage Balance */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>Mortgage Balance</span>
                  </div>
                  <div className="text-2xl font-semibold text-destructive">
                    {formatCurrency(primaryResidence.mortgage_balance)}
                  </div>
                </div>

                {/* Monthly Payment */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Monthly Payment</span>
                  </div>
                  <div className="text-2xl font-semibold">
                    {formatCurrency(primaryResidence.mortgage_monthly_payment)}
                  </div>
                </div>

                {/* Equity */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    <span>Home Equity</span>
                  </div>
                  <div className="text-2xl font-semibold text-emerald-600">{formatCurrency(equity)}</div>
                  <p className="text-xs text-muted-foreground">
                    {primaryResidence.estimated_value > 0 
                      ? `${((equity / primaryResidence.estimated_value) * 100).toFixed(0)}% of value`
                      : ''}
                  </p>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Mortgage Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{formatPercent(primaryResidence.mortgage_interest_rate)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining Term</p>
                    <p className="font-medium">{Math.ceil(primaryResidence.mortgage_term_months / 12)} years</p>
                  </div>
                </div>
              </div>

              <Separator className="my-6" />

              {/* Future Changes Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">Future Changes to Primary Residence</h4>
                      <p className="text-sm text-muted-foreground">Plan for relocation or downsizing</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showFutureChanges || !!primaryResidence.relocation_age}
                      onCheckedChange={setShowFutureChanges}
                    />
                    <span className="text-sm text-muted-foreground">Enable</span>
                  </div>
                </div>

                {(showFutureChanges || primaryResidence.relocation_age) && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Relocation Age</Label>
                          <Input
                            type="number"
                            value={primaryResidence.relocation_age || futureChanges.relocation_age}
                            onChange={(e) => setFutureChanges(prev => ({ ...prev, relocation_age: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Expected Sale Price</Label>
                          <Input
                            type="number"
                            value={primaryResidence.relocation_sale_price || futureChanges.relocation_sale_price}
                            onChange={(e) => setFutureChanges(prev => ({ ...prev, relocation_sale_price: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>New Purchase Price</Label>
                          <Input
                            type="number"
                            value={primaryResidence.relocation_new_purchase_price || futureChanges.relocation_new_purchase_price}
                            onChange={(e) => setFutureChanges(prev => ({ ...prev, relocation_new_purchase_price: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>New Mortgage Amount</Label>
                          <Input
                            type="number"
                            value={primaryResidence.relocation_new_mortgage_amount || futureChanges.relocation_new_mortgage_amount}
                            onChange={(e) => setFutureChanges(prev => ({ ...prev, relocation_new_mortgage_amount: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>New Interest Rate (%)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={primaryResidence.relocation_new_interest_rate || futureChanges.relocation_new_interest_rate}
                            onChange={(e) => setFutureChanges(prev => ({ ...prev, relocation_new_interest_rate: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>New Term (months)</Label>
                          <Input
                            type="number"
                            value={primaryResidence.relocation_new_term_months || futureChanges.relocation_new_term_months}
                            onChange={(e) => setFutureChanges(prev => ({ ...prev, relocation_new_term_months: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Destination State</Label>
                          <Select
                            value={primaryResidence.relocation_state || futureChanges.relocation_state || ''}
                            onValueChange={(value) => setFutureChanges(prev => ({ ...prev, relocation_state: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                            <SelectContent>
                              {stateTaxRules.map((rule) => (
                                <SelectItem key={rule.state_code} value={rule.state_code}>
                                  {rule.state_name} ({rule.retirement_friendliness})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button onClick={handleUpdateFutureChanges}>Save Future Changes</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Primary Residence</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your home to track equity and include it in your retirement simulation
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Primary Residence
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Other Properties */}
        {properties.filter(p => p.property_type !== 'primary_residence').length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Other Properties</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {properties.filter(p => p.property_type !== 'primary_residence').map((property) => (
                <Card key={property.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-base">{property.property_name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditProperty(property)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteProperty(property.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Value</p>
                        <p className="font-medium">{formatCurrency(property.estimated_value)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Mortgage</p>
                        <p className="font-medium">{formatCurrency(property.mortgage_balance)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Monthly Payment</p>
                        <p className="font-medium">{formatCurrency(property.mortgage_monthly_payment)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Equity</p>
                        <p className="font-medium text-emerald-600">
                          {formatCurrency(property.estimated_value - property.mortgage_balance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Relocation Savings Explorer */}
        <RelocationExplorer
          currentState="GA"
          currentAge={55}
          retirementAge={65}
          monthlySpending={8000}
          portfolioValue={totalEquity + 500000}
          ssIncome={36000}
          homeEquity={totalEquity}
          onSelectDestination={(stateCode) => {
            if (primaryResidence) {
              setFutureChanges(prev => ({ ...prev, relocation_state: stateCode }));
              setShowFutureChanges(true);
            }
          }}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input
                value={formData.property_name}
                onChange={(e) => setFormData(prev => ({ ...prev, property_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Estimated Value</Label>
              <Input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: Number(e.target.value) }))}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Mortgage Balance</Label>
              <Input
                type="number"
                value={formData.mortgage_balance}
                onChange={(e) => setFormData(prev => ({ ...prev, mortgage_balance: Number(e.target.value) }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.mortgage_interest_rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, mortgage_interest_rate: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Monthly Payment</Label>
                <Input
                  type="number"
                  value={formData.mortgage_monthly_payment}
                  onChange={(e) => setFormData(prev => ({ ...prev, mortgage_monthly_payment: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Loan Term (months)</Label>
              <Input
                type="number"
                value={formData.mortgage_term_months}
                onChange={(e) => setFormData(prev => ({ ...prev, mortgage_term_months: Number(e.target.value) }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
    </DashboardLayout>
  );
}
