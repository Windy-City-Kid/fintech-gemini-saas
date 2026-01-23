/**
 * Synchronized Chart Wrapper
 * 
 * Wraps Recharts components with synchronized hover state,
 * crosshair display, and enhanced tooltip integration.
 */

import React, { useId, useCallback, useRef, useEffect, useState } from 'react';
import { useSyncedChartHover } from '@/contexts/ChartHoverContext';
import { ReferenceLine } from 'recharts';

interface SyncedChartWrapperProps {
  children: React.ReactNode;
  chartId?: string;
  onSyncedHover?: (age: number | null) => void;
}

interface ChartMouseEventData {
  activePayload?: Array<{
    payload?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface ChartComponentProps {
  onMouseMove?: (data: ChartMouseEventData, e: React.MouseEvent) => void;
  onMouseLeave?: () => void;
  [key: string]: unknown;
}

export function SyncedChartWrapper({ 
  children, 
  chartId: customChartId,
  onSyncedHover,
}: SyncedChartWrapperProps) {
  const generatedId = useId();
  const chartId = customChartId || generatedId;
  const { hoveredAge, handleMouseMove, handleMouseLeave } = useSyncedChartHover(chartId);
  
  // Notify parent of synced hover changes
  useEffect(() => {
    onSyncedHover?.(hoveredAge);
  }, [hoveredAge, onSyncedHover]);

  return (
    <div 
      className="relative"
      onMouseLeave={handleMouseLeave}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement<ChartComponentProps>(child)) {
          const childProps = child.props as ChartComponentProps;
          return React.cloneElement(child, {
            onMouseMove: (data: ChartMouseEventData, e: React.MouseEvent) => {
              handleMouseMove(data, e);
              childProps.onMouseMove?.(data, e);
            },
            onMouseLeave: () => {
              handleMouseLeave();
              childProps.onMouseLeave?.();
            },
          });
        }
        return child;
      })}
    </div>
  );
}

/**
 * Custom Reference Line that highlights the synced age
 */
interface SyncedReferenceLineProps {
  hoveredAge: number | null;
  stroke?: string;
  strokeDasharray?: string;
}

export function SyncedReferenceLine({
  hoveredAge,
  stroke = 'hsl(var(--primary))',
  strokeDasharray = '4 2',
}: SyncedReferenceLineProps) {
  if (hoveredAge === null) return null;
  
  return (
    <ReferenceLine
      x={hoveredAge}
      stroke={stroke}
      strokeWidth={2}
      strokeDasharray={strokeDasharray}
      style={{
        transition: 'all 150ms ease-out',
        opacity: 0.7,
      }}
    />
  );
}

/**
 * Hook to get synchronized hover reference line props
 */
export function useSyncedReferenceLine(chartId: string) {
  const { hoveredAge } = useSyncedChartHover(chartId);
  
  if (hoveredAge === null) return null;
  
  return {
    x: hoveredAge,
    stroke: 'hsl(var(--primary))',
    strokeWidth: 2,
    strokeDasharray: '4 2',
    style: {
      transition: 'all 150ms ease-out',
      opacity: 0.6,
    },
  };
}

/**
 * Active dot component for highlighting synced data points
 */
export function SyncedActiveDot({ 
  cx, 
  cy, 
  fill,
  isActive,
}: { 
  cx: number; 
  cy: number; 
  fill: string;
  isActive: boolean;
}) {
  if (!isActive) return null;
  
  return (
    <g>
      {/* Outer pulse ring */}
      <circle
        cx={cx}
        cy={cy}
        r={12}
        fill={fill}
        className="animate-[pulse_1.5s_ease-in-out_infinite]"
        style={{ opacity: 0.2 }}
      />
      {/* Inner ring */}
      <circle
        cx={cx}
        cy={cy}
        r={8}
        fill="transparent"
        stroke={fill}
        strokeWidth={2}
        style={{ 
          opacity: 0.5,
          transition: 'all 200ms ease-out',
        }}
      />
      {/* Center dot */}
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill={fill}
        style={{ 
          transition: 'all 200ms ease-out',
        }}
      />
    </g>
  );
}
