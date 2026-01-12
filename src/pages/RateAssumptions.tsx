import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  RefreshCw, 
  ChevronDown, 
  TrendingUp, 
  TrendingDown, 
  Info,
  Activity,
  Heart,
  Home,
  DollarSign,
  LineChart as LineChartIcon
} from 'lucide-react';
import { useRateAssumptions, RATE_HISTORICAL_CONTEXT, RateAssumption } from '@/hooks/useRateAssumptions';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  General: <Activity className="h-5 w-5" />,
  Medical: <Heart className="h-5 w-5" />,
  'Social Security': <DollarSign className="h-5 w-5" />,
  Investment: <LineChartIcon className="h-5 w-5" />,
  Housing: <Home className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  General: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
  Medical: 'from-rose-500/20 to-rose-600/20 border-rose-500/30',
  'Social Security': 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
  Investment: 'from-violet-500/20 to-violet-600/20 border-violet-500/30',
  Housing: 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
};

interface RateCardProps {
  assumption: RateAssumption;
  onUpdate: (id: string, optimistic: number, pessimistic: number) => Promise<void>;
}

function RateCard({ assumption, onUpdate }: RateCardProps) {
  const [optimistic, setOptimistic] = useState(assumption.user_optimistic.toString());
  const [pessimistic, setPessimistic] = useState(assumption.user_pessimistic.toString());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const contextKey = `${assumption.category}-${assumption.name}`;
  const context = RATE_HISTORICAL_CONTEXT[contextKey];

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate(assumption.id, parseFloat(optimistic), parseFloat(pessimistic));
    setIsSaving(false);
  };

  const hasChanges = 
    parseFloat(optimistic) !== assumption.user_optimistic ||
    parseFloat(pessimistic) !== assumption.user_pessimistic;

  // For investment returns, optimistic > pessimistic (higher is better)
  // For costs/inflation, pessimistic > optimistic (higher is worse)
  const isReturnRate = assumption.category === 'Investment';

  return (
    <Card className={cn(
      "bg-gradient-to-br border transition-all hover:shadow-md",
      CATEGORY_COLORS[assumption.category] || 'from-muted/50 to-muted border-border'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-background/80">
              {CATEGORY_ICONS[assumption.category]}
            </div>
            <div>
              <CardTitle className="text-lg">{assumption.name}</CardTitle>
              <CardDescription>{assumption.description}</CardDescription>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">
              {assumption.historical_avg.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Historical Avg</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Dual Input Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <TrendingUp className={cn(
                "h-4 w-4",
                isReturnRate ? "text-green-500" : "text-green-500"
              )} />
              Optimistic
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                value={optimistic}
                onChange={(e) => setOptimistic(e.target.value)}
                className="pr-6 bg-background/80"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <TrendingDown className={cn(
                "h-4 w-4",
                isReturnRate ? "text-red-500" : "text-red-500"
              )} />
              Pessimistic
            </Label>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                value={pessimistic}
                onChange={(e) => setPessimistic(e.target.value)}
                className="pr-6 bg-background/80"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        {hasChanges && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full"
            size="sm"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}

        {/* Rate Inspector Dropdown */}
        {context && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Rate Inspector
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="p-3 rounded-lg bg-background/80 space-y-3">
                <h4 className="font-medium text-sm">{context.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {context.context}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Source: {context.source}
                </p>
                
                {context.chartData && (
                  <div className="h-32 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={context.chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                        <XAxis 
                          dataKey="period" 
                          tick={{ fontSize: 10 }}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          stroke="hsl(var(--muted-foreground))"
                          tickFormatter={(v) => `${v}%`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Rate']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Last Updated Info */}
        {assumption.last_updated_from_api && (
          <p className="text-xs text-muted-foreground text-center">
            Last synced: {new Date(assumption.last_updated_from_api).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function RateAssumptions() {
  const { assumptions, isLoading, error, updateAssumption, syncFredData, isSyncing } = useRateAssumptions();

  // Group assumptions by category
  const groupedAssumptions = assumptions.reduce((acc, assumption) => {
    if (!acc[assumption.category]) {
      acc[assumption.category] = [];
    }
    acc[assumption.category].push(assumption);
    return acc;
  }, {} as Record<string, RateAssumption[]>);

  const categoryOrder = ['General', 'Medical', 'Social Security', 'Investment', 'Housing'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rate Assumptions</h1>
            <p className="text-muted-foreground">
              Customize economic assumptions for your retirement projections
            </p>
          </div>
          <Button 
            onClick={syncFredData} 
            disabled={isSyncing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? 'Syncing...' : 'Sync FRED Data'}
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">How Rate Assumptions Work</p>
                <p className="text-xs text-muted-foreground">
                  Your Monte Carlo simulation uses these ranges to model uncertainty. For each of the 5,000 trials,
                  rates are randomly sampled between your optimistic and pessimistic bounds, creating a realistic
                  distribution of potential outcomes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* Rate Cards by Category */
          <div className="space-y-8">
            {categoryOrder.map((category) => {
              const categoryAssumptions = groupedAssumptions[category];
              if (!categoryAssumptions || categoryAssumptions.length === 0) return null;

              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-muted">
                      {CATEGORY_ICONS[category]}
                    </div>
                    <h2 className="text-lg font-semibold">{category}</h2>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {categoryAssumptions.map((assumption) => (
                      <RateCard
                        key={assumption.id}
                        assumption={assumption}
                        onUpdate={updateAssumption}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
