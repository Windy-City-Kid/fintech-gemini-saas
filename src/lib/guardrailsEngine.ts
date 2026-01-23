/**
 * Guyton-Klinger Spending Guardrails Engine
 * 
 * Implements dynamic withdrawal rate monitoring with:
 * - Initial withdrawal rate calculation
 * - Upper guardrail (prosperity): Initial Rate × 0.8
 * - Lower guardrail (caution): Initial Rate × 1.2
 * - Real-time zone detection and spending adjustments
 */

export type SpendingZone = 'prosperity' | 'safe' | 'caution';

export interface GuardrailConfig {
  initialWithdrawalRate: number; // e.g., 0.05 for 5%
  upperGuardrailMultiplier: number; // 0.8 = prosperity zone if current < initial × 0.8
  lowerGuardrailMultiplier: number; // 1.2 = caution zone if current > initial × 1.2
  spendingAdjustment: number; // 0.10 = 10% increase/decrease
}

export interface GuardrailStatus {
  currentWithdrawalRate: number;
  initialWithdrawalRate: number;
  upperGuardrail: number; // Prosperity threshold
  lowerGuardrail: number; // Caution threshold
  zone: SpendingZone;
  safeSpendingMonthly: number;
  adjustedSpendingMonthly: number;
  adjustmentAmount: number; // Positive = can spend more, negative = should cut
  adjustmentPercent: number;
}

export interface MarketShockResult {
  originalMonthlyBudget: number;
  shockedMonthlyBudget: number;
  shockedWithdrawalRate: number;
  shockedZone: SpendingZone;
  budgetChange: number;
  portfolioAfterShock: number;
}

const DEFAULT_CONFIG: GuardrailConfig = {
  initialWithdrawalRate: 0.05, // 5% initial withdrawal rate
  upperGuardrailMultiplier: 0.8,
  lowerGuardrailMultiplier: 1.2,
  spendingAdjustment: 0.10, // 10% adjustment
};

/**
 * Calculate initial withdrawal rate based on portfolio and annual spending
 */
export function calculateInitialWithdrawalRate(
  portfolioValue: number,
  annualSpending: number
): number {
  if (portfolioValue <= 0) return 0;
  return annualSpending / portfolioValue;
}

/**
 * Calculate current withdrawal rate based on real-time balances
 */
export function calculateCurrentWithdrawalRate(
  currentPortfolioValue: number,
  annualSpending: number
): number {
  if (currentPortfolioValue <= 0) return 1; // 100% = depleted
  return annualSpending / currentPortfolioValue;
}

/**
 * Determine which spending zone the user is in
 */
export function determineSpendingZone(
  currentRate: number,
  initialRate: number,
  config: GuardrailConfig = DEFAULT_CONFIG
): SpendingZone {
  const upperGuardrail = initialRate * config.upperGuardrailMultiplier;
  const lowerGuardrail = initialRate * config.lowerGuardrailMultiplier;
  
  // Lower withdrawal rate = higher portfolio = prosperity
  if (currentRate < upperGuardrail) {
    return 'prosperity';
  }
  
  // Higher withdrawal rate = lower portfolio = caution
  if (currentRate > lowerGuardrail) {
    return 'caution';
  }
  
  return 'safe';
}

/**
 * Calculate complete guardrail status
 */
