/**
 * Bucket Manager - Main Container Component
 * Orchestrates the Three-Bucket Architecture view
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings2,
  TrendingUp,
  TrendingDown,
  Droplets,
  BarChart3,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import { BucketStatusChart } from './BucketStatusChart';
import { RefillRuleEngine } from './RefillRuleEngine';
import { PaycheckDashboard } from './PaycheckDashboard';
import { useBucketStrategy, BucketSettings } from '@/hooks/useBucketStrategy';
import { toast } from 'sonner';

export function BucketManager() {
  const {
    settings,
    bucketAnalysis,
    paycheck,
    refillHistory,
    loading,
    annualExpenses,
    updateSettings,
    executeRefill,
    setAnnualExpenses,
  } = useBucketStrategy();

  const [localExpenses, setLocalExpenses] = useState(annualExpenses);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!settings || !bucketAnalysis || !paycheck) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Droplets className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Unable to load bucket strategy. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  const handleExpensesUpdate = () => {
    setAnnualExpenses(localExpenses);
    toast.success('Annual expenses updated');
  };

  const handleYtdReturnChange = (bucket: 'bucket2' | 'bucket3', value: number) => {
    if (bucket === 'bucket2') {
      updateSettings({ bucket2_ytd_return: value });
    } else {
      updateSettings({ bucket3_ytd_return: value });
    }
  };

  const handleTargetYearsChange = (bucket: 'bucket1' | 'bucket2' | 'bucket3', value: number) => {
    updateSettings({ [`${bucket}_target_years`]: value } as Partial<BucketSettings>);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Droplets className="h-6 w-6 text-primary" />
            Retirement Paycheck & Buckets
          </h2>
          <p className="text-muted-foreground">
            Three-bucket strategy with automated refill logic
          </p>
        </div>
        <Badge variant="outline" className="text-sm py-1.5 px-3">
          {bucketAnalysis.totalYearsCovered.toFixed(1)} years covered
        </Badge>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Paycheck</span>
          </TabsTrigger>
          <TabsTrigger value="buckets" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Bucket Status</span>
          </TabsTrigger>
          <TabsTrigger value="refill" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refill Engine</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Paycheck Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <PaycheckDashboard paycheck={paycheck} />
            
            {/* Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Monthly Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-success/10">
                      <p className="text-xs text-muted-foreground">Guaranteed</p>
                      <p className="text-lg font-bold text-success">
                        ${paycheck.guaranteedIncome.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-primary/10">
                      <p className="text-xs text-muted-foreground">Variable</p>
                      <p className="text-lg font-bold text-primary">
                        ${paycheck.bucketWithdrawal.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tax Rate (Est.)</span>
                    <span className="font-medium">
                      {((paycheck.estimatedTaxes / paycheck.grossTotal) * 100).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Annual Equivalent</span>
                    <span className="font-medium">
                      ${(paycheck.netPaycheck * 12).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Sequence Risk Indicator */}
              <Card className={bucketAnalysis.sequenceRiskProtected ? 'border-warning' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    {bucketAnalysis.sequenceRiskProtected ? (
                      <>
                        <div className="p-2 rounded-full bg-warning/20">
                          <TrendingDown className="h-5 w-5 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium text-warning">Protected Mode Active</p>
                          <p className="text-xs text-muted-foreground">
                            Drawing from cash only to preserve assets
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 rounded-full bg-success/20">
                          <TrendingUp className="h-5 w-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium text-success">Normal Operations</p>
                          <p className="text-xs text-muted-foreground">
                            Refill logic active based on market conditions
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Bucket Status Tab */}
        <TabsContent value="buckets">
          <BucketStatusChart
            buckets={bucketAnalysis.buckets}
            totalPortfolioValue={bucketAnalysis.totalPortfolioValue}
            annualExpenses={bucketAnalysis.annualExpenses}
          />
        </TabsContent>

        {/* Refill Engine Tab */}
        <TabsContent value="refill">
          <RefillRuleEngine
            refillRecommendation={bucketAnalysis.refillRecommendation}
            sequenceRiskProtected={bucketAnalysis.sequenceRiskProtected}
            onExecuteRefill={executeRefill}
            refillHistory={refillHistory}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Bucket Configuration
              </CardTitle>
              <CardDescription>
                Customize your bucket targets and market assumptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Annual Expenses */}
              <div className="space-y-2">
                <Label>Annual Retirement Expenses</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={localExpenses}
                      onChange={(e) => setLocalExpenses(Number(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                  <Button onClick={handleExpensesUpdate}>Update</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This determines your bucket target values
                </p>
              </div>

              <Separator />

              {/* Target Years */}
              <div className="space-y-4">
                <Label>Target Years of Coverage</Label>
                
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cash Bucket</span>
                      <Badge variant="outline">{settings.bucket1_target_years} years</Badge>
                    </div>
                    <Slider
                      value={[settings.bucket1_target_years]}
                      onValueChange={([v]) => handleTargetYearsChange('bucket1', v)}
                      min={1}
                      max={5}
                      step={1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bonds Bucket</span>
                      <Badge variant="outline">{settings.bucket2_target_years} years</Badge>
                    </div>
                    <Slider
                      value={[settings.bucket2_target_years]}
                      onValueChange={([v]) => handleTargetYearsChange('bucket2', v)}
                      min={3}
                      max={10}
                      step={1}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Growth Bucket</span>
                      <Badge variant="outline">{settings.bucket3_target_years} years</Badge>
                    </div>
                    <Slider
                      value={[settings.bucket3_target_years]}
                      onValueChange={([v]) => handleTargetYearsChange('bucket3', v)}
                      min={10}
                      max={25}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* YTD Returns (for simulation) */}
              <div className="space-y-4">
                <Label>Simulated YTD Returns (%)</Label>
                <p className="text-xs text-muted-foreground">
                  Adjust these to see how different market conditions affect the refill logic
                </p>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Bonds YTD Return</span>
                      <Badge 
                        variant="outline"
                        className={settings.bucket2_ytd_return >= 0 ? 'text-success' : 'text-destructive'}
                      >
                        {settings.bucket2_ytd_return >= 0 ? '+' : ''}{settings.bucket2_ytd_return}%
                      </Badge>
                    </div>
                    <Slider
                      value={[settings.bucket2_ytd_return]}
                      onValueChange={([v]) => handleYtdReturnChange('bucket2', v)}
                      min={-20}
                      max={20}
                      step={0.5}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Growth YTD Return</span>
                      <Badge 
                        variant="outline"
                        className={settings.bucket3_ytd_return >= 0 ? 'text-success' : 'text-destructive'}
                      >
                        {settings.bucket3_ytd_return >= 0 ? '+' : ''}{settings.bucket3_ytd_return}%
                      </Badge>
                    </div>
                    <Slider
                      value={[settings.bucket3_ytd_return]}
                      onValueChange={([v]) => handleYtdReturnChange('bucket3', v)}
                      min={-30}
                      max={30}
                      step={0.5}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Refill Settings */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Automated Refill</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable automatic bucket refill recommendations
                  </p>
                </div>
                <Switch
                  checked={settings.refill_enabled}
                  onCheckedChange={(checked) => updateSettings({ refill_enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Refill Threshold</span>
                  <Badge variant="outline">{settings.refill_threshold_percentage}%</Badge>
                </div>
                <Slider
                  value={[settings.refill_threshold_percentage]}
                  onValueChange={([v]) => updateSettings({ refill_threshold_percentage: v })}
                  min={50}
                  max={95}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Trigger refill when Cash Bucket falls below this percentage of target
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
