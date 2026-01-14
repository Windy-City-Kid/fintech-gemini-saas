/**
 * Year-End Rebalance Audit Engine
 * 
 * Implements portfolio drift analysis, tax-loss harvesting,
 * and rebalance trade calculations for 2026.
 */

import { AssetAllocation } from './assetClassification';

// ============ 2026 IRS LIMITS ============

export const IRS_LIMITS_2026 = {
  capitalLossDeduction: 3000,
  estateExemption: 15000000,
  qcdMinAge: 70.5,
  qcdMaxAnnual: 105000,
  saltCap: 10000,
  standardDeduction: {
    single: 15700,
    married: 31400,
  },
};

// ============ TYPES ============

export interface TargetAllocation {
  domesticStocks: number;
  intlStocks: number;
  bonds: number;
  realEstate: number;
  cash: number;
}

export interface AllocationDrift {
  assetClass: string;
  currentPercent: number;
  targetPercent: number;
  driftPercent: number;
  driftAmount: number;
  exceedsDriftThreshold: boolean;
}

export interface RebalanceTrade {
  assetClass: string;
  action: 'BUY' | 'SELL';
  amount: number;
  reason: string;
}

export interface TaxLossCandidate {
  securityName: string;
  tickerSymbol: string | null;
  costBasis: number;
  marketValue: number;
  unrealizedLoss: number;
  accountName: string;
  recommendation: string;
}

export interface CharitableStrategy {
  type: 'tax_loss_harvest' | 'charitable_bunching' | 'qcd';
  title: string;
  description: string;
  estimatedSavings: number;
  isEligible: boolean;
  action: string;
}

export interface MarketCondition {
  sp500YtdReturn: number;
  isMarketUp: boolean;
  bondIndexYtdReturn: number;
  isBondMarketUp: boolean;
}

export interface BucketRefillStatus {
  condition: 'A' | 'B' | 'C';
  action: string;
  notification: string;
  canRefill: boolean;
  sourceAsset: string | null;
  amount: number;
}

// ============ DRIFT ANALYSIS ============

/**
 * Calculate allocation drift from target
 */
export function calculateAllocationDrift(
  currentAllocation: AssetAllocation,
  targetAllocation: TargetAllocation,
  totalPortfolioValue: number,
  driftThreshold: number = 5,
): AllocationDrift[] {
  const assetClasses = ['domesticStocks', 'intlStocks', 'bonds', 'realEstate', 'cash'] as const;
  const labels: Record<string, string> = {
    domesticStocks: 'US Stocks',
    intlStocks: 'International Stocks',
    bonds: 'Bonds',
    realEstate: 'Real Estate',
    cash: 'Cash',
  };

  const totalCurrent = Object.values(currentAllocation).reduce((sum, v) => sum + v, 0);

  return assetClasses.map(assetClass => {
    const currentValue = currentAllocation[assetClass];
    const currentPercent = totalCurrent > 0 ? (currentValue / totalCurrent) * 100 : 0;
    const targetPercent = targetAllocation[assetClass] * 100;
    const driftPercent = currentPercent - targetPercent;
    const driftAmount = totalPortfolioValue * (driftPercent / 100);

    return {
      assetClass: labels[assetClass],
      currentPercent,
      targetPercent,
      driftPercent,
      driftAmount,
      exceedsDriftThreshold: Math.abs(driftPercent) > driftThreshold,
    };
  });
}

/**
 * Generate rebalance trades to reset to target allocation
 */
