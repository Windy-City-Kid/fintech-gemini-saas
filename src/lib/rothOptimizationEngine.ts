/**
 * Advanced Roth Conversion Optimization Engine
 * 
 * Implements 4 optimization strategies with 1:1 Boldin parity:
 * 1. Highest Estate Value - Maximize net worth at age 100
 * 2. Lowest Lifetime Tax - Minimize total federal + state taxes
 * 3. Tax Bracket Limit - Fill to specific federal bracket ceiling
 * 4. IRMAA Bracket Limit - Stay under Medicare premium thresholds
 */

import { StateTaxRule } from '@/hooks/useStateTaxRules';
import { IRMAA_BRACKETS_2026, getNextIRMAAThreshold } from './medicareCalculator';
import { calculateTaxPosition, FEDERAL_TAX_BRACKETS_MFJ, FEDERAL_TAX_BRACKETS_SINGLE } from './taxBracketEngine';
import { RMD_DIVISORS } from './rmdCalculator';

// ============= TYPE DEFINITIONS =============

export type OptimizationStrategy = 
  | 'highest_estate'
  | 'lowest_lifetime_tax'
  | 'tax_bracket_limit'
  | 'irmaa_bracket_limit';

export interface AccountForConversion {
  id: string;
  name: string;
  type: 'traditional_401k' | 'traditional_ira' | 'rollover_ira';
  balance: number;
  expectedReturn: number;
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
  marginalRate: number;
  cumulativeConverted: number;
  remainingPreTax: number;
  projectedRothBalance: number;
  rmdWithConversion: number;
  rmdWithoutConversion: number;
  irmaaImpact: {
    lookbackYear: number;
    magiForIRMAA: number;
    bracketLabel: string;
    surcharge: number;
    crossedCliff: boolean;
  };
  taxAdjustedNetWorth: number;
}

export interface OptimizationResult {
  strategy: OptimizationStrategy;
  years: ConversionYear[];
  totalConverted: number;
  totalTaxPaid: number;
  averageEffectiveRate: number;
  lifetimeTaxWithConversions: number;
  lifetimeTaxBaseline: number;
  lifetimeTaxSavings: number;
  estateValueWithConversions: number;
  estateValueBaseline: number;
  estateValueIncrease: number;
  rmdReductionTotal: number;
  spendableWealthIncrease: number;
  heirsTaxReduction: number;
  heirsTaxReductionPercent: number;
  irmaaSurchargesIncurred: number;
  conversionSchedule: { year: number; amount: number }[];
  cumulativeTaxByYear: { year: number; baseline: number; optimized: number }[];
}

export interface OptimizationParams {
  currentAge: number;
  retirementAge: number;
  rmdStartAge: number;
  lifeExpectancy: number;
  accounts: AccountForConversion[];
  stateRule: StateTaxRule | undefined;
  brokerageBalance: number;
  annualIncome: number;
  socialSecurityIncome: number;
  filingStatus: 'single' | 'married_filing_jointly';
  targetBracket?: number;
  maxAnnualConversion?: number;
  strategy: OptimizationStrategy;
}

// ============= IRMAA LOOKBACK ENGINE =============

const IRMAA_LOOKBACK_YEARS = 2;

interface IRMAALookbackResult {
  lookbackYear: number;
  magiForIRMAA: number;
  bracket: typeof IRMAA_BRACKETS_2026[0];
  surcharge: number;
  crossedCliff: boolean;
}

function calculateIRMAAImpact(
  conversionYear: number,
  magiAtConversion: number,
  previousYearMAGI: Map<number, number>,
  isMarried: boolean
): IRMAALookbackResult {
  // IRMAA is based on MAGI from 2 years prior
  const lookbackYear = conversionYear - IRMAA_LOOKBACK_YEARS;
  const magiForIRMAA = previousYearMAGI.get(lookbackYear) || magiAtConversion;
  
  // Find IRMAA bracket
  let currentBracket = IRMAA_BRACKETS_2026[0];
  for (const bracket of IRMAA_BRACKETS_2026) {
    const threshold = isMarried ? bracket.jointMax : bracket.singleMax;
    if (magiForIRMAA <= threshold) {
      currentBracket = bracket;
      break;
    }
    currentBracket = bracket;
  }
  
  // Check if cliff was crossed
  const previousMAGI = previousYearMAGI.get(lookbackYear - 1) || 0;
  let previousBracket = IRMAA_BRACKETS_2026[0];
  for (const bracket of IRMAA_BRACKETS_2026) {
    const threshold = isMarried ? bracket.jointMax : bracket.singleMax;
    if (previousMAGI <= threshold) {
      previousBracket = bracket;
      break;
    }
    previousBracket = bracket;
  }
  
  return {
    lookbackYear,
    magiForIRMAA,
    bracket: currentBracket,
    surcharge: currentBracket.partBMonthly * 12 + (currentBracket.partDSurcharge || 0) * 12,
    crossedCliff: currentBracket.label !== previousBracket.label,
  };
}

