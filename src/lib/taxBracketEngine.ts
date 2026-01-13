/**
 * Tax-Bracket Filling Withdrawal Engine
 * 
 * Implements intelligent withdrawal sequencing to optimize tax efficiency
 * by filling lower tax brackets before moving to tax-deferred accounts.
 */

import { AccountTaxType, WithdrawalAccount, WithdrawalResult } from './withdrawalEngine';
import { IRMAA_BRACKETS_2026, checkIRMAABracketChange, getNextIRMAAThreshold } from './medicareCalculator';

// ============= 2026 FEDERAL TAX BRACKETS =============

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
  label: string;
}

// 2026 Federal Tax Brackets (Married Filing Jointly - projected)
export const FEDERAL_TAX_BRACKETS_MFJ: TaxBracket[] = [
  { min: 0, max: 24000, rate: 0.10, label: '10%' },
  { min: 24000, max: 97450, rate: 0.12, label: '12%' },
  { min: 97450, max: 201200, rate: 0.22, label: '22%' },
  { min: 201200, max: 383900, rate: 0.24, label: '24%' },
  { min: 383900, max: 487450, rate: 0.32, label: '32%' },
  { min: 487450, max: 731200, rate: 0.35, label: '35%' },
  { min: 731200, max: Infinity, rate: 0.37, label: '37%' },
];

// 2026 Federal Tax Brackets (Single - projected)
export const FEDERAL_TAX_BRACKETS_SINGLE: TaxBracket[] = [
  { min: 0, max: 12000, rate: 0.10, label: '10%' },
  { min: 12000, max: 48725, rate: 0.12, label: '12%' },
  { min: 48725, max: 100600, rate: 0.22, label: '22%' },
  { min: 100600, max: 191950, rate: 0.24, label: '24%' },
  { min: 191950, max: 243725, rate: 0.32, label: '32%' },
  { min: 243725, max: 609350, rate: 0.35, label: '35%' },
  { min: 609350, max: Infinity, rate: 0.37, label: '37%' },
];

// Standard Deductions 2026 (projected)
export const STANDARD_DEDUCTION_MFJ = 30450;
export const STANDARD_DEDUCTION_SINGLE = 15225;

// ============= IRMAA CLIFF DETECTION =============

export interface IRMAACliffWarning {
  currentBracket: string;
  nextBracket: string;
  headroom: number;
  thresholdAmount: number;
  annualPremiumIncrease: number;
  message: string;
}

/**
 * Check if current MAGI is approaching an IRMAA cliff
 */
export function checkIRMAACliff(
  currentMAGI: number,
  proposedWithdrawal: number,
  isMarried: boolean
): IRMAACliffWarning | null {
  const bracketChange = checkIRMAABracketChange(currentMAGI, proposedWithdrawal, isMarried);
  
  if (bracketChange) {
    return {
      currentBracket: bracketChange.previousBracket.label,
      nextBracket: bracketChange.newBracket.label,
      headroom: 0,
      thresholdAmount: bracketChange.magiThresholdExceeded,
      annualPremiumIncrease: bracketChange.annualPremiumIncrease,
      message: `Withdrawal of $${proposedWithdrawal.toLocaleString()} exceeds IRMAA threshold by $${bracketChange.triggerAmount.toLocaleString()}. This will increase Medicare premiums by $${bracketChange.annualPremiumIncrease.toLocaleString()}/year.`,
    };
  }
  
  // Check headroom even if no cliff crossed
  const nextThreshold = getNextIRMAAThreshold(currentMAGI, isMarried);
  if (nextThreshold && nextThreshold.headroom < 25000) {
    return {
      currentBracket: IRMAA_BRACKETS_2026.find(b => 
        currentMAGI >= (isMarried ? b.jointMin : b.singleMin) && 
        currentMAGI < (isMarried ? b.jointMax : b.singleMax)
      )?.label || 'Standard',
      nextBracket: nextThreshold.nextBracketLabel,
      headroom: nextThreshold.headroom,
      thresholdAmount: nextThreshold.threshold,
      annualPremiumIncrease: 0,
      message: `Warning: Only $${nextThreshold.headroom.toLocaleString()} headroom before ${nextThreshold.nextBracketLabel} IRMAA bracket.`,
    };
  }
  
  return null;
}

// ============= TAX BRACKET CALCULATION =============

export interface TaxCalculation {
  taxableIncome: number;
  currentBracket: TaxBracket;
  marginalRate: number;
  effectiveRate: number;
  totalTax: number;
  bracketSpace: number; // Room left in current bracket
  nextBracket: TaxBracket | null;
}

/**
 * Calculate tax position and remaining bracket space
 */
