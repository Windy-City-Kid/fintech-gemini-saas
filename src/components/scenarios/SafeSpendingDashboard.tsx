/**
 * Safe Spending Dashboard Component
 * 
 * Primary card showing:
 * - Safe spending target
 * - Speedometer zone indicator
 * - Adjustment recommendations
 * - Market shock simulation
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SpendingSpeedometer } from './SpendingSpeedometer';
import { useGuardrails } from '@/hooks/useGuardrails';
import { useAIAdvisorContext } from '@/contexts/AIAdvisorContext';
import { SpendingZone } from '@/lib/guardrailsEngine';

const ZONE_CONFIG: Record<SpendingZone, {
  icon: typeof TrendingUp;
  label: string;
  description: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  prosperity: {
    icon: TrendingUp,
    label: 'Prosperity Zone',
    description: 'Your portfolio is ahead of schedule! You can safely increase spending.',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    borderClass: 'border-blue-500/30',
  },
  safe: {
    icon: Wallet,
    label: 'Safe Zone',
    description: 'You\'re on track. No spending changes needed.',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
  },
  caution: {
    icon: AlertTriangle,
    label: 'Caution Zone',
    description: 'Consider a temporary spending reduction to protect your portfolio.',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/30',
  },
};

export function SafeSpendingDashboard() {
  const {
    status,
    shockResult,
    isLoading,
    portfolioValue,
    monthlySpending,
    nudgeMessage,
    simulateShock,
  } = useGuardrails();
  
  const { openAndAsk } = useAIAdvisorContext();
  
  const [showShockSimulation, setShowShockSimulation] = useState(false);
  const [shockPercent, setShockPercent] = useState(15);
  const [expanded, setExpanded] = useState(true);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const handleShockToggle = useCallback((enabled: boolean) => {
    setShowShockSimulation(enabled);
    if (enabled) {
      simulateShock(shockPercent / 100);
    } else {
      simulateShock(0);
    }
  }, [shockPercent, simulateShock]);

  const handleShockPercentChange = useCallback((value: number[]) => {
    const percent = value[0];
    setShockPercent(percent);
    if (showShockSimulation) {
      simulateShock(percent / 100);
    }
  }, [showShockSimulation, simulateShock]);

  const handleAskAdvisor = useCallback(() => {
    if (nudgeMessage) {
      openAndAsk(nudgeMessage);
    }
  }, [nudgeMessage, openAndAsk]);

  if (isLoading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Wallet className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Add accounts and set spending goals to see your safe spending target.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const zoneConfig = ZONE_CONFIG[status.zone];
  const ZoneIcon = zoneConfig.icon;

  return (
    <Card className={`border-2 ${zoneConfig.borderClass} ${zoneConfig.bgClass} transition-all duration-300`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${zoneConfig.bgClass}`}>
              <ZoneIcon className={`h-5 w-5 ${zoneConfig.textClass}`} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Your Safe Spending Target
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-sm">
                        Based on the Guyton-Klinger guardrails framework. Your spending 
                        adjusts dynamically based on portfolio performance.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
              <CardDescription className={zoneConfig.textClass}>
                {zoneConfig.label}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Primary spending target */}
        <div className="flex items-center justify-between">
          <div>
            <motion.div
              key={showShockSimulation ? 'shocked' : 'normal'}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold font-mono"
            >
              {formatCurrency(
                showShockSimulation && shockResult
                  ? shockResult.shockedMonthlyBudget
                  : status.adjustedSpendingMonthly
              )}
              <span className="text-lg text-muted-foreground">/mo</span>
            </motion.div>
            
            {/* Adjustment indicator */}
            {status.adjustmentAmount !== 0 && !showShockSimulation && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-1 text-sm ${zoneConfig.textClass}`}
              >
                {status.adjustmentAmount > 0 ? (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    <span>+{formatCurrency(status.adjustmentAmount)} available</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4" />
                    <span>{formatCurrency(status.adjustmentAmount)} recommended cut</span>
                  </>
                )}
              </motion.div>
            )}
            
            {/* Shock impact */}
            {showShockSimulation && shockResult && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1 text-sm text-orange-400"
              >
                <Zap className="h-4 w-4" />
                <span>
                  After {shockPercent}% drop: {formatCurrency(shockResult.budgetChange)}/mo change
                </span>
              </motion.div>
            )}
          </div>

          {/* Speedometer */}
          <SpendingSpeedometer
            zone={showShockSimulation && shockResult ? shockResult.shockedZone : status.zone}
            currentRate={showShockSimulation && shockResult ? shockResult.shockedWithdrawalRate : status.currentWithdrawalRate}
            upperGuardrail={status.upperGuardrail}
            lowerGuardrail={status.lowerGuardrail}
            size="md"
          />
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 overflow-hidden"
            >
              {/* Zone description */}
              <div className={`p-3 rounded-lg ${zoneConfig.bgClass} border ${zoneConfig.borderClass}`}>
                <p className="text-sm text-foreground">
                  {zoneConfig.description}
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground">Portfolio Value</p>
                  <p className="text-lg font-semibold font-mono">{formatCurrency(portfolioValue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground">Current Rate</p>
                  <p className="text-lg font-semibold font-mono">{(status.currentWithdrawalRate * 100).toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30 border border-border">
                  <p className="text-xs text-muted-foreground">Target Rate</p>
                  <p className="text-lg font-semibold font-mono">{(status.initialWithdrawalRate * 100).toFixed(1)}%</p>
                </div>
              </div>

              {/* Market Shock Simulation */}
              <div className="p-4 rounded-lg bg-secondary/20 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <Label htmlFor="shock-toggle" className="font-medium">
                      Market Shock Simulation
                    </Label>
                  </div>
                  <Switch
                    id="shock-toggle"
                    checked={showShockSimulation}
                    onCheckedChange={handleShockToggle}
                  />
                </div>
                
                <AnimatePresence>
                  {showShockSimulation && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Market Drop</span>
                          <span className="text-sm font-mono font-medium">{shockPercent}%</span>
                        </div>
                        <Slider
                          value={[shockPercent]}
                          onValueChange={handleShockPercentChange}
                          min={5}
                          max={40}
                          step={5}
                          className="w-full"
                        />
                      </div>
                      
                      {shockResult && (
                        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                          <p className="text-sm text-orange-200">
                            If the market drops <span className="font-bold">{shockPercent}%</span> tomorrow, 
                            your monthly budget would shift from{' '}
                            <span className="font-mono font-bold">{formatCurrency(monthlySpending)}</span> to{' '}
                            <span className="font-mono font-bold">{formatCurrency(shockResult.shockedMonthlyBudget)}</span>.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AI Advisor nudge */}
              {nudgeMessage && status.zone !== 'safe' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-lg ${zoneConfig.bgClass} border ${zoneConfig.borderClass}`}
                >
                  <div className="flex items-start gap-3">
                    <Sparkles className={`h-5 w-5 ${zoneConfig.textClass} mt-0.5`} />
                    <div className="flex-1">
                      <p className="text-sm text-foreground mb-2">{nudgeMessage}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAskAdvisor}
                        className={`${zoneConfig.textClass} hover:bg-background/50`}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        Discuss with AI Advisor
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