function getIRMAASafeConversionLimit(
  baseMAGI: number,
  isMarried: boolean
): number {
  const nextThreshold = getNextIRMAAThreshold(baseMAGI, isMarried);
  if (!nextThreshold) return Infinity;
  
  // Stay $1,000 under the threshold
  return Math.max(0, nextThreshold.headroom - 1000);
}

// ============= TAX CALCULATION UTILITIES =============

function calculateFederalTax(
  taxableIncome: number,
  filingStatus: 'single' | 'married_filing_jointly'
): { tax: number; marginalRate: number } {
  const brackets = filingStatus === 'married_filing_jointly' 
    ? FEDERAL_TAX_BRACKETS_MFJ 
    : FEDERAL_TAX_BRACKETS_SINGLE;
  
  let tax = 0;
  let marginalRate = 0.10;
  
  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      tax += taxableInBracket * bracket.rate;
      marginalRate = bracket.rate;
    }
  }
  
  return { tax, marginalRate };
}

function calculateStateTax(
  taxableIncome: number,
  stateRule: StateTaxRule | undefined,
  socialSecurityIncome: number,
  age: number
): number {
  if (!stateRule || stateRule.rate_type === 'none') return 0;
  
  let adjustedIncome = taxableIncome;
  
  if (!stateRule.social_security_taxable) {
    adjustedIncome -= socialSecurityIncome * 0.85;
  }
  
  if (stateRule.retirement_exclusion_amount > 0 && age >= 60) {
    adjustedIncome -= Math.min(adjustedIncome, stateRule.retirement_exclusion_amount);
  }
  
  adjustedIncome = Math.max(0, adjustedIncome);
  
  const rate = stateRule.rate_type === 'graduated' 
    ? (stateRule.top_marginal_rate || 5) / 100
    : stateRule.base_rate / 100;
  
  return adjustedIncome * rate;
}

function calculateRMD(age: number, balance: number): number {
  if (age < 73) return 0;
  const factor = RMD_DIVISORS[age] || RMD_DIVISORS[100] || 6.4;
  return balance / factor;
}

// ============= OPTIMIZATION STRATEGIES =============

function findBracketCeilingConversion(
  baseIncome: number,
  targetBracketRate: number,
  filingStatus: 'single' | 'married_filing_jointly',
  maxConversion: number
): number {
  const brackets = filingStatus === 'married_filing_jointly' 
    ? FEDERAL_TAX_BRACKETS_MFJ 
    : FEDERAL_TAX_BRACKETS_SINGLE;
  
  const standardDeduction = filingStatus === 'married_filing_jointly' ? 30450 : 15225;
  const taxableBase = Math.max(0, baseIncome - standardDeduction);
  
  // Find target bracket
  const targetBracket = brackets.find(b => b.rate >= targetBracketRate);
  if (!targetBracket) return maxConversion;
  
  // Calculate room to ceiling
  const roomToCeiling = Math.max(0, targetBracket.max - taxableBase);
  
  return Math.min(roomToCeiling, maxConversion);
}