export function calculateRebalanceTrades(
  drifts: AllocationDrift[],
  totalPortfolioValue: number,
): RebalanceTrade[] {
  const trades: RebalanceTrade[] = [];

  for (const drift of drifts) {
    if (Math.abs(drift.driftPercent) < 1) continue; // Skip negligible drifts

    if (drift.driftPercent > 0) {
      trades.push({
        assetClass: drift.assetClass,
        action: 'SELL',
        amount: Math.abs(drift.driftAmount),
        reason: `Overweight by ${drift.driftPercent.toFixed(1)}%`,
      });
    } else {
      trades.push({
        assetClass: drift.assetClass,
        action: 'BUY',
        amount: Math.abs(drift.driftAmount),
        reason: `Underweight by ${Math.abs(drift.driftPercent).toFixed(1)}%`,
      });
    }
  }

  // Sort: SELLs first, then BUYs
  return trades.sort((a, b) => {
    if (a.action === 'SELL' && b.action === 'BUY') return -1;
    if (a.action === 'BUY' && b.action === 'SELL') return 1;
    return b.amount - a.amount;
  });
}

// ============ TAX-LOSS HARVESTING ============

export interface HoldingWithBasis {
  securityName: string;
  tickerSymbol: string | null;
  marketValue: number;
  costBasis: number | null;
  accountName: string;
}

/**
 * Scan holdings for tax-loss harvesting opportunities
 */
export function findTaxLossCandidates(
  holdings: HoldingWithBasis[],
  annualizedGains: number = 0,
): TaxLossCandidate[] {
  const candidates: TaxLossCandidate[] = [];
  let totalHarvestable = 0;
  const targetHarvest = annualizedGains + IRS_LIMITS_2026.capitalLossDeduction;

  for (const holding of holdings) {
    if (holding.costBasis === null) continue;
    
    const unrealizedLoss = holding.costBasis - holding.marketValue;
    if (unrealizedLoss <= 0) continue; // No loss

    const isHighPriority = totalHarvestable < targetHarvest;
    totalHarvestable += unrealizedLoss;

    let recommendation = '';
    if (annualizedGains > 0 && unrealizedLoss > 0) {
      recommendation = `Harvest to offset ${formatCurrency(Math.min(unrealizedLoss, annualizedGains))} in capital gains`;
    } else if (unrealizedLoss > 0) {
      recommendation = `Harvest to offset up to ${formatCurrency(IRS_LIMITS_2026.capitalLossDeduction)} in ordinary income`;
    }

    candidates.push({
      securityName: holding.securityName,
      tickerSymbol: holding.tickerSymbol,
      costBasis: holding.costBasis,
      marketValue: holding.marketValue,
      unrealizedLoss,
      accountName: holding.accountName,
      recommendation,
    });
  }

  // Sort by loss amount descending
  return candidates.sort((a, b) => b.unrealizedLoss - a.unrealizedLoss);
}

// ============ CHARITABLE STRATEGIES ============

/**
 * Generate smart tax move recommendations
 */
