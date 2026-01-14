/**
 * Three-Bucket Retirement Strategy Engine
 * 
 * Implements the bucket approach to retirement income:
 * - Bucket 1 (Cash): 1-3 years of expenses in liquid assets
 * - Bucket 2 (Bonds): 4-10 years in fixed income
 * - Bucket 3 (Growth): 11+ years in equities
 * 
 * Refill Logic (Waterfall):
 * A: If Bucket 3 is UP for the year, sell gains to refill Bucket 1
 * B: If Bucket 3 is DOWN but Bucket 2 is UP, sell bonds to refill Bucket 1
 * C: If BOTH are down, suspend refills and draw from Cash only
 */

import { AssetAllocation } from './assetClassification';

export type BucketType = 'cash' | 'bonds' | 'growth';
export type RefillCondition = 'A' | 'B' | 'C';

export interface BucketConfig {
  id: BucketType;
  name: string;
  description: string;
  minYears: number;
  maxYears: number;
  assetTypes: string[];
  color: string;
}

export const BUCKET_CONFIGS: BucketConfig[] = [
  {
    id: 'cash',
    name: 'Cash Bucket',
    description: 'Immediate needs (1-3 years)',
    minYears: 1,
    maxYears: 3,
    assetTypes: ['Money Market', 'High-Yield Savings', 'CDs', 'Short-term Treasuries'],
    color: 'hsl(var(--success))',
  },
  {
    id: 'bonds',
    name: 'Bonds Bucket',
    description: 'Medium-term (4-10 years)',
    minYears: 4,
    maxYears: 10,
    assetTypes: ['Corporate Bonds', 'Municipal Bonds', 'Bond ETFs', 'Dividend Stocks'],
    color: 'hsl(var(--primary))',
  },
  {
    id: 'growth',
    name: 'Growth Bucket',
    description: 'Long-term (11+ years)',
    minYears: 11,
    maxYears: 30,
    assetTypes: ['US Stocks', 'International Stocks', 'Growth ETFs', 'REITs'],
    color: 'hsl(var(--secondary))',
  },
];

export interface BucketState {
  bucket: BucketType;
  currentValue: number;
  targetValue: number;
  targetYears: number;
  percentFull: number;
  ytdReturn: number;
  isUnderfunded: boolean;
}

export interface RefillAction {
  condition: RefillCondition;
  sourceBucket: BucketType | null;
  amount: number;
  reason: string;
  canExecute: boolean;
}

export interface BucketAnalysis {
  buckets: BucketState[];
  totalPortfolioValue: number;
  annualExpenses: number;
  totalYearsCovered: number;
  refillRecommendation: RefillAction;
  sequenceRiskProtected: boolean;
}

/**
 * Map portfolio allocation to bucket values
 */
export function mapAllocationToBuckets(
  allocation: AssetAllocation,
  totalPortfolioValue: number,
): { cash: number; bonds: number; growth: number } {
  const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);
  if (total === 0) return { cash: 0, bonds: 0, growth: 0 };

  // Cash bucket includes cash holdings
  const cashValue = allocation.cash;
  
  // Bonds bucket includes bonds
  const bondsValue = allocation.bonds;
  
  // Growth bucket includes stocks and real estate
  const growthValue = allocation.domesticStocks + allocation.intlStocks + allocation.realEstate;
  
  return {
    cash: cashValue,
    bonds: bondsValue,
    growth: growthValue,
  };
}

/**
 * Calculate bucket status based on current values and target years
 */
export function calculateBucketStatus(
  currentValues: { cash: number; bonds: number; growth: number },
  targetYears: { cash: number; bonds: number; growth: number },
  ytdReturns: { cash: number; bonds: number; growth: number },
  annualExpenses: number,
): BucketState[] {
  return BUCKET_CONFIGS.map(config => {
    const currentValue = currentValues[config.id];
    const years = targetYears[config.id];
    const targetValue = annualExpenses * years;
    const percentFull = targetValue > 0 ? (currentValue / targetValue) * 100 : 100;
    const ytdReturn = ytdReturns[config.id];
    
    return {
      bucket: config.id,
      currentValue,
      targetValue,
      targetYears: years,
      percentFull: Math.min(percentFull, 150), // Cap at 150% for display
      ytdReturn,
      isUnderfunded: percentFull < 80, // Less than 80% is underfunded
    };
  });
}

/**
 * Determine the refill action based on market conditions (The Waterfall)
 */