function runIterativeOptimization(
  params: OptimizationParams,
  getAnnualConversion: (year: number, age: number, baseIncome: number, preTaxBalance: number, magiHistory: Map<number, number>) => number
): OptimizationResult {
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
    strategy,
    maxAnnualConversion = 200000,
  } = params;
  
  const isMarried = filingStatus === 'married_filing_jointly';
  const standardDeduction = isMarried ? 30450 : 15225;
  
  // Initialize account balances
  const accountBalances = new Map<string, number>();
  accounts.forEach(acc => accountBalances.set(acc.id, acc.balance));
  
  let rothBalance = 0;
  let cumulativeConverted = 0;
  let totalTaxPaid = 0;
  let availableBrokerage = brokerageBalance;
  let irmaaSurchargesIncurred = 0;
  
  const years: ConversionYear[] = [];
  const magiHistory = new Map<number, number>();
  const cumulativeTaxByYear: { year: number; baseline: number; optimized: number }[] = [];
  
  // Track baseline for comparison
  const baselineBalances = new Map<string, number>();
  accounts.forEach(acc => baselineBalances.set(acc.id, acc.balance));
  
  // Conversion window
  const conversionStartAge = Math.max(currentAge, retirementAge - 5);
  const conversionEndAge = rmdStartAge - 1;
  
  let cumulativeOptimizedTax = 0;
  let cumulativeBaselineTax = 0;
  
  for (let age = conversionStartAge; age <= Math.min(conversionEndAge, lifeExpectancy); age++) {
    const year = new Date().getFullYear() + (age - currentAge);
    
    const isRetired = age >= retirementAge;
    const baseIncome = isRetired ? socialSecurityIncome : annualIncome;
    
    const totalPreTaxBalance = Array.from(accountBalances.values()).reduce((a, b) => a + b, 0);
    
    if (totalPreTaxBalance <= 0) break;
    
    // Get conversion amount based on strategy
    let optimalConversion = getAnnualConversion(
      year,
      age,
      baseIncome,
      totalPreTaxBalance,
      magiHistory
    );
    
    // Cap to available and affordable
    optimalConversion = Math.min(optimalConversion, totalPreTaxBalance, maxAnnualConversion);
    
    // Ensure we can pay taxes from brokerage
    const estimatedTaxRate = 0.25;
    const maxAffordable = availableBrokerage / estimatedTaxRate;
    optimalConversion = Math.min(optimalConversion, maxAffordable * 0.85);
    
    if (optimalConversion < 5000) continue;
    
    // Allocate across accounts (highest return first)
    const sortedAccounts = [...accounts].sort((a, b) => b.expectedReturn - a.expectedReturn);
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
    
    // Calculate taxes
    const totalTaxableIncome = baseIncome + actualConversion;
    const { tax: federalTax, marginalRate } = calculateFederalTax(
      Math.max(0, totalTaxableIncome - standardDeduction),
      filingStatus
    );
    const baseFederalTax = calculateFederalTax(
      Math.max(0, baseIncome - standardDeduction),
      filingStatus
    ).tax;
    const conversionFederalTax = federalTax - baseFederalTax;
    
    const stateTax = calculateStateTax(totalTaxableIncome, stateRule, socialSecurityIncome, age);
    const baseStateTax = calculateStateTax(baseIncome, stateRule, socialSecurityIncome, age);
    const conversionStateTax = stateTax - baseStateTax;
    
    const totalTaxBill = conversionFederalTax + conversionStateTax;
    
    // Record MAGI for IRMAA lookback
    magiHistory.set(year, totalTaxableIncome);
    
    // Calculate IRMAA impact
    const irmaaImpact = calculateIRMAAImpact(year, totalTaxableIncome, magiHistory, isMarried);
    if (irmaaImpact.crossedCliff && age >= 65) {
      irmaaSurchargesIncurred += irmaaImpact.surcharge;
    }
    
    // Pay taxes from brokerage
    availableBrokerage -= totalTaxBill;
    
    // Update balances
    rothBalance = (rothBalance * (1 + 0.07)) + actualConversion;
    cumulativeConverted += actualConversion;
    totalTaxPaid += totalTaxBill;
    
    // Grow remaining pre-tax accounts
    for (const acc of accounts) {
      const balance = accountBalances.get(acc.id) || 0;
      accountBalances.set(acc.id, balance * (1 + acc.expectedReturn));
    }
    
    // Grow baseline accounts
    for (const acc of accounts) {
      const balance = baselineBalances.get(acc.id) || 0;
      baselineBalances.set(acc.id, balance * (1 + acc.expectedReturn));
    }
    
    // Calculate RMDs
    const remainingPreTax = Array.from(accountBalances.values()).reduce((a, b) => a + b, 0);
    const rmdWithConversion = calculateRMD(age, remainingPreTax);
    
    const baselinePreTax = Array.from(baselineBalances.values()).reduce((a, b) => a + b, 0);
    const rmdWithoutConversion = calculateRMD(age, baselinePreTax);
    
    // Calculate tax-adjusted net worth
    const futureTaxRate = 0.22;
    const taxAdjustedNetWorth = 
      rothBalance + 
      availableBrokerage + 
      remainingPreTax * (1 - futureTaxRate);
    
    // Track cumulative taxes
    cumulativeOptimizedTax += totalTaxBill;
    cumulativeBaselineTax += baseFederalTax + baseStateTax;
    
    cumulativeTaxByYear.push({
      year,
      baseline: cumulativeBaselineTax,
      optimized: cumulativeOptimizedTax,
    });
    
    years.push({
      year,
      age,
      conversionAmount: actualConversion,
      fromAccounts,
      taxBill: totalTaxBill,
      federalTax: conversionFederalTax,
      stateTax: conversionStateTax,
      effectiveRate: actualConversion > 0 ? totalTaxBill / actualConversion : 0,
      marginalRate,
      cumulativeConverted,
      remainingPreTax,
      projectedRothBalance: rothBalance,
      rmdWithConversion,
      rmdWithoutConversion,
      irmaaImpact: {
        lookbackYear: irmaaImpact.lookbackYear,
        magiForIRMAA: irmaaImpact.magiForIRMAA,
        bracketLabel: irmaaImpact.bracket.label,
        surcharge: irmaaImpact.surcharge,
        crossedCliff: irmaaImpact.crossedCliff,
      },
      taxAdjustedNetWorth,
    });
  }
  
  // Project lifetime totals
  const finalRemainingPreTax = Array.from(accountBalances.values()).reduce((a, b) => a + b, 0);
  const baselinePreTax = Array.from(baselineBalances.values()).reduce((a, b) => a + b, 0);
  
  // Project RMD taxes through life expectancy
  let lifetimeRMDTaxWithConversions = totalTaxPaid;
  let lifetimeRMDTaxBaseline = 0;
  let preTaxWithConv = finalRemainingPreTax;
  let preTaxNoConv = baselinePreTax;
  
  for (let age = rmdStartAge; age <= lifeExpectancy; age++) {
    const rmdWithConv = calculateRMD(age, preTaxWithConv);
    const rmdNoConv = calculateRMD(age, preTaxNoConv);
    
    const taxWithConv = calculateFederalTax(
      Math.max(0, rmdWithConv + socialSecurityIncome - standardDeduction),
      filingStatus
    ).tax;
    const taxNoConv = calculateFederalTax(
      Math.max(0, rmdNoConv + socialSecurityIncome - standardDeduction),
      filingStatus
    ).tax;
    
    lifetimeRMDTaxWithConversions += taxWithConv;
    lifetimeRMDTaxBaseline += taxNoConv;
    
    preTaxWithConv = (preTaxWithConv - rmdWithConv) * 1.05;
    preTaxNoConv = (preTaxNoConv - rmdNoConv) * 1.05;
  }
  
  // Estate value at 100
  const yearsToProject = 100 - (currentAge + years.length);
  const estateValueWithConversions = 
    rothBalance * Math.pow(1.07, yearsToProject) + 
    finalRemainingPreTax * Math.pow(1.05, yearsToProject);
  const estateValueBaseline = baselinePreTax * Math.pow(1.05, yearsToProject);
  
  // Heirs tax calculation
  const heirsTaxOnOptimized = finalRemainingPreTax * 0.25;
  const heirsTaxOnBaseline = baselinePreTax * 0.25;
  const heirsTaxReduction = heirsTaxOnBaseline - heirsTaxOnOptimized;
  
  const rmdReductionTotal = years.reduce(
    (sum, y) => sum + (y.rmdWithoutConversion - y.rmdWithConversion),
    0
  );
  
  return {
    strategy,
    years,
    totalConverted: cumulativeConverted,
    totalTaxPaid,
    averageEffectiveRate: cumulativeConverted > 0 ? totalTaxPaid / cumulativeConverted : 0,
    lifetimeTaxWithConversions: lifetimeRMDTaxWithConversions,
    lifetimeTaxBaseline: lifetimeRMDTaxBaseline,
    lifetimeTaxSavings: lifetimeRMDTaxBaseline - lifetimeRMDTaxWithConversions,
    estateValueWithConversions,
    estateValueBaseline,
    estateValueIncrease: estateValueWithConversions - estateValueBaseline,
    rmdReductionTotal,
    spendableWealthIncrease: rothBalance + (lifetimeRMDTaxBaseline - lifetimeRMDTaxWithConversions),
    heirsTaxReduction,
    heirsTaxReductionPercent: heirsTaxOnBaseline > 0 
      ? (heirsTaxReduction / heirsTaxOnBaseline) * 100 
      : 0,
    irmaaSurchargesIncurred,
    conversionSchedule: years.map(y => ({ year: y.year, amount: y.conversionAmount })),
    cumulativeTaxByYear,
  };
}