export function generateTaxStrategies(
  taxLossCandidates: TaxLossCandidate[],
  userAge: number,
  rmdAmount: number,
  currentYearCharitableGiving: number,
  projectedSaltDeductions: number,
  filingStatus: 'single' | 'married' = 'married',
): CharitableStrategy[] {
  const strategies: CharitableStrategy[] = [];
  const standardDeduction = IRS_LIMITS_2026.standardDeduction[filingStatus];

  // 1. Tax-Loss Harvesting
  const totalLosses = taxLossCandidates.reduce((sum, c) => sum + c.unrealizedLoss, 0);
  if (totalLosses > 0) {
    strategies.push({
      type: 'tax_loss_harvest',
      title: 'Tax-Loss Harvesting Opportunity',
      description: `You have ${formatCurrency(totalLosses)} in unrealized losses that can offset gains or up to $3,000 in ordinary income.`,
      estimatedSavings: Math.min(totalLosses, IRS_LIMITS_2026.capitalLossDeduction) * 0.32, // Assuming 32% bracket
      isEligible: true,
      action: 'Review holdings with losses and consider selling before year-end',
    });
  }

  // 2. Charitable Bunching / DAF
  const itemizedTotal = projectedSaltDeductions + currentYearCharitableGiving;
  const shortfall = standardDeduction - itemizedTotal;
  
  if (shortfall > 0 && shortfall < 20000) {
    const bunchAmount = shortfall + 5000; // Recommend bunching enough to exceed standard deduction
    strategies.push({
      type: 'charitable_bunching',
      title: 'Charitable Bunching Opportunity',
      description: `You're ${formatCurrency(shortfall)} below the standard deduction. Consider bunching ${formatCurrency(bunchAmount)} into a Donor-Advised Fund (DAF) to itemize this year.`,
      estimatedSavings: bunchAmount * 0.24, // Assuming 24% marginal rate benefit
      isEligible: true,
      action: 'Open or contribute to a Donor-Advised Fund before December 31st',
    });
  }

  // 3. Qualified Charitable Distribution (QCD)
  const isQcdEligible = userAge >= IRS_LIMITS_2026.qcdMinAge;
  if (isQcdEligible && rmdAmount > 0) {
    const qcdAmount = Math.min(rmdAmount, IRS_LIMITS_2026.qcdMaxAnnual);
    strategies.push({
      type: 'qcd',
      title: 'Qualified Charitable Distribution (QCD)',
      description: `At age ${Math.floor(userAge)}, you can send up to ${formatCurrency(qcdAmount)} directly from your IRA to charity, satisfying your RMD without increasing AGI.`,
      estimatedSavings: qcdAmount * 0.32, // Tax avoided on RMD
      isEligible: true,
      action: 'Contact your IRA custodian to set up a direct QCD transfer',
    });
  } else if (!isQcdEligible) {
    strategies.push({
      type: 'qcd',
      title: 'Qualified Charitable Distribution (QCD)',
      description: 'QCDs are available to IRA owners age 70½ and older.',
      estimatedSavings: 0,
      isEligible: false,
      action: `You'll be eligible in ${(IRS_LIMITS_2026.qcdMinAge - userAge).toFixed(1)} years`,
    });
  }

  return strategies;
}

// ============ BUCKET REFILL LOGIC ============

/**
 * Determine bucket refill status based on market conditions
 */
export function determineBucketRefillStatus(
  marketCondition: MarketCondition,
  annualExpenses: number,
  cashBucketBalance: number,
  targetCashYears: number = 2,
): BucketRefillStatus {
  const targetCashAmount = annualExpenses * targetCashYears;
  const refillNeeded = Math.max(0, targetCashAmount - cashBucketBalance);
  const refillAmount = Math.min(refillNeeded, annualExpenses); // Refill up to 1 year

  // Condition A: S&P 500 is UP
  if (marketCondition.isMarketUp) {
    return {
      condition: 'A',
      action: 'Sell equities to refill Cash Bucket',
      notification: `S&P 500 is up ${marketCondition.sp500YtdReturn.toFixed(1)}% YTD. Selling gains to fund next 12 months of expenses.`,
      canRefill: refillNeeded > 0,
      sourceAsset: 'Equities',
      amount: refillAmount,
    };
  }

  // Condition B: Stocks DOWN, Bonds UP
  if (!marketCondition.isMarketUp && marketCondition.isBondMarketUp) {
    return {
      condition: 'B',
      action: 'Sell bonds to preserve equity positions',
      notification: `S&P 500 is down ${Math.abs(marketCondition.sp500YtdReturn).toFixed(1)}%, but bonds are up. Selling bonds to avoid locking in equity losses.`,
      canRefill: refillNeeded > 0,
      sourceAsset: 'Bonds',
      amount: refillAmount,
    };
  }

  // Condition C: BOTH DOWN - Sequence Risk Protection
  return {
    condition: 'C',
    action: 'Suspend refills - draw from cash reserve',
    notification: `⚠️ Market Downturn Detected: Skipping Bucket Refill. Drawing from 2-year cash reserve to avoid selling at a loss.`,
    canRefill: false,
    sourceAsset: null,
    amount: 0,
  };
}

// ============ HELPERS ============

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}
