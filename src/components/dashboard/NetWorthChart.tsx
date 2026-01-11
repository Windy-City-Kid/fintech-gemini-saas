import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Lock } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradeModal } from './UpgradeModal';

interface NetWorthChartProps {
  totalNetWorth: number;
}

// Generate sample historical data based on current net worth
function generateHistoricalData(currentValue: number) {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
  const baseValue = currentValue * 0.85; // Start at 85% of current value
  
  return months.map((month, index) => ({
    month,
    value: Math.round(baseValue + (currentValue - baseValue) * (index / (months.length - 1)) + (Math.random() - 0.5) * currentValue * 0.02),
  }));
}

export function NetWorthChart({ totalNetWorth }: NetWorthChartProps) {
  const { isPro, isLoading } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const data = generateHistoricalData(totalNetWorth || 100000);

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  // Show locked state for non-Pro users
  if (!isLoading && !isPro) {
    return (
      <>
        <div 
          className="stat-card relative cursor-pointer group"
          onClick={() => setShowUpgradeModal(true)}
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold">Net Worth Trend</h3>
            <p className="text-sm text-muted-foreground">Last 7 months</p>
          </div>

          <div className="h-64 relative">
            {/* Blurred chart background */}
            <div className="absolute inset-0 blur-sm opacity-30">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netWorthGradientLocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(152, 76%, 45%)"
                    strokeWidth={2}
                    fill="url(#netWorthGradientLocked)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Lock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg transition-all group-hover:bg-background/40">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-semibold text-center">Locked</p>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Click to unlock with Pro
              </p>
            </div>
          </div>
        </div>

        <UpgradeModal open={showUpgradeModal} onOpenChange={setShowUpgradeModal} />
      </>
    );
  }

  return (
    <div className="stat-card">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Net Worth Trend</h3>
        <p className="text-sm text-muted-foreground">Last 7 months</p>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(152, 76%, 45%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 17%)" />
            <XAxis 
              dataKey="month" 
              stroke="hsl(215, 20%, 55%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="hsl(215, 20%, 55%)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatValue}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 12%)',
                border: '1px solid hsl(217, 33%, 20%)',
                borderRadius: '8px',
                boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)',
              }}
              labelStyle={{ color: 'hsl(210, 40%, 98%)' }}
              formatter={(value: number) => [formatValue(value), 'Net Worth']}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(152, 76%, 45%)"
              strokeWidth={2}
              fill="url(#netWorthGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