// ============= MAIN OPTIMIZATION FUNCTION =============

export function optimizeRothConversionsAdvanced(params: OptimizationParams): OptimizationResult {
  const { strategy, filingStatus, targetBracket = 0.22 } = params;
  const isMarried = filingStatus === 'married_filing_jointly';
  
  switch (strategy) {
    case 'highest_estate': {
      // Aggressive conversion to maximize tax-free Roth growth
      return runIterativeOptimization(params, (year, age, baseIncome, preTaxBalance, magiHistory) => {
        // Convert up to 32% bracket for maximum Roth accumulation
        return findBracketCeilingConversion(baseIncome, 0.32, filingStatus, preTaxBalance);
      });
    }
    
    case 'lowest_lifetime_tax': {
      // Conservative conversion filling only low brackets
      return runIterativeOptimization(params, (year, age, baseIncome, preTaxBalance, magiHistory) => {
        // Fill only 10%/12% brackets
        return findBracketCeilingConversion(baseIncome, 0.12, filingStatus, preTaxBalance);
      });
    }
    
    case 'tax_bracket_limit': {
      // Fill to user-specified bracket
      return runIterativeOptimization(params, (year, age, baseIncome, preTaxBalance, magiHistory) => {
        return findBracketCeilingConversion(baseIncome, targetBracket, filingStatus, preTaxBalance);
      });
    }
    
    case 'irmaa_bracket_limit': {
      // Stay under next IRMAA threshold
      return runIterativeOptimization(params, (year, age, baseIncome, preTaxBalance, magiHistory) => {
        const irmaaLimit = getIRMAASafeConversionLimit(baseIncome, isMarried);
        const bracketLimit = findBracketCeilingConversion(baseIncome, 0.24, filingStatus, preTaxBalance);
        return Math.min(irmaaLimit, bracketLimit);
      });
    }
    
    default:
      return runIterativeOptimization(params, () => 0);
  }
}

