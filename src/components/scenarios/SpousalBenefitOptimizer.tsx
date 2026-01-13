/**
 * Spousal Benefit Optimizer
 * "Optimize for Couple" button with auto-solver logic
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Users, TrendingUp, Shield, Target } from 'lucide-react';
import { optimizeForCouple, HouseholdSSParams } from '@/lib/socialSecurityOptimizer';

interface SpousalBenefitOptimizerProps {
  params: HouseholdSSParams;
  onApplyStrategy: (primaryAge: number, spouseAge: number) => void;
}

export function SpousalBenefitOptimizer({
  params,
  onApplyStrategy,
}: SpousalBenefitOptimizerProps) {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Run optimization
  const optimizationResult = useMemo(() => {
    if (!params.isMarried) return null;
    return optimizeForCouple(params);
  }, [params]);

  const handleOptimize = () => {
    setIsOptimizing(true);
    // Simulate async processing
    setTimeout(() => {
      setIsOptimizing(false);
      setShowResults(true);
    }, 800);
  };

  const handleApply = () => {
    if (!optimizationResult) return;
    onApplyStrategy(
      optimizationResult.bestStrategy.primaryClaimingAge,
      optimizationResult.bestStrategy.spouseClaimingAge
    );
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (!params.isMarried) {
    return null;
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Couple Optimizer
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {optimizationResult?.stats.totalCombinations || 81} combinations
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showResults ? (
          <>
            <p className="text-sm text-muted-foreground">
              Our engine will analyze all claiming combinations to find the strategy that maximizes survivor benefits and cumulative household income.
            </p>
            <Button 
              onClick={handleOptimize} 
              className="w-full gap-2"
              disabled={isOptimizing}
            >
              {isOptimizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing {optimizationResult?.stats.totalCombinations} strategies...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" />
                  Optimize for Couple
                </>
              )}
            </Button>
          </>
        ) : optimizationResult && (
          <>
            {/* Recommended Path */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-chart-2/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">Recommended Path</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed">
                {optimizationResult.explanation}
              </p>
            </div>

            {/* Strategy Details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                <p className="text-xs text-muted-foreground">Your Claiming Age</p>
                <p className="text-2xl font-bold text-primary">
                  {optimizationResult.bestStrategy.primaryClaimingAge}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                <p className="text-xs text-muted-foreground">Spouse Claiming Age</p>
                <p className="text-2xl font-bold text-chart-2">
                  {optimizationResult.bestStrategy.spouseClaimingAge}
                </p>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                  <span>Lifetime Income</span>
                </div>
                <span className="font-bold text-chart-2">
                  {formatCurrency(optimizationResult.stats.bestCumulativeIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Survivor Protection</span>
                </div>
                <span className="font-bold">
                  {formatCurrency(optimizationResult.stats.bestSurvivorBenefit)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleApply} className="flex-1 gap-2">
                <Target className="h-4 w-4" />
                Apply Strategy
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowResults(false)}
              >
                Reset
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
