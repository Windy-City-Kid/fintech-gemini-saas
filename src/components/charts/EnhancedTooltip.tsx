/**
 * Enhanced Professional Chart Tooltip
 * 
 * Features:
 * - Year & Age display
 * - Category breakdown with colors
 * - Delta comparison with baseline
 * - Smooth 200ms animations
 * - Empty state handling
 * - Snap-to-year behavior
 */

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, User } from 'lucide-react';

export interface TooltipCategory {
  key: string;
  label: string;
  value: number;
  color: string;
  baselineValue?: number;
}

export interface EnhancedTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: any;
  
  // Custom data
  age?: number;
  year?: number;
  categories?: TooltipCategory[];
  total?: number;
  baselineTotal?: number;
  
  // Configuration
  title?: string;
  showDelta?: boolean;
  emptyMessage?: string;
  formatValue?: (value: number) => string;
}

const defaultFormat = (value: number) => {
  if (Math.abs(value) >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
};

export function EnhancedChartTooltip({
  active,
  payload,
  label,
  age,
  year,
  categories,
  total,
  baselineTotal,
  title,
  showDelta = false,
  emptyMessage = 'No projected activity',
  formatValue = defaultFormat,
}: EnhancedTooltipProps) {
  // Extract data from payload if not provided directly
  const tooltipData = useMemo(() => {
    if (categories) return { categories, total, age, year };
    
    if (!payload?.length) return null;
    
    const data = payload[0]?.payload;
    if (!data) return null;
    
    // Build categories from payload
    const cats: TooltipCategory[] = payload
      .filter((p: any) => p.dataKey && p.value !== undefined && p.dataKey !== 'expenseLine')
      .map((p: any) => ({
        key: p.dataKey,
        label: p.name || p.dataKey,
        value: Math.abs(p.value || 0),
        color: p.color || p.fill || 'hsl(var(--primary))',
        baselineValue: data[`baseline_${p.dataKey}`],
      }));
    
    const tot = cats.reduce((sum, c) => sum + c.value, 0);
    
    return {
      categories: cats,
      total: tot,
      age: data.age || label,
      year: data.year,
    };
  }, [payload, categories, total, age, year, label]);

  if (!active || !tooltipData) {
    return null;
  }

  const { categories: cats, total: totalValue, age: displayAge, year: displayYear } = tooltipData;
  
  const hasData = cats && cats.some(c => c.value > 0);
  const delta = baselineTotal !== undefined && totalValue !== undefined 
    ? totalValue - baselineTotal 
    : null;

  return (
    <div 
      className="bg-popover/95 backdrop-blur-sm border border-border rounded-xl shadow-xl p-4 text-sm min-w-[200px] animate-scale-in"
      style={{ 
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-3 mb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">{displayYear}</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span className="text-xs">Age {displayAge}</span>
        </div>
      </div>

      {title && (
        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          {title}
        </p>
      )}

      {/* Empty State */}
      {!hasData && (
        <div className="py-4 text-center text-muted-foreground">
          <Minus className="h-5 w-5 mx-auto mb-1 opacity-50" />
          <p className="text-xs">{emptyMessage}</p>
        </div>
      )}

      {/* Category Breakdown */}
      {hasData && (
        <div className="space-y-2">
          {cats.filter(c => c.value > 0).map((category) => (
            <div 
              key={category.key} 
              className="flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div 
                  className="w-3 h-3 rounded-sm flex-shrink-0 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: category.color }}
                />
                <span className="truncate text-sm">{category.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono font-medium">
                  {formatValue(category.value)}
                </span>
                {showDelta && category.baselineValue !== undefined && (
                  <DeltaBadge 
                    current={category.value} 
                    baseline={category.baselineValue} 
                    formatValue={formatValue}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      {hasData && totalValue !== undefined && cats.length > 1 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <span className="font-medium">Total</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base">
                {formatValue(totalValue)}
              </span>
              {showDelta && delta !== null && delta !== 0 && (
                <DeltaBadge 
                  current={totalValue} 
                  baseline={baselineTotal!} 
                  formatValue={formatValue}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DeltaBadgeProps {
  current: number;
  baseline: number;
  formatValue: (value: number) => string;
}

function DeltaBadge({ current, baseline, formatValue }: DeltaBadgeProps) {
  const delta = current - baseline;
  if (delta === 0) return null;
  
  const isPositive = delta > 0;
  
  return (
    <span 
      className={`
        inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium
        ${isPositive 
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
        }
      `}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}{formatValue(delta)}
    </span>
  );
}

/**
 * Synchronized Crosshair Line Component
 * Renders a vertical line at the hovered age across all charts
 */
interface SyncedCrosshairProps {
  hoveredAge: number | null;
  data: { age: number }[];
  chartWidth: number;
  chartHeight: number;
  marginLeft: number;
}

export function SyncedCrosshair({ 
  hoveredAge, 
  data, 
  chartWidth, 
  chartHeight,
  marginLeft,
}: SyncedCrosshairProps) {
  if (hoveredAge === null) return null;

  // Find the index of the hovered age
  const index = data.findIndex(d => d.age === hoveredAge);
  if (index === -1) return null;

  // Calculate x position
  const dataWidth = chartWidth - marginLeft - 30; // Account for margins
  const barWidth = dataWidth / data.length;
  const x = marginLeft + (index * barWidth) + (barWidth / 2);

  return (
    <g>
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={chartHeight}
        stroke="hsl(var(--primary))"
        strokeWidth={2}
        strokeDasharray="4 2"
        className="transition-all duration-200 ease-out"
        style={{ opacity: 0.6 }}
      />
      <circle
        cx={x}
        cy={10}
        r={4}
        fill="hsl(var(--primary))"
        className="transition-all duration-200 ease-out"
      />
    </g>
  );
}

/**
 * Custom Cursor Component for snapping behavior
 */
export function SnapCursor({ points, width, height }: any) {
  if (!points || !points.length) return null;
  
  const { x } = points[0];
  
  return (
    <g>
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke="hsl(var(--primary))"
        strokeWidth={1.5}
        strokeDasharray="4 2"
        className="transition-all duration-150"
        style={{ opacity: 0.5 }}
      />
    </g>
  );
}
