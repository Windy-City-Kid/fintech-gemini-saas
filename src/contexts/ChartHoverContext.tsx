/**
 * Chart Hover Synchronization Context
 * 
 * Provides synchronized hover state across multiple charts for
 * coordinated cross-chart highlighting and tooltip display.
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface HoverData {
  age: number | null;
  year: number | null;
  sourceChartId: string | null;
  clientX?: number;
  clientY?: number;
}

export interface ChartHoverContextValue {
  hoverData: HoverData;
  setHover: (data: HoverData) => void;
  clearHover: () => void;
  isHovered: (age: number) => boolean;
  registerChart: (chartId: string) => void;
  unregisterChart: (chartId: string) => void;
  registeredCharts: string[];
}

const defaultHoverData: HoverData = {
  age: null,
  year: null,
  sourceChartId: null,
};

const ChartHoverContext = createContext<ChartHoverContextValue | undefined>(undefined);

// VITE-COMPATIBLE EXPORT: Component as named export (stable for Fast Refresh)
// Fast Refresh requires components to be exported in a stable way
export function ChartHoverProvider({ children }: { children: React.ReactNode }) {
  const [hoverData, setHoverData] = useState<HoverData>(defaultHoverData);
  const [registeredCharts, setRegisteredCharts] = useState<string[]>([]);

  const setHover = useCallback((data: HoverData) => {
    setHoverData(data);
  }, []);

  const clearHover = useCallback(() => {
    setHoverData(defaultHoverData);
  }, []);

  const isHovered = useCallback((age: number) => {
    return hoverData.age === age;
  }, [hoverData.age]);

  const registerChart = useCallback((chartId: string) => {
    setRegisteredCharts(prev => 
      prev.includes(chartId) ? prev : [...prev, chartId]
    );
  }, []);

  const unregisterChart = useCallback((chartId: string) => {
    setRegisteredCharts(prev => prev.filter(id => id !== chartId));
  }, []);

  const value = useMemo(() => ({
    hoverData,
    setHover,
    clearHover,
    isHovered,
    registerChart,
    unregisterChart,
    registeredCharts,
  }), [hoverData, setHover, clearHover, isHovered, registerChart, unregisterChart, registeredCharts]);

  return (
    <ChartHoverContext.Provider value={value}>
      {children}
    </ChartHoverContext.Provider>
  );
}

// VITE-COMPATIBLE EXPORT: Hook as named export (stable for Fast Refresh)
// Hooks should be exported separately from components to prevent HMR invalidation
export function useChartHover() {
  const context = useContext(ChartHoverContext);
  if (!context) {
    throw new Error('useChartHover must be used within a ChartHoverProvider');
  }
  return context;
}

/**
 * Hook for individual charts to sync with the global hover state
 */
export function useSyncedChartHover(chartId: string) {
  const { hoverData, setHover, clearHover, isHovered, registerChart, unregisterChart } = useChartHover();

  // Register on mount, unregister on unmount
  React.useEffect(() => {
    registerChart(chartId);
    return () => unregisterChart(chartId);
  }, [chartId, registerChart, unregisterChart]);

  const handleMouseMove = useCallback((data: any, e?: React.MouseEvent) => {
    if (data?.activePayload?.[0]?.payload) {
      const payload = data.activePayload[0].payload;
      setHover({
        age: payload.age,
        year: payload.year,
        sourceChartId: chartId,
        clientX: e?.clientX,
        clientY: e?.clientY,
      });
    }
  }, [chartId, setHover]);

  const handleMouseLeave = useCallback(() => {
    clearHover();
  }, [clearHover]);

  // Get the currently hovered age (from any chart)
  const hoveredAge = hoverData.age;
  const isSourceChart = hoverData.sourceChartId === chartId;

  return {
    hoveredAge,
    hoveredYear: hoverData.year,
    isSourceChart,
    isHovered,
    handleMouseMove,
    handleMouseLeave,
  };
}
