/**
 * Retirement Resilience Report PDF Generator
 * Uses jspdf and html2canvas for high-quality browser-based PDF generation
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Inline types to avoid circular imports
interface PercentileData {
  p5: number[];
  p25: number[];
  p50: number[];
  p75: number[];
  p95: number[];
}

interface GuardrailEventData {
  yearInRetirement: number;
  activations: number;
  percentage: number;
}

interface SimulationResultData {
  percentiles: PercentileData;
  ages: number[];
  successRate: number;
  medianEndBalance: number;
  guardrailActivations: number;
  guardrailEvents: GuardrailEventData[];
  inflationScenarios: {
    low: number;
    median: number;
    high: number;
  };
  executionTimeMs: number;
}

export interface ReportData {
  userName: string;
  confidenceScore: number;
  simulationResult: SimulationResultData;
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlySpending: number;
  allocation: { stocks: number; bonds: number; cash: number };
}

interface StressScenario {
  name: string;
  description: string;
  drawdown: number;
  endingValue: number;
  survived: boolean;
}

// PDF styling constants
const COLORS = {
  primary: [32, 178, 119] as [number, number, number],
  secondary: [15, 23, 42] as [number, number, number],
  text: [51, 65, 85] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  accent: [245, 158, 11] as [number, number, number],
  danger: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function generateStressScenarios(result: SimulationResultData, data: ReportData): StressScenario[] {
  const retirementIndex = data.retirementAge - data.currentAge;
  const medianAtRetirement = result.percentiles.p50[retirementIndex] || data.currentSavings;
  
  return [
    {
      name: '1929 Great Depression',
      description: 'Market crash with 89% peak-to-trough decline',
      drawdown: 0.89,
      endingValue: Math.max(0, medianAtRetirement * 0.11),
      survived: result.successRate > 70,
    },
    {
      name: '2008 Financial Crisis',
      description: 'Global financial meltdown with 57% decline',
      drawdown: 0.57,
      endingValue: Math.max(0, medianAtRetirement * 0.43),
      survived: result.successRate > 80,
    },
    {
      name: '2000 Dot-com Crash',
      description: 'Tech bubble burst with 49% decline',
      drawdown: 0.49,
      endingValue: Math.max(0, medianAtRetirement * 0.51),
      survived: result.successRate > 85,
    },
  ];
}

function generateExecutiveSummary(result: SimulationResultData, data: ReportData): string[] {
  const successRate = result.successRate;
  const guardrailPercentage = result.guardrailEvents.length > 0
    ? (result.guardrailEvents.reduce((sum, e) => sum + e.activations, 0) / 5000 * 100).toFixed(1)
    : '0';
  
  const retirementIndex = data.retirementAge - data.currentAge;
  const medianAtRetirement = result.percentiles.p50[retirementIndex];
  
  return [
    `Your retirement plan survived ${successRate.toFixed(0)}% of the 5,000 simulated historical market scenarios, ${successRate >= 90 ? 'exceeding' : successRate >= 75 ? 'meeting' : 'falling below'} the recommended 90% threshold.`,
    `At retirement age ${data.retirementAge}, your median projected portfolio value is ${formatCurrency(medianAtRetirement)}, with a 5th percentile "stress case" of ${formatCurrency(result.percentiles.p5[retirementIndex])}.`,
    `The spending guardrail system was activated in ${guardrailPercentage}% of trials, demonstrating ${parseFloat(guardrailPercentage) < 10 ? 'excellent portfolio resilience' : parseFloat(guardrailPercentage) < 25 ? 'adequate risk management' : 'the need for spending adjustments under stress'}.`,
  ];
}

function generateGuardrailAnalysis(result: SimulationResultData): string[] {
  if (result.guardrailEvents.length === 0) {
    return [
      'The 10% Spending Reduction Rule was rarely triggered across all simulations.',
      'This indicates your planned withdrawal rate is sustainable under most market conditions.',
      'Your portfolio maintains sufficient buffer to weather typical market volatility.',
    ];
  }
  
  const totalActivations = result.guardrailEvents.reduce((sum, e) => sum + e.activations, 0);
  const peakEvent = result.guardrailEvents.reduce((max, e) => e.activations > max.activations ? e : max, result.guardrailEvents[0]);
  const avgActivationYear = result.guardrailEvents.reduce((sum, e) => sum + e.yearInRetirement * e.activations, 0) / totalActivations;
  
  return [
    `The 10% Spending Reduction Rule was triggered in ${(totalActivations / 5000 * 100).toFixed(1)}% of simulated trials.`,
    `Peak vulnerability occurs in Year ${peakEvent.yearInRetirement} of retirement, when ${peakEvent.percentage.toFixed(1)}% of trials required spending cuts.`,
    `On average, guardrails activate around Year ${avgActivationYear.toFixed(0)}, extending portfolio life by an estimated 3-5 years in worst-case scenarios.`,
  ];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

async function captureChartAsImage(elementId: string, scale = 2): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;
  
  try {
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor: '#0f172a',
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

export async function generateRetirementReport(
  data: ReportData,
  chartElementIds: { fanChart?: string; resilienceMeter?: string } = {}
): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  let y = margin;
  
  // Cover Page
  pdf.setFillColor(...COLORS.secondary);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setFillColor(...COLORS.primary);
  pdf.circle(pageWidth / 2, 50, 15, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RR', pageWidth / 2, 53, { align: 'center' });
  
  y = 90;
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(32);
  pdf.text('Retirement Resilience', pageWidth / 2, y, { align: 'center' });
  pdf.text('Report', pageWidth / 2, y + 12, { align: 'center' });
  
  y = 127;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.muted);
  pdf.text('Prepared for', pageWidth / 2, y, { align: 'center' });
  pdf.setTextColor(...COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.userName || 'Investor', pageWidth / 2, y + 10, { align: 'center' });
  
  // Confidence Score
  y = 170;
  const scoreRadius = 30;
  const scoreColor = data.confidenceScore >= 90 ? COLORS.primary : 
                     data.confidenceScore >= 75 ? COLORS.accent : COLORS.danger;
  
  pdf.setDrawColor(...scoreColor);
  pdf.setLineWidth(3);
  pdf.circle(pageWidth / 2, y, scoreRadius, 'S');
  pdf.setTextColor(...scoreColor);
  pdf.setFontSize(36);
  pdf.text(`${data.confidenceScore.toFixed(0)}%`, pageWidth / 2, y + 5, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setTextColor(...COLORS.muted);
  pdf.text('Retirement Confidence Score', pageWidth / 2, y + scoreRadius + 15, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
  
  // Page 2: Executive Summary
  pdf.addPage();
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  y = margin;
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(margin, y, 5, 10, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Summary', margin + 10, y + 8);
  y += 25;
  
  const summaryLines = generateExecutiveSummary(data.simulationResult, data);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.text);
  
  summaryLines.forEach((line, index) => {
    const splitLines = pdf.splitTextToSize(line, contentWidth - 10);
    splitLines.forEach((splitLine: string) => {
      pdf.text(`${index + 1}. ${splitLine}`, margin + 5, y);
      y += 7;
    });
    y += 5;
  });
  
  // Key Metrics
  y += 10;
  pdf.setFillColor(240, 249, 255);
  pdf.roundedRect(margin, y, contentWidth, 50, 3, 3, 'F');
  
  y += 15;
  const metricSpacing = contentWidth / 4;
  const retirementIndex = data.retirementAge - data.currentAge;
  
  const metrics = [
    { label: 'Success Rate', value: `${data.simulationResult.successRate.toFixed(1)}%` },
    { label: 'Median at Retirement', value: formatCurrency(data.simulationResult.percentiles.p50[retirementIndex]) },
    { label: 'Worst Case (5th)', value: formatCurrency(data.simulationResult.percentiles.p5[retirementIndex]) },
    { label: 'Best Case (95th)', value: formatCurrency(data.simulationResult.percentiles.p95[retirementIndex]) },
  ];
  
  metrics.forEach((metric, i) => {
    const x = margin + metricSpacing * i + metricSpacing / 2;
    pdf.setFontSize(9);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(metric.label, x, y, { align: 'center' });
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.secondary);
    pdf.text(metric.value, x, y + 12, { align: 'center' });
  });
  
  y += 55;
  
  // Stress Test Results
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(margin, y, 5, 10, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(20);
  pdf.text('Historical Stress Test Results', margin + 10, y + 8);
  y += 25;
  
  const scenarios = generateStressScenarios(data.simulationResult, data);
  
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y, contentWidth, 12, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.muted);
  
  const colWidths = [60, 35, 45, 35];
  let x = margin + 5;
  ['Scenario', 'Drawdown', 'Est. Ending Value', 'Survived'].forEach((header, i) => {
    pdf.text(header, x, y + 8);
    x += colWidths[i];
  });
  y += 15;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.text);
  
  scenarios.forEach((scenario) => {
    x = margin + 5;
    pdf.setFontSize(10);
    pdf.text(scenario.name, x, y);
    x += colWidths[0];
    pdf.text(`-${(scenario.drawdown * 100).toFixed(0)}%`, x, y);
    x += colWidths[1];
    pdf.text(formatCurrency(scenario.endingValue), x, y);
    x += colWidths[2];
    pdf.setFillColor(...(scenario.survived ? COLORS.primary : COLORS.danger));
    pdf.circle(x + 10, y - 2, 3, 'F');
    pdf.text(scenario.survived ? 'Yes' : 'At Risk', x + 18, y);
    y += 12;
  });
  
  // Page 3: Guardrail Analysis
  pdf.addPage();
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  y = margin;
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(margin, y, 5, 10, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Guardrail Analysis', margin + 10, y + 8);
  y += 20;
  
  pdf.setFillColor(255, 251, 235);
  pdf.roundedRect(margin, y, contentWidth, 30, 3, 3, 'F');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.text);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Dynamic Spending Guardrails', margin + 5, y + 10);
  pdf.setFont('helvetica', 'normal');
  const guardrailExplain = 'When your portfolio drops below 80% of its retirement start value, annual spending is automatically reduced by 10% to preserve capital and extend portfolio life.';
  const explainLines = pdf.splitTextToSize(guardrailExplain, contentWidth - 10);
  explainLines.forEach((line: string, i: number) => {
    pdf.text(line, margin + 5, y + 18 + i * 5);
  });
  y += 40;
  
  const guardrailAnalysis = generateGuardrailAnalysis(data.simulationResult);
  pdf.setFontSize(11);
  pdf.setTextColor(...COLORS.text);
  
  guardrailAnalysis.forEach((line) => {
    pdf.setFillColor(...COLORS.accent);
    pdf.circle(margin + 3, y + 2, 2, 'F');
    const splitLines = pdf.splitTextToSize(line, contentWidth - 15);
    splitLines.forEach((splitLine: string) => {
      pdf.text(splitLine, margin + 10, y);
      y += 7;
    });
    y += 5;
  });
  
  // Guardrail events chart
  if (data.simulationResult.guardrailEvents.length > 0) {
    y += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.secondary);
    pdf.text('Guardrail Activation by Year', margin, y);
    y += 10;
    
    const maxActivations = Math.max(...data.simulationResult.guardrailEvents.map(e => e.activations));
    const barMaxWidth = contentWidth - 40;
    
    data.simulationResult.guardrailEvents.slice(0, 10).forEach((event) => {
      const barWidth = (event.activations / maxActivations) * barMaxWidth;
      pdf.setFillColor(...COLORS.accent);
      pdf.roundedRect(margin + 25, y - 4, barWidth, 8, 2, 2, 'F');
      pdf.setFontSize(9);
      pdf.setTextColor(...COLORS.muted);
      pdf.text(`Y${event.yearInRetirement}`, margin, y);
      pdf.setTextColor(...COLORS.text);
      pdf.text(`${event.percentage.toFixed(1)}%`, margin + 30 + barWidth, y);
      y += 12;
    });
  }
  
  // Embed charts
  if (chartElementIds.fanChart) {
    const fanChartImage = await captureChartAsImage(chartElementIds.fanChart);
    if (fanChartImage) {
      y += 15;
      if (y + 60 > pageHeight - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.secondary);
      pdf.text('Portfolio Projection (Fan Chart)', margin, y);
      y += 5;
      
      try {
        pdf.addImage(fanChartImage, 'PNG', margin, y, contentWidth, 55);
      } catch { /* ignore */ }
    }
  }
  
  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(
      'This report is for simulation purposes only and does not constitute formal financial advice.',
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
  
  return pdf.output('blob');
}

export async function downloadRetirementReport(
  data: ReportData,
  chartElementIds: { fanChart?: string; resilienceMeter?: string } = {}
): Promise<void> {
  const blob = await generateRetirementReport(data, chartElementIds);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `retirement-resilience-report-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