export function calculateTaxPosition(
  grossIncome: number,
  isMarried: boolean,
): TaxCalculation {
  const brackets = isMarried ? FEDERAL_TAX_BRACKETS_MFJ : FEDERAL_TAX_BRACKETS_SINGLE;
  const standardDeduction = isMarried ? STANDARD_DEDUCTION_MFJ : STANDARD_DEDUCTION_SINGLE;
  
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);
  
  let totalTax = 0;
  let currentBracket = brackets[0];
  let nextBracket: TaxBracket | null = null;
  
  // Calculate progressive tax
  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    
    if (taxableIncome <= bracket.min) break;
    
    const taxableInBracket = Math.min(
      taxableIncome - bracket.min,
      bracket.max - bracket.min
    );
    
    totalTax += taxableInBracket * bracket.rate;
    
    if (taxableIncome <= bracket.max) {
      currentBracket = bracket;
      nextBracket = brackets[i + 1] || null;
      break;
    }
    
    currentBracket = bracket;
  }
  
  const bracketSpace = currentBracket.max === Infinity 
    ? Infinity 
    : currentBracket.max - taxableIncome;
  
  const effectiveRate = taxableIncome > 0 ? totalTax / taxableIncome : 0;
  
  return {
    taxableIncome,
    currentBracket,
    marginalRate: currentBracket.rate,
    effectiveRate,
    totalTax,
    bracketSpace,
    nextBracket,
  };
}

// ============= TAX-BRACKET FILLING LOGIC =============

export interface TaxOptimizedWithdrawal {
  withdrawals: WithdrawalResult[];
  totalWithdrawn: number;
  taxableWithdrawn: number;
  taxBurden: number;
  marginalRate: number;
  bracketsUsed: string[];
  irmaaWarning: IRMAACliffWarning | null;
  remainingGap: number;
}

/**
 * Tax-Bracket Filling Withdrawal Strategy
 * 
 * 1. First, draw from taxable accounts (minimal tax impact - just capital gains)
 * 2. Fill low tax brackets (0%/10%/12%) with tax-deferred withdrawals
 * 3. Use Roth for remaining gap (tax-free)
 * 4. Check IRMAA cliffs before each deferred withdrawal
 */
export function processTaxOptimizedWithdrawals(
  spendingGap: number,
  accounts: WithdrawalAccount[],
  currentTaxableIncome: number, // From SS, pensions, RMDs already taken
  isMarried: boolean,
  maxBracketToFill: number = 0.12, // Default: fill up to 12% bracket
): TaxOptimizedWithdrawal {
  const withdrawals: WithdrawalResult[] = [];
  const balances = new Map<string, number>();
  accounts.forEach(a => balances.set(a.id, a.balance));
  
  const bracketsUsed: string[] = [];
  let remainingGap = spendingGap;
  let totalTaxable = currentTaxableIncome;
  let irmaaWarning: IRMAACliffWarning | null = null;
  
  // Separate accounts by type
  const taxableAccounts = accounts.filter(a => a.type === 'taxable' && !a.excludeFromWithdrawals);
  const deferredAccounts = accounts.filter(a => a.type === 'pretax' && !a.excludeFromWithdrawals);
  const rothAccounts = accounts.filter(a => a.type === 'roth' && !a.excludeFromWithdrawals);
  
  // Sort within each category by lowest return first
  taxableAccounts.sort((a, b) => a.expectedReturn - b.expectedReturn);
  deferredAccounts.sort((a, b) => a.expectedReturn - b.expectedReturn);
  rothAccounts.sort((a, b) => a.expectedReturn - b.expectedReturn);
  
  // STEP 1: Draw from taxable accounts first (only capital gains are taxed)
  for (const account of taxableAccounts) {
    if (remainingGap <= 0) break;
    
    const available = balances.get(account.id) || 0;
    const withdrawal = Math.min(remainingGap, available);
    
    if (withdrawal > 0) {
      balances.set(account.id, available - withdrawal);
      withdrawals.push({
        accountId: account.id,
        accountName: account.name,
        accountType: 'taxable',
        withdrawalAmount: withdrawal,
        remainingBalance: available - withdrawal,
        taxableAmount: withdrawal * 0.15, // Simplified LTCG
      });
      remainingGap -= withdrawal;
      totalTaxable += withdrawal * 0.15;
      if (!bracketsUsed.includes('LTCG 15%')) bracketsUsed.push('LTCG 15%');
    }
  }
  
  // STEP 2: Fill tax brackets with deferred account withdrawals
  const brackets = isMarried ? FEDERAL_TAX_BRACKETS_MFJ : FEDERAL_TAX_BRACKETS_SINGLE;
  const standardDeduction = isMarried ? STANDARD_DEDUCTION_MFJ : STANDARD_DEDUCTION_SINGLE;
  
  for (const account of deferredAccounts) {
    if (remainingGap <= 0) break;
    
    const available = balances.get(account.id) || 0;
    if (available <= 0) continue;
    
    // Calculate how much room in target bracket
    const currentTaxable = Math.max(0, totalTaxable - standardDeduction);
    let targetBracket = brackets.find(b => b.rate <= maxBracketToFill && currentTaxable < b.max);
    
    if (!targetBracket) {
      // Already past target bracket, still withdraw if needed
      targetBracket = brackets.find(b => currentTaxable < b.max) || brackets[brackets.length - 1];
    }
    
    const bracketRoom = Math.max(0, targetBracket.max + standardDeduction - totalTaxable);
    const maxWithdrawal = Math.min(remainingGap, available, bracketRoom);
    
    if (maxWithdrawal > 0) {
      // Check IRMAA cliff before withdrawal
      const warning = checkIRMAACliff(totalTaxable, maxWithdrawal, isMarried);
      if (warning && !irmaaWarning) {
        irmaaWarning = warning;
      }
      
      balances.set(account.id, available - maxWithdrawal);
      withdrawals.push({
        accountId: account.id,
        accountName: account.name,
        accountType: 'pretax',
        withdrawalAmount: maxWithdrawal,
        remainingBalance: available - maxWithdrawal,
        taxableAmount: maxWithdrawal,
      });
      remainingGap -= maxWithdrawal;
      totalTaxable += maxWithdrawal;
      if (!bracketsUsed.includes(targetBracket.label)) bracketsUsed.push(targetBracket.label);
    }
  }
  
  // STEP 3: Use Roth for remaining gap (tax-free)
  for (const account of rothAccounts) {
    if (remainingGap <= 0) break;
    
    const available = balances.get(account.id) || 0;
    const withdrawal = Math.min(remainingGap, available);
    
    if (withdrawal > 0) {
      balances.set(account.id, available - withdrawal);
      withdrawals.push({
        accountId: account.id,
        accountName: account.name,
        accountType: 'roth',
        withdrawalAmount: withdrawal,
        remainingBalance: available - withdrawal,
        taxableAmount: 0,
      });
      remainingGap -= withdrawal;
      if (!bracketsUsed.includes('Roth (Tax-Free)')) bracketsUsed.push('Roth (Tax-Free)');
    }
  }
  
  // Calculate final tax position
  const taxPosition = calculateTaxPosition(totalTaxable, isMarried);
  
  return {
    withdrawals,
    totalWithdrawn: withdrawals.reduce((sum, w) => sum + w.withdrawalAmount, 0),
    taxableWithdrawn: withdrawals.reduce((sum, w) => sum + w.taxableAmount, 0),
    taxBurden: taxPosition.totalTax,
    marginalRate: taxPosition.marginalRate,
    bracketsUsed,
    irmaaWarning,
    remainingGap,
  };
}