export function determineRefillAction(
  buckets: BucketState[],
  annualExpenses: number,
): RefillAction {
  const cashBucket = buckets.find(b => b.bucket === 'cash')!;
  const bondsBucket = buckets.find(b => b.bucket === 'bonds')!;
  const growthBucket = buckets.find(b => b.bucket === 'growth')!;
  
  // Calculate how much we need to refill Bucket 1
  const refillNeeded = Math.max(0, cashBucket.targetValue - cashBucket.currentValue);
  
  // If cash bucket is full, no refill needed
  if (refillNeeded <= 0) {
    return {
      condition: 'A',
      sourceBucket: null,
      amount: 0,
      reason: 'Cash bucket is fully funded. No refill needed.',
      canExecute: false,
    };
  }
  
  // Condition A: Bucket 3 (Growth) is UP for the year
  if (growthBucket.ytdReturn > 0) {
    const availableGains = growthBucket.currentValue * (growthBucket.ytdReturn / 100);
    const refillAmount = Math.min(refillNeeded, availableGains, growthBucket.currentValue * 0.1); // Max 10% of growth bucket
    
    return {
      condition: 'A',
      sourceBucket: 'growth',
      amount: refillAmount,
      reason: `Growth bucket is up ${growthBucket.ytdReturn.toFixed(1)}% YTD. Sell gains to refill cash.`,
      canExecute: refillAmount > 0,
    };
  }
  
  // Condition B: Growth is DOWN but Bonds is UP
  if (growthBucket.ytdReturn <= 0 && bondsBucket.ytdReturn > 0) {
    const refillAmount = Math.min(refillNeeded, bondsBucket.currentValue * 0.15); // Max 15% of bonds bucket
    
    return {
      condition: 'B',
      sourceBucket: 'bonds',
      amount: refillAmount,
      reason: `Growth is down ${Math.abs(growthBucket.ytdReturn).toFixed(1)}%, but bonds are up ${bondsBucket.ytdReturn.toFixed(1)}%. Sell bonds to preserve equity.`,
      canExecute: refillAmount > 0,
    };
  }
  
  // Condition C: BOTH are down - Sequence Risk Protection
  return {
    condition: 'C',
    sourceBucket: null,
    amount: 0,
    reason: `Both growth (${growthBucket.ytdReturn.toFixed(1)}%) and bonds (${bondsBucket.ytdReturn.toFixed(1)}%) are down. Suspend refills to avoid selling at a loss.`,
    canExecute: false,
  };
}

/**
 * Run full bucket analysis
 */
export function analyzeBuckets(
  allocation: AssetAllocation,
  totalPortfolioValue: number,
  annualExpenses: number,
  targetYears: { cash: number; bonds: number; growth: number },
  ytdReturns: { cash: number; bonds: number; growth: number },
): BucketAnalysis {
  const currentValues = mapAllocationToBuckets(allocation, totalPortfolioValue);
  const buckets = calculateBucketStatus(currentValues, targetYears, ytdReturns, annualExpenses);
  const refillRecommendation = determineRefillAction(buckets, annualExpenses);
  
  const totalYearsCovered = buckets.reduce((sum, b) => {
    const yearsCovered = annualExpenses > 0 ? b.currentValue / annualExpenses : 0;
    return sum + yearsCovered;
  }, 0);
  
  return {
    buckets,
    totalPortfolioValue,
    annualExpenses,
    totalYearsCovered,
    refillRecommendation,
    sequenceRiskProtected: refillRecommendation.condition === 'C',
  };
}

/**
 * Calculate monthly paycheck from all sources
 */
export interface PaycheckBreakdown {
  guaranteedIncome: number; // SS, Pension, Annuity
  bucketWithdrawal: number; // Variable from Bucket 1
  grossTotal: number;
  estimatedTaxes: number;
  netPaycheck: number;
  sources: { name: string; amount: number; type: 'guaranteed' | 'variable' }[];
}

export function calculateMonthlyPaycheck(
  guaranteedSources: { name: string; monthlyAmount: number }[],
  bucketWithdrawal: number,
  effectiveTaxRate: number = 0.15,
): PaycheckBreakdown {
  const guaranteedIncome = guaranteedSources.reduce((sum, s) => sum + s.monthlyAmount, 0);
  const grossTotal = guaranteedIncome + bucketWithdrawal;
  const estimatedTaxes = grossTotal * effectiveTaxRate;
  const netPaycheck = grossTotal - estimatedTaxes;
  
  const sources = [
    ...guaranteedSources.map(s => ({ name: s.name, amount: s.monthlyAmount, type: 'guaranteed' as const })),
    ...(bucketWithdrawal > 0 ? [{ name: 'Bucket Withdrawal', amount: bucketWithdrawal, type: 'variable' as const }] : []),
  ];
  
  return {
    guaranteedIncome,
    bucketWithdrawal,
    grossTotal,
    estimatedTaxes,
    netPaycheck,
    sources,
  };
}

/**
 * Get condition description for UI
 */
export function getConditionDescription(condition: RefillCondition): { label: string; color: string; icon: string } {
  switch (condition) {
    case 'A':
      return { label: 'Growth Up', color: 'text-success', icon: 'TrendingUp' };
    case 'B':
      return { label: 'Bonds Up', color: 'text-primary', icon: 'ArrowUpRight' };
    case 'C':
      return { label: 'Protected Mode', color: 'text-warning', icon: 'Shield' };
  }
}
