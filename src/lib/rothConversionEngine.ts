/**
 * Roth Conversion Strategy Optimization Engine
 * 
 * Evaluates converting pre-tax IRA/401(k) funds to Roth annually,
 * prioritizing accounts with the highest rate of return for maximum tax-free growth.
 */

import { StateTaxRule } from '@/hooks/useStateTaxRules';

export interface AccountForConversion {
  id: string;
  name: string;
  type: 'traditional_401k' | 'traditional_ira' | 'rollover_ira';
  balance: number;
  expectedReturn: number; // Annual expected return rate (e.g., 0.07 for 7%)
}

export interface ConversionYear {
  year: number;
  age: number;
  conversionAmount: number;
  fromAccounts: { accountId: string; amount: number }[];
  taxBill: number;
  federalTax: number;
  stateTax: number;
  effectiveRate: number;
  cumulativeConverted: number;
  remainingPreTax: number;
  projectedRothBalance: number;
  rmdWithConversion: number;
  rmdWithoutConversion: number;
}

export interface ConversionStrategy {
  years: ConversionYear[];
  totalConverted: number;
  totalTaxPaid: number;
  averageEffectiveRate: number;
  lifetimeTaxWithConversions: number;
  lifetimeTaxBaseline: number;
  lifetimeTaxSavings: number;
  rmdReduction: number;
  spendableWealthIncrease: number;
  heirsTaxReduction: number;
  heirsTaxReductionPercent: number;
}

export interface ConversionParams {
  currentAge: number;
  retirementAge: number;
  rmdStartAge: number; // Typically 73 per SECURE 2.0
  lifeExpectancy: number;
  accounts: AccountForConversion[];
  stateRule: StateTaxRule | undefined;
  brokerageBalance: number; // After-tax funds to pay conversion taxes
  annualIncome: number; // Other income for tax bracket calculation
  socialSecurityIncome: number;
  filingStatus: 'single' | 'married_filing_jointly';
  targetBracket?: number; // Optional: max marginal bracket to fill (e.g., 0.22)
  maxAnnualConversion?: number; // Optional cap per year
}

// 2026 Federal Tax Brackets (MFJ)
const FEDERAL_BRACKETS_MFJ_2026 = [
  { min: 0, max: 24800, rate: 0.10 },
  { min: 24800, max: 101200, rate: 0.12 },
  { min: 101200, max: 192500, rate: 0.22 },
  { min: 192500, max: 383900, rate: 0.24 },
  { min: 383900, max: 487450, rate: 0.32 },
  { min: 487450, max: 731200, rate: 0.35 },
  { min: 731200, max: Infinity, rate: 0.37 },
];

// 2026 Federal Tax Brackets (Single)
const FEDERAL_BRACKETS_SINGLE_2026 = [
  { min: 0, max: 12400, rate: 0.10 },
  { min: 12400, max: 50600, rate: 0.12 },
  { min: 50600, max: 96250, rate: 0.22 },
  { min: 96250, max: 191950, rate: 0.24 },
  { min: 191950, max: 243725, rate: 0.32 },
  { min: 243725, max: 609350, rate: 0.35 },
  { min: 609350, max: Infinity, rate: 0.37 },
];

// RMD Life Expectancy Table (Uniform Lifetime Table - IRS Table III)
const RMD_FACTORS: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7,
  84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
  90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
};

/**
 * Calculate federal income tax using progressive brackets
 */
function calculateFederalTax(
  taxableIncome: number,
  filingStatus: 'single' | 'married_filing_jointly'
): { tax: number; marginalRate: number; effectiveRate: number } {
  const brackets = filingStatus === 'married_filing_jointly' 
    ? FEDERAL_BRACKETS_MFJ_2026 
    : FEDERAL_BRACKETS_SINGLE_2026;
  
  let tax = 0;
  let marginalRate = 0;
  
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
      marginalRate = bracket.rate;
    }
  }
  
  const effectiveRate = taxableIncome > 0 ? tax / taxableIncome : 0;
  
  return { tax, marginalRate, effectiveRate };
}

/**
 * Calculate state income tax
 */
function calculateStateTax(
  taxableIncome: number,
  stateRule: StateTaxRule | undefined,
  socialSecurityIncome: number,
  age: number
): number {
  if (!stateRule || stateRule.rate_type === 'none') return 0;
  
  let adjustedIncome = taxableIncome;
  
  // Exclude Social Security if state doesn't tax it
  if (!stateRule.social_security_taxable) {
    adjustedIncome -= socialSecurityIncome;
  }
  
  // Apply retirement exclusion for seniors
  if (stateRule.retirement_exclusion_amount > 0 && age >= 60) {
    adjustedIncome -= Math.min(adjustedIncome, stateRule.retirement_exclusion_amount);
  }
  
  adjustedIncome = Math.max(0, adjustedIncome);
  
  // Use top marginal rate for simplicity (could be enhanced for graduated)
  const rate = stateRule.rate_type === 'graduated' 
    ? stateRule.top_marginal_rate / 100
    : stateRule.base_rate / 100;
  
  return adjustedIncome * rate;
}