// ============= ANNUAL TAX SUMMARY =============

export interface AnnualTaxSummary {
  year: number;
  age: number;
  grossIncome: number;
  taxableIncome: number;
  federalTax: number;
  effectiveRate: number;
  marginalRate: number;
  irmaaStatus: {
    bracket: string;
    surcharge: number;
    cliffWarning: boolean;
  };
  withdrawalsByType: {
    taxable: number;
    pretax: number;
    roth: number;
  };
}

/**
 * Generate annual tax summary for visualization
 */
export function calculateAnnualTaxSummary(
  year: number,
  age: number,
  ssIncome: number,
  pensionIncome: number,
  rmdAmount: number,
  otherIncome: number,
  withdrawals: WithdrawalResult[],
  isMarried: boolean,
): AnnualTaxSummary {
  // Calculate gross income
  const ssTaxable = ssIncome * 0.85; // Up to 85% taxable
  const grossIncome = ssTaxable + pensionIncome + rmdAmount + otherIncome +
    withdrawals.reduce((sum, w) => sum + w.taxableAmount, 0);
  
  // Calculate tax position
  const taxPosition = calculateTaxPosition(grossIncome, isMarried);
  
  // Check IRMAA
  const irmaaCliff = checkIRMAACliff(grossIncome, 0, isMarried);
  
  // Sum withdrawals by type
  const withdrawalsByType = {
    taxable: withdrawals.filter(w => w.accountType === 'taxable').reduce((s, w) => s + w.withdrawalAmount, 0),
    pretax: withdrawals.filter(w => w.accountType === 'pretax').reduce((s, w) => s + w.withdrawalAmount, 0),
    roth: withdrawals.filter(w => w.accountType === 'roth').reduce((s, w) => s + w.withdrawalAmount, 0),
  };
  
  return {
    year,
    age,
    grossIncome,
    taxableIncome: taxPosition.taxableIncome,
    federalTax: taxPosition.totalTax,
    effectiveRate: taxPosition.effectiveRate,
    marginalRate: taxPosition.marginalRate,
    irmaaStatus: {
      bracket: irmaaCliff?.currentBracket || 'Standard',
      surcharge: irmaaCliff?.annualPremiumIncrease || 0,
      cliffWarning: irmaaCliff?.headroom !== undefined && irmaaCliff.headroom < 25000,
    },
    withdrawalsByType,
  };
}
