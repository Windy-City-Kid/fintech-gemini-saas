/**
 * Export Report Button Component
 * Triggers PDF generation for the Retirement Resilience Report
 */

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { downloadRetirementReport, ReportData } from '@/lib/pdfReportGenerator';

interface AllocationData {
  stocks: number;
  bonds: number;
  cash: number;
}

interface SimulationData {
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  ages: number[];
  successRate: number;
  medianEndBalance: number;
  guardrailActivations: number;
  guardrailEvents: Array<{
    yearInRetirement: number;
    activations: number;
    percentage: number;
  }>;
  inflationScenarios: {
    low: number;
    median: number;
    high: number;
  };
  executionTimeMs?: number;
}

interface ExportReportButtonProps {
  simulationResult: SimulationData | null;
  userName: string;
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlySpending: number;
  allocation: AllocationData;
  fanChartElementId?: string;
  resilienceMeterElementId?: string;
  disabled?: boolean;
}

export function ExportReportButton({
  simulationResult,
  userName,
  currentAge,
  retirementAge,
  currentSavings,
  monthlySpending,
  allocation,
  fanChartElementId = 'fan-chart-container',
  resilienceMeterElementId = 'resilience-meter',
  disabled = false,
}: ExportReportButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    if (!simulationResult) {
      toast.error('No simulation data', {
        description: 'Please run a simulation first before exporting the report.',
      });
      return;
    }

    setGenerating(true);
    
    try {
      const reportData: ReportData = {
        userName,
        confidenceScore: simulationResult.successRate,
        simulationResult,
        currentAge,
        retirementAge,
        currentSavings,
        monthlySpending,
        allocation,
      };

      await downloadRetirementReport(reportData, {
        fanChart: fanChartElementId,
        resilienceMeter: resilienceMeterElementId,
      });

      toast.success('Report generated!', {
        description: 'Your Retirement Resilience Report has been downloaded.',
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error('Export failed', {
        description: 'There was an error generating your report. Please try again.',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || generating || !simulationResult}
      variant="outline"
      className="gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating PDF...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4" />
          Export Report
        </>
      )}
    </Button>
  );
}
