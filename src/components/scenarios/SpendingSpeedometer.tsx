/**
 * Spending Speedometer Component
 * 
 * Visual gauge showing current spending zone:
 * - Blue (Prosperity): Can increase spending
 * - Green (Safe): On track
 * - Orange (Caution): Consider reducing
 */

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { SpendingZone } from '@/lib/guardrailsEngine';

interface SpendingSpeedometerProps {
  zone: SpendingZone;
  currentRate: number;
  upperGuardrail: number;
  lowerGuardrail: number;
  size?: 'sm' | 'md' | 'lg';
}

const ZONE_COLORS = {
  prosperity: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500',
    text: 'text-blue-400',
    fill: 'hsl(210, 100%, 60%)',
  },
  safe: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    fill: 'hsl(152, 76%, 45%)',
  },
  caution: {
    bg: 'bg-orange-500/20',
    border: 'border-orange-500',
    text: 'text-orange-400',
    fill: 'hsl(30, 100%, 50%)',
  },
};

const SIZE_CONFIG = {
  sm: { width: 120, height: 80, strokeWidth: 8, fontSize: 14 },
  md: { width: 180, height: 120, strokeWidth: 12, fontSize: 18 },
  lg: { width: 240, height: 160, strokeWidth: 16, fontSize: 24 },
};

export function SpendingSpeedometer({
  zone,
  currentRate,
  upperGuardrail,
  lowerGuardrail,
  size = 'md',
}: SpendingSpeedometerProps) {
  const config = SIZE_CONFIG[size];
  const colors = ZONE_COLORS[zone];
  
  // Calculate needle position (0 to 180 degrees)
  const needleAngle = useMemo(() => {
    // Map withdrawal rate to angle
    // Upper guardrail (prosperity) = 30°
    // Initial rate = 90° (center)
    // Lower guardrail (caution) = 150°
    const initialRate = (upperGuardrail / 0.8); // Reverse calculate
    const minRate = upperGuardrail * 0.5;
    const maxRate = lowerGuardrail * 1.5;
    
    // Clamp current rate
    const clampedRate = Math.max(minRate, Math.min(maxRate, currentRate));
    
    // Map to 0-180
    const normalized = (clampedRate - minRate) / (maxRate - minRate);
    return normalized * 180;
  }, [currentRate, upperGuardrail, lowerGuardrail]);
  
  const centerX = config.width / 2;
  const centerY = config.height - 10;
  const radius = config.height - 30;
  
  // Calculate needle end point
  const needleEndX = centerX + radius * 0.8 * Math.cos((180 - needleAngle) * Math.PI / 180);
  const needleEndY = centerY - radius * 0.8 * Math.sin((180 - needleAngle) * Math.PI / 180);
  
  return (
    <div className="flex flex-col items-center">
      <svg
        width={config.width}
        height={config.height}
        viewBox={`0 0 ${config.width} ${config.height}`}
        className="overflow-visible"
      >
        {/* Background arc sections */}
        {/* Blue zone (0-60°) */}
        <path
          d={describeArc(centerX, centerY, radius, 0, 60)}
          fill="none"
          stroke="hsl(210, 100%, 60%)"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />
        
        {/* Green zone (60-120°) */}
        <path
          d={describeArc(centerX, centerY, radius, 60, 120)}
          fill="none"
          stroke="hsl(152, 76%, 45%)"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />
        
        {/* Orange zone (120-180°) */}
        <path
          d={describeArc(centerX, centerY, radius, 120, 180)}
          fill="none"
          stroke="hsl(30, 100%, 50%)"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          opacity={0.3}
        />
        
        {/* Active arc highlight */}
        <motion.path
          d={describeArc(centerX, centerY, radius, 
            zone === 'prosperity' ? 0 : zone === 'safe' ? 60 : 120,
            zone === 'prosperity' ? 60 : zone === 'safe' ? 120 : 180
          )}
          fill="none"
          stroke={colors.fill}
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        />
        
        {/* Center point */}
        <circle
          cx={centerX}
          cy={centerY}
          r={6}
          fill={colors.fill}
        />
        
        {/* Needle */}
        <motion.line
          x1={centerX}
          y1={centerY}
          x2={needleEndX}
          y2={needleEndY}
          stroke={colors.fill}
          strokeWidth={3}
          strokeLinecap="round"
          initial={{ rotate: -90 }}
          animate={{ rotate: 0 }}
          style={{ transformOrigin: `${centerX}px ${centerY}px` }}
          transition={{ type: 'spring', stiffness: 60, damping: 12 }}
        />
        
        {/* Zone labels */}
        <text
          x={20}
          y={centerY - 10}
          fontSize={10}
          fill="hsl(210, 100%, 60%)"
          className="font-medium"
        >
          +10%
        </text>
        <text
          x={centerX - 10}
          y={20}
          fontSize={10}
          fill="hsl(152, 76%, 45%)"
          className="font-medium"
        >
          Safe
        </text>
        <text
          x={config.width - 35}
          y={centerY - 10}
          fontSize={10}
          fill="hsl(30, 100%, 50%)"
          className="font-medium"
        >
          -10%
        </text>
      </svg>
      
      {/* Rate display */}
      <div className={`mt-2 text-center ${colors.text}`}>
        <span className="text-lg font-bold font-mono">
          {(currentRate * 100).toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground ml-1">
          withdrawal rate
        </span>
      </div>
    </div>
  );
}

// Helper function to create arc path
function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 90 ? '0' : '1';
  
  return [
    'M', start.x, start.y,
    'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
  ].join(' ');
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
) {
  const angleInRadians = (angleInDegrees - 180) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}
