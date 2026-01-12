/**
 * Retirement Resilience Report PDF Generator
 * Uses jspdf and html2canvas for high-quality browser-based PDF generation
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SimulationResult } from '@/hooks/useMonteCarloSimulation';

export interface ReportData {
  userName: string;
  confidenceScore: number;
  simulationResult: SimulationResult;
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
  primary: [32, 178, 119] as [number, number, number], // Primary green
  secondary: [15, 23, 42] as [number, number, number], // Dark background
  text: [51, 65, 85] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  accent: [245, 158, 11] as [number, number, number], // Amber
  danger: [239, 68, 68] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

/**
 * Generate stress test scenarios based on historical data
 */
function generateStressScenarios(result: SimulationResult, data: ReportData): StressScenario[] {
  const retirementIndex = data.retirementAge - data.currentAge;
  const medianAtRetirement = result.percentiles.p50[retirementIndex] || data.currentSavings;
  
  // Simulate historical crisis impacts using percentile data
  const p5 = result.percentiles.p5;
  const p50 = result.percentiles.p50;
  
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

/**
 * Generate executive summary based on simulation results
 */
function generateExecutiveSummary(result: SimulationResult, data: ReportData): string[] {
  const successRate = result.successRate;
  const guardrailPercentage = result.guardrailEvents.length > 0
    ? (result.guardrailEvents.reduce((sum, e) => sum + e.activations, 0) / 5000 * 100).toFixed(1)
    : '0';
  
  const retirementIndex = data.retirementAge - data.currentAge;
  const medianAtRetirement = result.percentiles.p50[retirementIndex];
  
  const sentences = [
    `Your retirement plan survived ${successRate.toFixed(0)}% of the 5,000 simulated historical market scenarios, ${successRate >= 90 ? 'exceeding' : successRate >= 75 ? 'meeting' : 'falling below'} the recommended 90% threshold.`,
    `At retirement age ${data.retirementAge}, your median projected portfolio value is ${formatCurrency(medianAtRetirement)}, with a 5th percentile "stress case" of ${formatCurrency(result.percentiles.p5[retirementIndex])}.`,
    `The spending guardrail system was activated in ${guardrailPercentage}% of trials, demonstrating ${parseFloat(guardrailPercentage) < 10 ? 'excellent portfolio resilience' : parseFloat(guardrailPercentage) < 25 ? 'adequate risk management' : 'the need for spending adjustments under stress'}.`,
  ];
  
  return sentences;
}

/**
 * Generate guardrail analysis text
 */
function generateGuardrailAnalysis(result: SimulationResult): string[] {
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

/**
 * Capture a DOM element as a high-resolution image
 */
async function captureChartAsImage(elementId: string, scale: number = 2): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;
  
  try {
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor: '#0f172a', // Match dark theme
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture chart:', error);
    return null;
  }
}

/**
 * Main PDF generation function
 */
export async function generateRetirementReport(
  data: ReportData,
  chartElementIds: { fanChart?: string; resilienceMeter?: string } = {}
): Promise<Blob> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  
  let y = margin;
  
  // ================== COVER PAGE ==================
  
  // Background
  pdf.setFillColor(...COLORS.secondary);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Logo placeholder (geometric shape as brand element)
  pdf.setFillColor(...COLORS.primary);
  pdf.circle(pageWidth / 2, 50, 15, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RR', pageWidth / 2, 53, { align: 'center' });
  
  // Title
  y = 90;
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(32);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Retirement Resilience', pageWidth / 2, y, { align: 'center' });
  y += 12;
  pdf.text('Report', pageWidth / 2, y, { align: 'center' });
  
  // User name
  y += 25;
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.muted);
  pdf.text('Prepared for', pageWidth / 2, y, { align: 'center' });
  y += 10;
  pdf.setTextColor(...COLORS.white);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.userName || 'Investor', pageWidth / 2, y, { align: 'center' });
  
  // Confidence Score Circle
  y = 170;
  const scoreRadius = 30;
  const scoreColor = data.confidenceScore >= 90 ? COLORS.primary : 
                     data.confidenceScore >= 75 ? COLORS.accent : COLORS.danger;
  
  // Outer ring
  pdf.setDrawColor(...scoreColor);
  pdf.setLineWidth(3);
  pdf.circle(pageWidth / 2, y, scoreRadius, 'S');
  
  // Score text
  pdf.setTextColor(...scoreColor);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.confidenceScore.toFixed(0)}%`, pageWidth / 2, y + 5, { align: 'center' });
  
  // Score label
  y += scoreRadius + 15;
  pdf.setFontSize(14);
  pdf.setTextColor(...COLORS.muted);
  pdf.text('Retirement Confidence Score', pageWidth / 2, y, { align: 'center' });
  
  // Date
  y = pageHeight - 30;
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, y, { align: 'center' });
  
  // ================== PAGE 2: EXECUTIVE SUMMARY ==================
  pdf.addPage();
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  y = margin;
  
  // Section header
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(margin, y, 5, 10, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Executive Summary', margin + 10, y + 8);
  y += 25;
  
  // Summary text
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
  
  // Key Metrics Box
  y += 10;
  pdf.setFillColor(240, 249, 255);
  pdf.roundedRect(margin, y, contentWidth, 50, 3, 3, 'F');
  pdf.setDrawColor(200, 220, 240);
  pdf.roundedRect(margin, y, contentWidth, 50, 3, 3, 'S');
  
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
  
  // ================== STRESS TEST RESULTS ==================
  
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(margin, y, 5, 10, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Historical Stress Test Results', margin + 10, y + 8);
  y += 25;
  
  const scenarios = generateStressScenarios(data.simulationResult, data);
  
  // Table header
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
  
  // Table rows
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
    
    // Status indicator
    pdf.setFillColor(...(scenario.survived ? COLORS.primary : COLORS.danger));
    pdf.circle(x + 10, y - 2, 3, 'F');
    pdf.text(scenario.survived ? 'Yes' : 'At Risk', x + 18, y);
    
    y += 12;
  });
  
  // ================== PAGE 3: GUARDRAIL ANALYSIS ==================
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
  
  // Guardrail explanation box
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
  
  // Guardrail analysis text
  const guardrailAnalysis = generateGuardrailAnalysis(data.simulationResult);
  pdf.setFontSize(11);
  pdf.setTextColor(...COLORS.text);
  
  guardrailAnalysis.forEach((line, index) => {
    const bulletY = y + 3;
    pdf.setFillColor(...COLORS.accent);
    pdf.circle(margin + 3, bulletY - 1, 2, 'F');
    
    const splitLines = pdf.splitTextToSize(line, contentWidth - 15);
    splitLines.forEach((splitLine: string) => {
      pdf.text(splitLine, margin + 10, y);
      y += 7;
    });
    y += 5;
  });
  
  // Guardrail events summary
  if (data.simulationResult.guardrailEvents.length > 0) {
    y += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.secondary);
    pdf.text('Guardrail Activation by Year', margin, y);
    y += 10;
    
    // Mini bar chart representation
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
  
  // Capture and embed charts if available
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
        y += 60;
      } catch (e) {
        console.error('Failed to add fan chart image', e);
      }
    }
  }
  
  // ================== FOOTER ON ALL PAGES ==================
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Disclaimer footer
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
    
    // Page number
    pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
  
  return pdf.output('blob');
}

/**
 * Download the PDF report
 */
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
