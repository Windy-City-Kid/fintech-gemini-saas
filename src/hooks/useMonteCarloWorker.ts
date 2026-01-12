/**
 * Hook to run Monte Carlo simulation in a Web Worker
 * Keeps UI responsive during 5,000-trial computation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { SimulationResult, SimpleAllocation, SimulationParams } from './useMonteCarloSimulation';

interface UseMonteCarloWorkerReturn {
  result: SimulationResult | null;
  isRunning: boolean;
  error: string | null;
  runSimulation: (params: SimulationParams, iterations?: number) => void;
  cancel: () => void;
}

export function useMonteCarloWorker(): UseMonteCarloWorkerReturn {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
      setIsRunning(false);
    }
  }, []);

  const runSimulation = useCallback((params: SimulationParams, iterations: number = 5000) => {
    // Cancel any existing worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    setIsRunning(true);
    setError(null);

    try {
      // Create worker from module
      const worker = new Worker(
        new URL('../workers/monteCarloWorker.ts', import.meta.url),
        { type: 'module' }
      );
      
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<{ success: boolean; result?: SimulationResult; error?: string }>) => {
        setIsRunning(false);
        
        if (e.data.success && e.data.result) {
          setResult(e.data.result);
        } else {
          setError(e.data.error || 'Simulation failed');
        }
        
        worker.terminate();
        workerRef.current = null;
      };

      worker.onerror = (err) => {
        setIsRunning(false);
        setError(err.message || 'Worker error');
        worker.terminate();
        workerRef.current = null;
      };

      // Send params to worker
      worker.postMessage({ params, iterations });
    } catch (err) {
      setIsRunning(false);
      setError(err instanceof Error ? err.message : 'Failed to start worker');
    }
  }, []);

  return {
    result,
    isRunning,
    error,
    runSimulation,
    cancel,
  };
}
