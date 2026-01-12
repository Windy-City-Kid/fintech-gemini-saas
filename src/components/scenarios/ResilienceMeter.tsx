/**
 * Resilience Meter Component
 * Visual gauge showing retirement confidence score
 */

import { useMemo } from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ResilienceMeterProps {
  successRate: number;
  loading?: boolean;
}

export function ResilienceMeter({ successRate, loading }: ResilienceMeterProps) {
  const meterData = useMemo(() => {
    if (successRate >= 90) {
      return {
        label: 'Excellent',
        color: 'hsl(var(--primary))',
        bgColor: 'bg-primary/10',
        textColor: 'text-primary',
        Icon: CheckCircle,
        message: 'Your plan is well-positioned to weather market volatility.',
      };
    } else if (successRate >= 75) {
      return {
        label: 'Good',
        color: 'hsl(38, 92%, 50%)',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-500',
        Icon: AlertTriangle,
        message: 'Consider increasing contributions or adjusting withdrawals.',
      };
    } else {
      return {
        label: 'Needs Attention',
        color: 'hsl(var(--destructive))',
        bgColor: 'bg-destructive/10',
        textColor: 'text-destructive',
        Icon: XCircle,
        message: 'Review your plan with a financial advisor.',
      };
    }
  }, [successRate]);

  if (loading) {
    return (
      <div className="stat-card" id="resilience-meter">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-2">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-32 flex items-center justify-center">
          <div className="h-24 w-24 rounded-full border-4 border-muted animate-pulse" />
        </div>
      </div>
    );
  }

  const { label, color, bgColor, textColor, Icon, message } = meterData;
  
  // Calculate stroke dash for the circular progress
  const circumference = 2 * Math.PI * 45; // radius = 45
  const progress = (successRate / 100) * circumference;
  const dashOffset = circumference - progress;

  return (
    <div className="stat-card" id="resilience-meter">
      <div className="flex items-center gap-3 mb-4">
        <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <Shield className={`h-5 w-5 ${textColor}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Resilience Score</h3>
          <p className="text-sm text-muted-foreground">Monte Carlo success rate</p>
        </div>
      </div>

      {/* Circular Meter */}
      <div className="flex justify-center py-4">
        <div className="relative">
          <svg width="140" height="140" className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="70"
              cy="70"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="10"
            />
            {/* Progress circle */}
            <circle
              cx="70"
              cy="70"
              r="45"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold font-mono ${textColor}`}>
              {successRate.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className={`mt-2 p-3 rounded-lg ${bgColor} border border-border`}>
        <div className="flex items-start gap-2">
          <Icon className={`h-4 w-4 ${textColor} mt-0.5 flex-shrink-0`} />
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>

      {/* Threshold markers */}
      <div className="mt-4 flex justify-between text-xs text-muted-foreground px-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-destructive" />
          <span>&lt;75%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span>75-90%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span>&gt;90%</span>
        </div>
      </div>
    </div>
  );
}