export function calculateGuardrailStatus(
  currentPortfolioValue: number,
  initialPortfolioValue: number,
  monthlySpending: number,
  config: GuardrailConfig = DEFAULT_CONFIG
): GuardrailStatus {
  const annualSpending = monthlySpending * 12;
  
  const initialWithdrawalRate = calculateInitialWithdrawalRate(
    initialPortfolioValue,
    annualSpending
  );
  
  const currentWithdrawalRate = calculateCurrentWithdrawalRate(
    currentPortfolioValue,
    annualSpending
  );
  
  const upperGuardrail = initialWithdrawalRate * config.upperGuardrailMultiplier;
  const lowerGuardrail = initialWithdrawalRate * config.lowerGuardrailMultiplier;
  
  const zone = determineSpendingZone(currentWithdrawalRate, initialWithdrawalRate, config);
  
  // Calculate adjustment based on zone
  let adjustedSpendingMonthly = monthlySpending;
  let adjustmentPercent = 0;
  
  if (zone === 'prosperity') {
    // Can increase spending by 10%
    adjustmentPercent = config.spendingAdjustment;
    adjustedSpendingMonthly = monthlySpending * (1 + config.spendingAdjustment);
  } else if (zone === 'caution') {
    // Should reduce spending by 10%
    adjustmentPercent = -config.spendingAdjustment;
    adjustedSpendingMonthly = monthlySpending * (1 - config.spendingAdjustment);
  }
  
  const adjustmentAmount = adjustedSpendingMonthly - monthlySpending;
  
  return {
    currentWithdrawalRate,
    initialWithdrawalRate,
    upperGuardrail,
    lowerGuardrail,
    zone,
    safeSpendingMonthly: monthlySpending,
    adjustedSpendingMonthly,
    adjustmentAmount,
    adjustmentPercent,
  };
}

/**
 * Simulate market shock and calculate impact on monthly budget
 */
export function simulateMarketShock(
  currentPortfolioValue: number,
  initialPortfolioValue: number,
  monthlySpending: number,
  shockPercent: number = 0.15, // 15% drop
  config: GuardrailConfig = DEFAULT_CONFIG
): MarketShockResult {
  const portfolioAfterShock = currentPortfolioValue * (1 - shockPercent);
  
  const status = calculateGuardrailStatus(
    portfolioAfterShock,
    initialPortfolioValue,
    monthlySpending,
    config
  );
  
  return {
    originalMonthlyBudget: monthlySpending,
    shockedMonthlyBudget: status.adjustedSpendingMonthly,
    shockedWithdrawalRate: status.currentWithdrawalRate,
    shockedZone: status.zone,
    budgetChange: status.adjustedSpendingMonthly - monthlySpending,
    portfolioAfterShock,
  };
}

/**
 * Calculate safe spending target that maintains the safe zone
 */
export function calculateSafeSpendingTarget(
  currentPortfolioValue: number,
  initialWithdrawalRate: number,
  config: GuardrailConfig = DEFAULT_CONFIG
): number {
  // Safe spending = portfolio × initial rate
  // This keeps the withdrawal rate at the initial level
  const annualSafeSpending = currentPortfolioValue * initialWithdrawalRate;
  return annualSafeSpending / 12;
}

/**
 * Generate AI Advisor nudge message based on guardrail status
 */
export function generateGuardrailNudge(
  status: GuardrailStatus,
  legacyGoal?: number,
  bucketListEnabled?: boolean
): string | null {
  if (status.zone === 'prosperity') {
    const extraAmount = Math.abs(status.adjustmentAmount);
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(extraAmount);
    
    let message = `Good news! Your portfolio is ahead of schedule. You have ${formattedAmount} extra in "guilt-free" spending this month.`;
    
    if (legacyGoal || bucketListEnabled) {
      message += ` Would you like to earmark this for a ${legacyGoal ? '"Legacy Goal"' : ''}${legacyGoal && bucketListEnabled ? ' or a ' : ''}${bucketListEnabled ? '"Bucket List" trip' : ''}?`;
    }
    
    return message;
  }
  
  if (status.zone === 'caution') {
    const reductionAmount = Math.abs(status.adjustmentAmount);
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(reductionAmount);
    
    return `Your portfolio has dipped below the safety threshold. To protect your long-term security, consider a temporary ${(status.adjustmentPercent * -100).toFixed(0)}% spending reduction (about ${formattedAmount}/month). This will help your portfolio recover while keeping your retirement on track.`;
  }
  
  return null;
}

export { DEFAULT_CONFIG };
