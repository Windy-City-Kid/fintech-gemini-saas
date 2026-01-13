/**
 * Professional Plan Reporter PDF Generator
 * Multi-page comprehensive retirement planning report with bank-ready formatting
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============ DATA INTERFACES ============

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

interface AccountData {
  id: string;
  account_name: string;
  institution_name: string;
  account_type: string;
  current_balance: number;
  is_manual_entry: boolean;
  account_mask?: string | null;
}

interface PropertyData {
  id: string;
  property_name: string;
  property_type: string;
  estimated_value: number;
  mortgage_balance: number;
  mortgage_interest_rate: number;
  mortgage_monthly_payment: number;
  relocation_state?: string | null;
  relocation_age?: number | null;
  relocation_sale_price?: number | null;
  relocation_new_purchase_price?: number | null;
}

interface StateTaxRule {
  state_code: string;
  state_name: string;
  base_rate: number;
  top_marginal_rate: number;
  rate_type: string;
  social_security_taxable: boolean;
  retirement_exclusion_amount: number;
  property_tax_rate: number;
  col_multiplier: number;
}

interface RateAssumption {
  category: string;
  name: string;
  historical_avg: number;
  user_optimistic: number;
  user_pessimistic: number;
  market_sentiment?: number | null;
}

interface RelocationScenario {
  currentState: StateTaxRule;
  destinationState: StateTaxRule;
  homeValue: number;
  annualIncome: number;
  yearsInRetirement: number;
}

export interface ProfessionalReportData {
  userName: string;
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  
  // Simulation data
  simulationResult: SimulationData | null;
  
  // Financial data
  accounts: AccountData[];
  properties: PropertyData[];
  totalNetWorth: number;
  totalHomeEquity: number;
  
  // Rate assumptions
  rateAssumptions: RateAssumption[];
  
  // Relocation scenario (optional)
  relocationScenario?: RelocationScenario | null;
  
  // All 51 state tax rules
  stateTaxRules: StateTaxRule[];
}

// ============ STYLING CONSTANTS ============

const COLORS = {
  primary: [32, 178, 119] as [number, number, number], // Emerald
  secondary: [15, 23, 42] as [number, number, number], // Slate 900
  accent: [245, 158, 11] as [number, number, number], // Amber
  text: [51, 65, 85] as [number, number, number], // Slate 600
  muted: [100, 116, 139] as [number, number, number], // Slate 500
  danger: [239, 68, 68] as [number, number, number], // Red
  success: [34, 197, 94] as [number, number, number], // Green
  white: [255, 255, 255] as [number, number, number],
  lightGray: [248, 250, 252] as [number, number, number],
  watermark: [200, 200, 200] as [number, number, number],
};

const FONTS = {
  title: 28,
  heading: 18,
  subheading: 14,
  body: 11,
  small: 9,
  tiny: 7,
};

// ============ HELPER FUNCTIONS ============

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getScoreLabel(rate: number): string {
  if (rate >= 90) return 'Excellent';
  if (rate >= 75) return 'Good';
  if (rate >= 60) return 'Moderate';
  return 'Needs Attention';
}

function getScoreColor(rate: number): [number, number, number] {
  if (rate >= 90) return COLORS.success;
  if (rate >= 75) return COLORS.primary;
  if (rate >= 60) return COLORS.accent;
  return COLORS.danger;
}

function generateHealthSummary(data: ProfessionalReportData): string[] {
  const result = data.simulationResult;
  const successRate = result?.successRate || 0;
  
  const sentences: string[] = [];
  
  // Sentence 1: Overall assessment
  if (successRate >= 90) {
    sentences.push(`Your retirement plan demonstrates excellent resilience, with a ${successRate.toFixed(0)}% probability of maintaining your desired lifestyle through age ${data.lifeExpectancy}.`);
  } else if (successRate >= 75) {
    sentences.push(`Your retirement plan shows solid foundation with a ${successRate.toFixed(0)}% success rate, though some adjustments could further strengthen your financial security.`);
  } else if (successRate >= 60) {
    sentences.push(`Your current plan has a ${successRate.toFixed(0)}% probability of success, indicating moderate risk that warrants attention to improve retirement outcomes.`);
  } else {
    sentences.push(`With a ${successRate.toFixed(0)}% success rate, your plan requires significant adjustments to ensure financial security in retirement.`);
  }
  
  // Sentence 2: Portfolio strength
  const netWorth = data.totalNetWorth + data.totalHomeEquity;
  const yearsToRetirement = data.retirementAge - data.currentAge;
  sentences.push(`Your current net worth of ${formatCurrency(netWorth)} positions you ${yearsToRetirement > 0 ? `${yearsToRetirement} years from` : 'at'} your target retirement age of ${data.retirementAge}.`);
  
  // Sentence 3: Key insight
  if (result && result.guardrailActivations > 0) {
    const guardrailPercent = (result.guardrailActivations / 5000 * 100).toFixed(1);
    sentences.push(`Dynamic spending guardrails were activated in ${guardrailPercent}% of scenarios, demonstrating the plan's adaptive resilience to market volatility.`);
  } else {
    sentences.push('The Monte Carlo analysis of 5,000 market scenarios indicates your planned withdrawal strategy is sustainable under most historical market conditions.');
  }
  
  return sentences;
}

async function captureElement(elementId: string, scale = 2): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;
  
  try {
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

async function loadLogoAsBase64(): Promise<string | null> {
  try {
    const response = await fetch('/images/logo.png');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ============ PDF PAGE GENERATORS ============

function addWatermark(pdf: jsPDF, pageWidth: number, pageHeight: number) {
  pdf.setTextColor(...COLORS.watermark);
  pdf.setFontSize(60);
  pdf.setFont('helvetica', 'bold');
  
  // Diagonal watermark
  pdf.text('CONFIDENTIAL', pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45,
  });
}

function addHeader(pdf: jsPDF, pageWidth: number, margin: number) {
  // Logo placeholder (circle with initials)
  pdf.setFillColor(...COLORS.primary);
  pdf.circle(margin + 8, 12, 6, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PP', margin + 8, 14, { align: 'center' });
  
  // App name
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(10);
  pdf.text('Professional Plan Reporter', margin + 18, 14);
  
  // Bank-Ready stamp
  pdf.setFillColor(...COLORS.primary);
  pdf.roundedRect(pageWidth - margin - 35, 6, 35, 12, 2, 2, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BANK-READY', pageWidth - margin - 17.5, 14, { align: 'center' });
  
  // Date
  pdf.setTextColor(...COLORS.muted);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  pdf.text(dateStr, pageWidth / 2, 14, { align: 'center' });
}

function addFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, pageNum: number, totalPages: number) {
  pdf.setFillColor(...COLORS.lightGray);
  pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  
  pdf.setFontSize(FONTS.tiny);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(
    'This report is for educational purposes only and does not constitute investment advice. Consult a qualified financial advisor.',
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );
  
  pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 20, pageHeight - 5, { align: 'right' });
}

function generatePage1CoverAndScore(
  pdf: jsPDF,
  data: ProfessionalReportData,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  logoBase64: string | null
) {
  // Dark background - match the logo's navy color
  pdf.setFillColor(26, 32, 56); // Navy matching logo background
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Decorative elements
  pdf.setFillColor(35, 42, 70);
  pdf.circle(pageWidth * 0.8, pageHeight * 0.2, 80, 'F');
  pdf.setFillColor(30, 38, 62);
  pdf.circle(pageWidth * 0.2, pageHeight * 0.8, 60, 'F');
  
  // Logo - embed the actual image
  if (logoBase64) {
    try {
      // Logo dimensions - centered, appropriately sized
      const logoWidth = 70;
      const logoHeight = 50;
      pdf.addImage(logoBase64, 'PNG', (pageWidth - logoWidth) / 2, 20, logoWidth, logoHeight);
    } catch (e) {
      // Fallback to text if image fails
      pdf.setFillColor(...COLORS.primary);
      pdf.circle(pageWidth / 2, 45, 18, 'F');
      pdf.setTextColor(...COLORS.white);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('GON', pageWidth / 2, 50, { align: 'center' });
    }
  } else {
    // Fallback placeholder
    pdf.setFillColor(...COLORS.primary);
    pdf.circle(pageWidth / 2, 45, 18, 'F');
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GON', pageWidth / 2, 50, { align: 'center' });
  }
  
  // Title
  let y = 85;
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Professional', pageWidth / 2, y, { align: 'center' });
  pdf.text('Plan Report', pageWidth / 2, y + 14, { align: 'center' });
  
  // Subtitle
  y = 125;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.muted);
  pdf.text('Comprehensive Retirement Analysis', pageWidth / 2, y, { align: 'center' });
  
  // Prepared for
  y = 150;
  pdf.setFontSize(12);
  pdf.text('Prepared for', pageWidth / 2, y, { align: 'center' });
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.userName || 'Investor', pageWidth / 2, y + 12, { align: 'center' });
  
  // Success Score Gauge
  y = 195;
  const successRate = data.simulationResult?.successRate || 0;
  const scoreColor = getScoreColor(successRate);
  const scoreRadius = 35;
  
  // Outer ring
  pdf.setDrawColor(...scoreColor);
  pdf.setLineWidth(4);
  pdf.circle(pageWidth / 2, y, scoreRadius, 'S');
  
  // Score
  pdf.setTextColor(...scoreColor);
  pdf.setFontSize(42);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${successRate.toFixed(0)}%`, pageWidth / 2, y + 8, { align: 'center' });
  
  // Label
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Success Score', pageWidth / 2, y + scoreRadius + 15, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(getScoreLabel(successRate), pageWidth / 2, y + scoreRadius + 25, { align: 'center' });
  
  // 3-Sentence Summary
  y = 270;
  const summaryLines = generateHealthSummary(data);
  pdf.setFontSize(10);
  pdf.setTextColor(180, 180, 180);
  
  summaryLines.forEach((line, idx) => {
    const splitLines = pdf.splitTextToSize(line, pageWidth - margin * 4);
    splitLines.forEach((splitLine: string) => {
      pdf.text(splitLine, pageWidth / 2, y, { align: 'center' });
      y += 6;
    });
    y += 4;
  });
  
  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.muted);
  pdf.text(
    `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | 5,000 Monte Carlo Simulations`,
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );
  
  // Bank-Ready stamp at bottom
  pdf.setFillColor(...COLORS.primary);
  pdf.roundedRect(pageWidth / 2 - 25, pageHeight - 35, 50, 10, 2, 2, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BANK-READY CERTIFIED', pageWidth / 2, pageHeight - 28, { align: 'center' });
}

function generatePage2NetWorth(
  pdf: jsPDF,
  data: ProfessionalReportData,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  // White background
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Watermark
  addWatermark(pdf, pageWidth, pageHeight);
  
  // Header
  addHeader(pdf, pageWidth, margin);
  
  let y = 30;
  
  // Page title
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(margin, y, 5, 12, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(FONTS.heading);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Net Worth Statement', margin + 10, y + 9);
  y += 25;
  
  // Summary boxes
  const boxWidth = (pageWidth - margin * 2 - 10) / 3;
  const totalNetWorth = data.totalNetWorth + data.totalHomeEquity;
  
  const summaryItems = [
    { label: 'Total Net Worth', value: formatCurrency(totalNetWorth), color: COLORS.primary },
    { label: 'Investment Accounts', value: formatCurrency(data.totalNetWorth), color: COLORS.secondary },
    { label: 'Home Equity', value: formatCurrency(data.totalHomeEquity), color: COLORS.accent },
  ];
  
  summaryItems.forEach((item, i) => {
    const x = margin + i * (boxWidth + 5);
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(x, y, boxWidth, 25, 3, 3, 'F');
    
    pdf.setFontSize(FONTS.small);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(item.label, x + 5, y + 10);
    
    pdf.setFontSize(FONTS.subheading);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...item.color);
    pdf.text(item.value, x + 5, y + 20);
  });
  y += 35;
  
  // Investment Accounts Table
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(margin, y, 5, 10, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(FONTS.subheading);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Investment Accounts', margin + 10, y + 7);
  y += 15;
  
  // Table header
  const tableWidth = pageWidth - margin * 2;
  pdf.setFillColor(...COLORS.lightGray);
  pdf.rect(margin, y, tableWidth, 10, 'F');
  
  pdf.setFontSize(FONTS.small);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.muted);
  
  const colWidths = [65, 45, 35, 30];
  let x = margin + 5;
  ['Account / Institution', 'Type', 'Source', 'Balance'].forEach((header, i) => {
    pdf.text(header, x, y + 7);
    x += colWidths[i];
  });
  y += 12;
  
  // Account rows
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.text);
  
  const accounts = data.accounts.slice(0, 12); // Limit to prevent overflow
  accounts.forEach((account) => {
    if (y > pageHeight - 80) return; // Skip if near bottom
    
    x = margin + 5;
    pdf.setFontSize(FONTS.small);
    
    // Account name (truncated)
    const name = account.account_name.length > 25 
      ? account.account_name.substring(0, 22) + '...' 
      : account.account_name;
    pdf.text(name, x, y);
    pdf.setFontSize(FONTS.tiny);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(account.institution_name.substring(0, 25), x, y + 4);
    pdf.setTextColor(...COLORS.text);
    x += colWidths[0];
    
    pdf.setFontSize(FONTS.small);
    pdf.text(account.account_type, x, y);
    x += colWidths[1];
    
    pdf.text(account.is_manual_entry ? 'Manual' : 'Plaid', x, y);
    x += colWidths[2];
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(formatCurrency(account.current_balance), x, y);
    pdf.setFont('helvetica', 'normal');
    
    y += 12;
  });
  
  // Properties section if we have room
  if (y < pageHeight - 80 && data.properties.length > 0) {
    y += 10;
    pdf.setFillColor(...COLORS.accent);
    pdf.rect(margin, y, 5, 10, 'F');
    pdf.setTextColor(...COLORS.secondary);
    pdf.setFontSize(FONTS.subheading);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Real Estate Holdings', margin + 10, y + 7);
    y += 15;
    
    // Property rows
    data.properties.forEach((property) => {
      if (y > pageHeight - 40) return;
      
      const equity = property.estimated_value - property.mortgage_balance;
      
      pdf.setFillColor(255, 251, 235);
      pdf.roundedRect(margin, y, tableWidth, 18, 2, 2, 'F');
      
      pdf.setFontSize(FONTS.small);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.secondary);
      pdf.text(property.property_name, margin + 5, y + 7);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.muted);
      pdf.setFontSize(FONTS.tiny);
      pdf.text(`Value: ${formatCurrency(property.estimated_value)} | Mortgage: ${formatCurrency(property.mortgage_balance)}`, margin + 5, y + 13);
      
      pdf.setFontSize(FONTS.subheading);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.primary);
      pdf.text(formatCurrency(equity), pageWidth - margin - 25, y + 10, { align: 'right' });
      
      y += 22;
    });
  }
}

function generatePage3Relocation(
  pdf: jsPDF,
  data: ProfessionalReportData,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  // White background
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Watermark
  addWatermark(pdf, pageWidth, pageHeight);
  
  // Header
  addHeader(pdf, pageWidth, margin);
  
  let y = 30;
  
  // Page title
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(margin, y, 5, 12, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(FONTS.heading);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Relocation Savings Analysis', margin + 10, y + 9);
  y += 25;
  
  const scenario = data.relocationScenario;
  
  if (!scenario) {
    // No active scenario
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 40, 3, 3, 'F');
    
    pdf.setFontSize(FONTS.body);
    pdf.setTextColor(...COLORS.muted);
    pdf.text('No What-If Relocation Scenario Active', margin + 10, y + 18);
    pdf.setFontSize(FONTS.small);
    pdf.text('Configure a destination state in the Real Estate section to see tax savings projections.', margin + 10, y + 30);
    
    y += 55;
  } else {
    // Comparison header
    const halfWidth = (pageWidth - margin * 2 - 10) / 2;
    
    // Current State Box
    pdf.setFillColor(254, 242, 242);
    pdf.roundedRect(margin, y, halfWidth, 60, 3, 3, 'F');
    pdf.setFontSize(FONTS.small);
    pdf.setTextColor(...COLORS.muted);
    pdf.text('Current State', margin + 5, y + 12);
    pdf.setFontSize(FONTS.heading);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.danger);
    pdf.text(scenario.currentState.state_name, margin + 5, y + 28);
    
    const currentIncomeTax = scenario.annualIncome * (scenario.currentState.top_marginal_rate / 100);
    const currentPropertyTax = scenario.homeValue * (scenario.currentState.property_tax_rate / 100);
    const currentTotal = currentIncomeTax + currentPropertyTax;
    
    pdf.setFontSize(FONTS.tiny);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(`Income Tax: ${formatCurrency(currentIncomeTax)}/yr`, margin + 5, y + 40);
    pdf.text(`Property Tax: ${formatCurrency(currentPropertyTax)}/yr`, margin + 5, y + 48);
    pdf.setFontSize(FONTS.body);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.danger);
    pdf.text(`Total: ${formatCurrency(currentTotal)}/yr`, margin + 5, y + 56);
    
    // Destination State Box
    pdf.setFillColor(240, 253, 244);
    pdf.roundedRect(margin + halfWidth + 10, y, halfWidth, 60, 3, 3, 'F');
    pdf.setFontSize(FONTS.small);
    pdf.setTextColor(...COLORS.muted);
    pdf.text('Destination State', margin + halfWidth + 15, y + 12);
    pdf.setFontSize(FONTS.heading);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.success);
    pdf.text(scenario.destinationState.state_name, margin + halfWidth + 15, y + 28);
    
    const destIncomeTax = scenario.annualIncome * (scenario.destinationState.top_marginal_rate / 100);
    const destPropertyTax = scenario.homeValue * (scenario.destinationState.property_tax_rate / 100);
    const destTotal = destIncomeTax + destPropertyTax;
    
    pdf.setFontSize(FONTS.tiny);
    pdf.setTextColor(...COLORS.muted);
    pdf.text(`Income Tax: ${formatCurrency(destIncomeTax)}/yr`, margin + halfWidth + 15, y + 40);
    pdf.text(`Property Tax: ${formatCurrency(destPropertyTax)}/yr`, margin + halfWidth + 15, y + 48);
    pdf.setFontSize(FONTS.body);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.success);
    pdf.text(`Total: ${formatCurrency(destTotal)}/yr`, margin + halfWidth + 15, y + 56);
    
    y += 70;
    
    // Savings Summary
    const annualSavings = currentTotal - destTotal;
    const lifetimeSavings = annualSavings * scenario.yearsInRetirement;
    
    pdf.setFillColor(...(annualSavings > 0 ? COLORS.success : COLORS.danger));
    pdf.roundedRect(margin, y, pageWidth - margin * 2, 35, 3, 3, 'F');
    
    pdf.setTextColor(...COLORS.white);
    pdf.setFontSize(FONTS.small);
    pdf.text('Net Annual Tax Savings', margin + 10, y + 12);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${annualSavings >= 0 ? '+' : ''}${formatCurrency(annualSavings)}`, margin + 10, y + 28);
    
    pdf.setFontSize(FONTS.small);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Lifetime Savings (${scenario.yearsInRetirement} yrs): ${formatCurrency(lifetimeSavings)}`, pageWidth - margin - 10, y + 20, { align: 'right' });
    
    y += 45;
    
    // Trade-off insight
    if (destPropertyTax > currentPropertyTax && destIncomeTax < currentIncomeTax) {
      pdf.setFillColor(255, 251, 235);
      pdf.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'F');
      
      pdf.setFillColor(...COLORS.accent);
      pdf.circle(margin + 10, y + 12.5, 4, 'F');
      pdf.setTextColor(...COLORS.white);
      pdf.setFontSize(FONTS.tiny);
      pdf.setFont('helvetica', 'bold');
      pdf.text('!', margin + 10, y + 14.5, { align: 'center' });
      
      pdf.setTextColor(...COLORS.secondary);
      pdf.setFontSize(FONTS.small);
      const incomeSavings = currentIncomeTax - destIncomeTax;
      const propertyIncrease = destPropertyTax - currentPropertyTax;
      const tradeoffText = `Moving saves ${formatCurrency(incomeSavings)} in Income Tax but increases Property Tax by ${formatCurrency(propertyIncrease)}.`;
      pdf.text(tradeoffText, margin + 20, y + 14);
      
      y += 35;
    }
  }
  
  // State Tax Reference Table (Top 10 most retirement-friendly)
  y += 10;
  pdf.setFillColor(...COLORS.secondary);
  pdf.rect(margin, y, 5, 10, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(FONTS.subheading);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Retirement-Friendly States Reference', margin + 10, y + 7);
  y += 15;
  
  // Sort by lowest combined tax burden
  const sortedStates = [...data.stateTaxRules]
    .map(s => ({
      ...s,
      effectiveRate: s.top_marginal_rate + s.property_tax_rate,
    }))
    .sort((a, b) => a.effectiveRate - b.effectiveRate)
    .slice(0, 10);
  
  // Table header
  pdf.setFillColor(...COLORS.lightGray);
  pdf.rect(margin, y, pageWidth - margin * 2, 8, 'F');
  
  pdf.setFontSize(FONTS.tiny);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.muted);
  
  const stateColWidths = [40, 25, 30, 35, 40];
  let x = margin + 3;
  ['State', 'Income Tax', 'Property Tax', 'SS Taxable', 'Combined'].forEach((header, i) => {
    pdf.text(header, x, y + 5.5);
    x += stateColWidths[i];
  });
  y += 10;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.text);
  
  sortedStates.forEach((state, idx) => {
    if (y > pageHeight - 30) return;
    
    if (idx % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, y - 3, pageWidth - margin * 2, 8, 'F');
    }
    
    x = margin + 3;
    pdf.setFontSize(FONTS.tiny);
    
    pdf.text(state.state_name.substring(0, 18), x, y + 2);
    x += stateColWidths[0];
    
    pdf.text(state.rate_type === 'none' ? 'None' : `${state.top_marginal_rate.toFixed(2)}%`, x, y + 2);
    x += stateColWidths[1];
    
    pdf.text(`${state.property_tax_rate.toFixed(2)}%`, x, y + 2);
    x += stateColWidths[2];
    
    pdf.setTextColor(...(state.social_security_taxable ? COLORS.danger : COLORS.success));
    pdf.text(state.social_security_taxable ? 'Yes' : 'No', x, y + 2);
    pdf.setTextColor(...COLORS.text);
    x += stateColWidths[3];
    
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${state.effectiveRate.toFixed(2)}%`, x, y + 2);
    pdf.setFont('helvetica', 'normal');
    
    y += 8;
  });
}

function generatePage4AuditTrail(
  pdf: jsPDF,
  data: ProfessionalReportData,
  pageWidth: number,
  pageHeight: number,
  margin: number
) {
  // White background
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Watermark
  addWatermark(pdf, pageWidth, pageHeight);
  
  // Header
  addHeader(pdf, pageWidth, margin);
  
  let y = 30;
  
  // Page title
  pdf.setFillColor(...COLORS.secondary);
  pdf.rect(margin, y, 5, 12, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(FONTS.heading);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Audit Trail: Assumptions & Parameters', margin + 10, y + 9);
  y += 25;
  
  // Simulation Parameters
  pdf.setFillColor(240, 249, 255);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 35, 3, 3, 'F');
  
  pdf.setFontSize(FONTS.body);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.secondary);
  pdf.text('Monte Carlo Simulation Parameters', margin + 5, y + 10);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONTS.small);
  pdf.setTextColor(...COLORS.text);
  
  const simParams = [
    `Iterations: 5,000`,
    `Sampling: Latin Hypercube (LHS)`,
    `Correlation: Cholesky Decomposition (3×3 matrix)`,
    `Current Age: ${data.currentAge}`,
    `Retirement Age: ${data.retirementAge}`,
    `Life Expectancy: ${data.lifeExpectancy}`,
  ];
  
  const paramsPerRow = 3;
  const colWidth = (pageWidth - margin * 2 - 10) / paramsPerRow;
  
  simParams.forEach((param, i) => {
    const row = Math.floor(i / paramsPerRow);
    const col = i % paramsPerRow;
    pdf.text(param, margin + 5 + col * colWidth, y + 18 + row * 7);
  });
  
  y += 45;
  
  // Rate Assumptions Table
  pdf.setFillColor(...COLORS.accent);
  pdf.rect(margin, y, 5, 10, 'F');
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(FONTS.subheading);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Rate Assumptions', margin + 10, y + 7);
  y += 15;
  
  // Table header
  pdf.setFillColor(...COLORS.lightGray);
  pdf.rect(margin, y, pageWidth - margin * 2, 10, 'F');
  
  pdf.setFontSize(FONTS.small);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.muted);
  
  const rateColWidths = [40, 45, 30, 30, 30];
  let x = margin + 5;
  ['Category', 'Assumption', 'Historical', 'Optimistic', 'Pessimistic'].forEach((header, i) => {
    pdf.text(header, x, y + 7);
    x += rateColWidths[i];
  });
  y += 12;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.text);
  
  data.rateAssumptions.forEach((assumption, idx) => {
    if (y > pageHeight - 60) return;
    
    if (idx % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, y - 3, pageWidth - margin * 2, 10, 'F');
    }
    
    x = margin + 5;
    pdf.setFontSize(FONTS.small);
    
    pdf.text(assumption.category, x, y + 4);
    x += rateColWidths[0];
    
    pdf.text(assumption.name.substring(0, 20), x, y + 4);
    x += rateColWidths[1];
    
    pdf.text(`${assumption.historical_avg.toFixed(1)}%`, x, y + 4);
    x += rateColWidths[2];
    
    pdf.setTextColor(...COLORS.success);
    pdf.text(`${assumption.user_optimistic.toFixed(1)}%`, x, y + 4);
    x += rateColWidths[3];
    
    pdf.setTextColor(...COLORS.danger);
    pdf.text(`${assumption.user_pessimistic.toFixed(1)}%`, x, y + 4);
    pdf.setTextColor(...COLORS.text);
    
    y += 10;
  });
  
  y += 15;
  
  // IRS Limits Note
  pdf.setFillColor(255, 251, 235);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'F');
  
  pdf.setFillColor(...COLORS.accent);
  pdf.circle(margin + 10, y + 12.5, 4, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(FONTS.tiny);
  pdf.setFont('helvetica', 'bold');
  pdf.text('§', margin + 10, y + 14.5, { align: 'center' });
  
  pdf.setTextColor(...COLORS.secondary);
  pdf.setFontSize(FONTS.small);
  pdf.setFont('helvetica', 'bold');
  pdf.text('2026 IRS Limits Applied', margin + 20, y + 10);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONTS.tiny);
  pdf.text('401(k): $24,500 | IRA: $7,500 | HSA Family: $8,550 | Super Catch-Up (60-63): +$11,250', margin + 20, y + 18);
  
  y += 35;
  
  // Methodology note
  pdf.setFontSize(FONTS.small);
  pdf.setTextColor(...COLORS.muted);
  pdf.setFont('helvetica', 'italic');
  const methodNote = 'This analysis uses Monte Carlo simulation with historically-correlated asset class returns, dynamic spending guardrails (10% reduction at 80% portfolio threshold), and projected Medicare/IRMAA costs. Success is measured as maintaining portfolio balance above the legacy goal through the final simulation year.';
  const methodLines = pdf.splitTextToSize(methodNote, pageWidth - margin * 2);
  methodLines.forEach((line: string) => {
    pdf.text(line, margin, y);
    y += 5;
  });
  
  // Certification stamp
  y += 15;
  pdf.setFillColor(...COLORS.secondary);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'F');
  
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(FONTS.small);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CERTIFIED AUDIT TRAIL', margin + 10, y + 9);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(FONTS.tiny);
  pdf.text(`Report ID: RPT-${Date.now().toString(36).toUpperCase()}`, margin + 10, y + 15);
  pdf.text(`Generated: ${new Date().toISOString()}`, pageWidth - margin - 5, y + 12, { align: 'right' });
}

// ============ MAIN EXPORT FUNCTION ============

export async function generateProfessionalReport(
  data: ProfessionalReportData
): Promise<Blob> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  
  // Load logo
  const logoBase64 = await loadLogoAsBase64();
  
  // Page 1: Cover with Success Score
  generatePage1CoverAndScore(pdf, data, pageWidth, pageHeight, margin, logoBase64);
  
  // Page 2: Net Worth Statement
  pdf.addPage();
  generatePage2NetWorth(pdf, data, pageWidth, pageHeight, margin);
  
  // Page 3: Relocation Savings
  pdf.addPage();
  generatePage3Relocation(pdf, data, pageWidth, pageHeight, margin);
  
  // Page 4: Audit Trail
  pdf.addPage();
  generatePage4AuditTrail(pdf, data, pageWidth, pageHeight, margin);
  
  // Add footers to pages 2-4
  const totalPages = pdf.getNumberOfPages();
  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, pageWidth, pageHeight, i, totalPages);
  }
  
  return pdf.output('blob');
}

export async function downloadProfessionalReport(data: ProfessionalReportData): Promise<void> {
  const blob = await generateProfessionalReport(data);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `professional-plan-report-${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
