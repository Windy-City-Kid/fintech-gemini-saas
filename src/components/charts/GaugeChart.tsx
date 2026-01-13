import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface GaugeChartProps {
  value: number;
  maxValue?: number;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  thresholds?: {
    low: number;
    medium: number;
    high: number;
  };
  formatValue?: (value: number) => string;
  showPercentage?: boolean;
}

const COLORS = {
  danger: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  background: 'hsl(var(--muted))',
};

const SIZE_CONFIG = {
  sm: { width: 120, height: 80, innerRadius: 35, outerRadius: 50, fontSize: 14, subtitleSize: 10 },
  md: { width: 180, height: 110, innerRadius: 50, outerRadius: 70, fontSize: 18, subtitleSize: 12 },
  lg: { width: 240, height: 140, innerRadius: 65, outerRadius: 90, fontSize: 24, subtitleSize: 14 },
};

export function GaugeChart({
  value,
  maxValue = 100,
  title,
  subtitle,
  size = 'md',
  thresholds = { low: 33, medium: 66, high: 100 },
  formatValue,
  showPercentage = true,
}: GaugeChartProps) {
  const config = SIZE_CONFIG[size];
  const percentage = Math.min((value / maxValue) * 100, 100);

  const getColor = useMemo(() => {
    if (percentage <= thresholds.low) return COLORS.danger;
    if (percentage <= thresholds.medium) return COLORS.warning;
    return COLORS.success;
  }, [percentage, thresholds]);

  const gaugeData = useMemo(() => {
    const filled = percentage;
    const empty = 100 - percentage;
    return [
      { name: 'filled', value: filled },
      { name: 'empty', value: empty },
    ];
  }, [percentage]);

  const displayValue = formatValue ? formatValue(value) : (showPercentage ? `${Math.round(percentage)}%` : value.toString());

  return (
    <div className="flex flex-col items-center">
      {title && (
        <span className="text-xs font-medium text-muted-foreground mb-1">{title}</span>
      )}
      <div className="relative" style={{ width: config.width, height: config.height }}>
        <ResponsiveContainer width="100%" height={config.height * 1.4}>
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius={config.innerRadius}
              outerRadius={config.outerRadius}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={getColor} />
              <Cell fill={COLORS.background} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ paddingTop: config.height * 0.15 }}
        >
          <span 
            className="font-bold text-foreground"
            style={{ fontSize: config.fontSize }}
          >
            {displayValue}
          </span>
          {subtitle && (
            <span 
              className="text-muted-foreground"
              style={{ fontSize: config.subtitleSize }}
            >
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
