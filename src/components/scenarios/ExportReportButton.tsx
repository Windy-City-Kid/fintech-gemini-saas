/**
 * Export Report Button Component
 * Triggers PDF generation for the Retirement Resilience Report
 */

import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { downloadRetirementReport, ReportData } from '@/lib/pdfReportGenerator';
import { SimulationResult, SimpleAllocation } from '@/hooks/useMonteCarloSimulation';

interface ExportReportButtonProps {
  simulationResult: SimulationResult | null;
  userName: string;
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlySpending: number;
  allocation: SimpleAllocation;
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