/**
 * Calculate RMD for a given age and balance
 */
function calculateRMD(age: number, balance: number): number {
  if (age < 73) return 0; // SECURE 2.0 RMD start age
  
  const factor = RMD_FACTORS[age] || RMD_FACTORS[100];
  return balance / factor;
}

/**
 * Find optimal annual conversion amount to fill tax bracket
 */
function findOptimalConversion(
  baseIncome: number,
  targetBracket: number,
  filingStatus: 'single' | 'married_filing_jointly',
  maxConversion: number
): number {
  const brackets = filingStatus === 'married_filing_jointly' 
    ? FEDERAL_BRACKETS_MFJ_2026 
    : FEDERAL_BRACKETS_SINGLE_2026;
  
  // Find the bracket ceiling for target rate
  const targetBracketInfo = brackets.find(b => b.rate >= targetBracket);
  if (!targetBracketInfo) return maxConversion;
  
  // Room to fill up to bracket ceiling
  const roomInBracket = Math.max(0, targetBracketInfo.max - baseIncome);
  
  return Math.min(roomInBracket, maxConversion);
}

/**
 * Main optimization engine
 */
export function optimizeRothConversions(params: ConversionParams): ConversionStrategy {
  const {
    currentAge,
    retirementAge,
    rmdStartAge,
    lifeExpectancy,
    accounts,
    stateRule,
    brokerageBalance,
    annualIncome,
    socialSecurityIncome,
    filingStatus,
    targetBracket = 0.22, // Default: fill up to 22% bracket
    maxAnnualConversion = 200000,
  } = params;
  
  // Sort accounts by expected return (highest first for tax-free growth priority)
  const sortedAccounts = [...accounts].sort((a, b) => b.expectedReturn - a.expectedReturn);
  
  // Track account balances over time
  const accountBalances = new Map<string, number>();
  sortedAccounts.forEach(acc => accountBalances.set(acc.id, acc.balance));
  
  let rothBalance = 0;
  let cumulativeConverted = 0;
  let totalTaxPaid = 0;
  let availableBrokerage = brokerageBalance;
  
  const years: ConversionYear[] = [];
  
  // Conversion window: from current age to RMD start (or slightly before)
  const conversionStartAge = Math.max(currentAge, retirementAge);
  const conversionEndAge = rmdStartAge - 1; // Stop before RMD kicks in
  
  for (let age = conversionStartAge; age <= conversionEndAge; age++) {
    const year = new Date().getFullYear() + (age - currentAge);
    
    // Calculate base income for the year
    const isRetired = age >= retirementAge;
    const baseIncome = isRetired ? socialSecurityIncome : annualIncome;
    
    // Calculate optimal conversion for this year
    const totalPreTaxBalance = Array.from(accountBalances.values()).reduce((a, b) => a + b, 0);
    
    if (totalPreTaxBalance <= 0) break; // Nothing left to convert
    
    // Find how much room we have in the target bracket
    let optimalConversion = findOptimalConversion(
      baseIncome,
      targetBracket,
      filingStatus,
      Math.min(maxAnnualConversion, totalPreTaxBalance)
    );
    
    // Ensure we have brokerage funds to pay taxes
    const estimatedTaxRate = targetBracket;
    const maxAffordable = availableBrokerage / estimatedTaxRate;
    optimalConversion = Math.min(optimalConversion, maxAffordable * 0.9); // 90% buffer
    
    if (optimalConversion < 1000) break; // Not worth converting small amounts
    
    // Allocate conversion across accounts (highest return first)
    const fromAccounts: { accountId: string; amount: number }[] = [];
    let remainingConversion = optimalConversion;
    
    for (const acc of sortedAccounts) {
      const balance = accountBalances.get(acc.id) || 0;
      if (balance <= 0 || remainingConversion <= 0) continue;
      
      const convertFromThis = Math.min(balance, remainingConversion);
      fromAccounts.push({ accountId: acc.id, amount: convertFromThis });
      accountBalances.set(acc.id, balance - convertFromThis);
      remainingConversion -= convertFromThis;
    }
    
    const actualConversion = optimalConversion - remainingConversion;
    
    // Calculate taxes on conversion
    const totalTaxableIncome = baseIncome + actualConversion;
    const { tax: federalTax, effectiveRate } = calculateFederalTax(totalTaxableIncome, filingStatus);
    const conversionFederalTax = federalTax - calculateFederalTax(baseIncome, filingStatus).tax;
    
    const stateTax = calculateStateTax(totalTaxableIncome, stateRule, socialSecurityIncome, age);
    const conversionStateTax = stateTax - calculateStateTax(baseIncome, stateRule, socialSecurityIncome, age);
    
    const totalTaxBill = conversionFederalTax + conversionStateTax;
    
    // Pay taxes from brokerage
    availableBrokerage -= totalTaxBill;
    
    // Update Roth balance with conversion and growth
    rothBalance = (rothBalance * (1 + 0.07)) + actualConversion; // Assume 7% growth
    cumulativeConverted += actualConversion;
    totalTaxPaid += totalTaxBill;
    
    // Grow remaining pre-tax accounts
    for (const acc of sortedAccounts) {
      const balance = accountBalances.get(acc.id) || 0;
      accountBalances.set(acc.id, balance * (1 + acc.expectedReturn));
    }
    
    // Calculate RMDs
    const remainingPreTax = Array.from(accountBalances.values()).reduce((a, b) => a + b, 0);
    const rmdWithConversion = calculateRMD(age, remainingPreTax);
    
    // What would RMD be without any conversions?
    const noConversionBalance = accounts.reduce((sum, acc) => {
      const yearsGrown = age - currentAge;
      return sum + acc.balance * Math.pow(1 + acc.expectedReturn, yearsGrown);
    }, 0);
    const rmdWithoutConversion = calculateRMD(age, noConversionBalance);
    
    years.push({
      year,
      age,
      conversionAmount: actualConversion,
      fromAccounts,
      taxBill: totalTaxBill,
      federalTax: conversionFederalTax,
      stateTax: conversionStateTax,
      effectiveRate: actualConversion > 0 ? totalTaxBill / actualConversion : 0,
      cumulativeConverted,
      remainingPreTax,
      projectedRothBalance: rothBalance,
      rmdWithConversion,
      rmdWithoutConversion,
    });
  }
  
  // Calculate lifetime comparisons
  const finalRemainingPreTax = Array.from(accountBalances.values()).reduce((a, b) => a + b, 0);
  
  // Project lifetime RMDs and taxes
  let lifetimeRMDTaxWithConversions = 0;
  let lifetimeRMDTaxBaseline = 0;
  let preTaxWithConversions = finalRemainingPreTax;
  let preTaxBaseline = accounts.reduce((sum, acc) => {
    const yearsGrown = lifeExpectancy - currentAge;
    return sum + acc.balance * Math.pow(1 + acc.expectedReturn, yearsGrown / 2); // Midpoint estimate
  }, 0);
  
  for (let age = rmdStartAge; age <= lifeExpectancy; age++) {
    const rmdWithConv = calculateRMD(age, preTaxWithConversions);
    const rmdBaseline = calculateRMD(age, preTaxBaseline);
    
    const taxWithConv = calculateFederalTax(rmdWithConv + socialSecurityIncome, filingStatus).tax;
    const taxBaseline = calculateFederalTax(rmdBaseline + socialSecurityIncome, filingStatus).tax;
    
    lifetimeRMDTaxWithConversions += taxWithConv;
    lifetimeRMDTaxBaseline += taxBaseline;
    
    preTaxWithConversions = (preTaxWithConversions - rmdWithConv) * 1.05;
    preTaxBaseline = (preTaxBaseline - rmdBaseline) * 1.05;
  }
  
  const lifetimeTaxWithConversions = totalTaxPaid + lifetimeRMDTaxWithConversions;
  const lifetimeTaxBaseline = lifetimeRMDTaxBaseline;
  const lifetimeTaxSavings = lifetimeTaxBaseline - lifetimeTaxWithConversions;
  
  // Calculate heirs' benefit
  const heirsTaxOnRoth = 0; // Roth is tax-free
  const heirsTaxOnPreTax = finalRemainingPreTax * 0.25; // Assume 25% avg heir tax rate
  const baselineHeirsTax = preTaxBaseline * 0.25;
  const heirsTaxReduction = baselineHeirsTax - heirsTaxOnPreTax;
  const heirsTaxReductionPercent = baselineHeirsTax > 0 
    ? (heirsTaxReduction / baselineHeirsTax) * 100 
    : 0;
  
  // Spendable wealth increase
  const rothBalanceFinal = years.length > 0 ? years[years.length - 1].projectedRothBalance : 0;
  const spendableWealthIncrease = rothBalanceFinal + lifetimeTaxSavings;
  
  // RMD reduction
  const rmdReduction = years.length > 0
    ? years.reduce((sum, y) => sum + (y.rmdWithoutConversion - y.rmdWithConversion), 0) / years.length
    : 0;
  
  return {
    years,
    totalConverted: cumulativeConverted,
    totalTaxPaid,
    averageEffectiveRate: cumulativeConverted > 0 ? totalTaxPaid / cumulativeConverted : 0,
    lifetimeTaxWithConversions,
    lifetimeTaxBaseline,
    lifetimeTaxSavings,
    rmdReduction,
    spendableWealthIncrease,
    heirsTaxReduction,
    heirsTaxReductionPercent,
  };
}

/**
 * Helper to get 5-year rule info
 */
export function getFiveYearRuleInfo(conversionYear: number, currentYear: number): {
  isAccessible: boolean;
  yearsRemaining: number;
  accessibleYear: number;
} {
  const accessibleYear = conversionYear + 5;
  const yearsRemaining = Math.max(0, accessibleYear - currentYear);
  
  return {
    isAccessible: currentYear >= accessibleYear,
    yearsRemaining,
    accessibleYear,
  };
}