// ============= COMPARISON ACROSS ALL STRATEGIES =============

export interface StrategyComparison {
  strategy: OptimizationStrategy;
  label: string;
  description: string;
  lifetimeTaxSavings: number;
  estateValueIncrease: number;
  irmaaSurcharges: number;
  totalConverted: number;
  recommended: boolean;
}

export function compareAllStrategies(params: Omit<OptimizationParams, 'strategy'>): StrategyComparison[] {
  const strategies: { strategy: OptimizationStrategy; label: string; description: string }[] = [
    { 
      strategy: 'highest_estate', 
      label: 'Maximize Estate', 
      description: 'Aggressive conversions to maximize net worth at age 100' 
    },
    { 
      strategy: 'lowest_lifetime_tax', 
      label: 'Minimize Lifetime Tax', 
      description: 'Conservative conversions filling only 10-12% brackets' 
    },
    { 
      strategy: 'tax_bracket_limit', 
      label: 'Fill Tax Bracket', 
      description: `Convert up to the ${((params.targetBracket || 0.22) * 100).toFixed(0)}% bracket ceiling` 
    },
    { 
      strategy: 'irmaa_bracket_limit', 
      label: 'Avoid IRMAA', 
      description: 'Stay under Medicare premium surcharge thresholds' 
    },
  ];
  
  const results = strategies.map(s => {
    const result = optimizeRothConversionsAdvanced({ ...params, strategy: s.strategy });
    return {
      strategy: s.strategy,
      label: s.label,
      description: s.description,
      lifetimeTaxSavings: result.lifetimeTaxSavings,
      estateValueIncrease: result.estateValueIncrease,
      irmaaSurcharges: result.irmaaSurchargesIncurred,
      totalConverted: result.totalConverted,
      recommended: false,
    };
  });
  
  // Determine recommendation based on user profile
  // For most users, highest lifetime tax savings wins
  const bestBySavings = results.reduce((best, curr) => 
    curr.lifetimeTaxSavings > best.lifetimeTaxSavings ? curr : best
  );
  bestBySavings.recommended = true;
  
  return results;
}

// ============= APPLY TO PLAN =============

export interface MoneyFlowTransfer {
  contribution_name: string;
  account_type: string;
  annual_amount: number;
  start_age: number;
  end_age: number;
  is_income_linked: boolean;
  priority: 'mandatory';
}

export function generateMoneyFlowTransfers(
  result: OptimizationResult,
  currentAge: number
): MoneyFlowTransfer[] {
  return result.conversionSchedule.map((conv, index) => ({
    contribution_name: `Roth Conversion ${conv.year}`,
    account_type: 'Roth Conversion',
    annual_amount: conv.amount,
    start_age: currentAge + index,
    end_age: currentAge + index,
    is_income_linked: false,
    priority: 'mandatory' as const,
  }));
}
