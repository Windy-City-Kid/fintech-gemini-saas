/**
 * Social Security Claiming Strategy Optimizer
 * 
 * Implements:
 * - PIA adjustments with early claiming penalties (70% at 62) and delayed credits (124% at 70)
 * - Spousal benefit calculation (up to 50% of partner's FRA benefit)
 * - Survivor benefit optimization (100% of deceased's benefit)
 * - Household strategy comparison (Earliest, Balanced, Optimal)
 * - Break-even analysis with state tax integration
 */

import { calculateBenefitAdjustment, applyCOLAToClaimingAge } from './socialSecurityCalculator';
import { StateTaxRule, calculateStateTax } from '@/hooks/useStateTaxRules';

export interface HouseholdSSParams {
  primaryPIA: number;
  primaryCurrentAge: number;
  primaryFRA: number;
  primaryLifeExpectancy: number;
  spousePIA: number;
  spouseCurrentAge: number;
  spouseFRA: number;
  spouseLifeExpectancy: number;
  isMarried: boolean;
  colaRate: number;
  stateTaxRule?: StateTaxRule;
  filingStatus: 'single' | 'married_filing_jointly';
}

export interface ClaimingStrategy {
  name: string;
  description: string;
  primaryClaimingAge: number;
  spouseClaimingAge: number;
  lifetimeBenefits: number;
  afterTaxLifetimeBenefits: number;
  breakEvenAge: number;
  monthlyBenefitAtClaim: {
    primary: number;
    spouse: number;
    combined: number;
  };
  annualBenefitAtClaim: number;
  benefitsByAge: Array<{
    age: number;
    primaryBenefit: number;
    spouseBenefit: number;
    totalBenefit: number;
    cumulativeBenefit: number;
    afterTaxBenefit: number;
    isSurvivorActive: boolean;
  }>;
}

export interface StrategyComparisonResult {
  earliest: ClaimingStrategy;
  balanced: ClaimingStrategy;
  optimal: ClaimingStrategy;
  customStrategy?: ClaimingStrategy;
  optimalAdvantage: {
    vsEarliest: number;
    vsBalanced: number;
    breakEvenVsEarliest: number;
  };
  recommendation: string;
}

/**
 * Calculate spousal benefit (50% of higher earner's FRA benefit)
 * The spouse receives the greater of their own benefit or 50% of partner's PIA
 */
export function calculateSpousalBenefit(
  ownPIA: number,
  ownClaimingAge: number,
  ownFRA: number,
  partnerPIA: number,
  partnerClaimingAge: number,
  partnerFRA: number
): { ownBenefit: number; spousalBenefit: number; usesSpousal: boolean } {
  // Own benefit based on own record
  const ownAdjustment = calculateBenefitAdjustment(ownClaimingAge, ownFRA);
  const ownBenefit = ownPIA * ownAdjustment;
  
  // Spousal benefit is 50% of partner's PIA (at partner's FRA)
  // But reduced if claimed before own FRA
  const spousalMax = partnerPIA * 0.5;
  
  // If claiming before FRA, spousal benefit is reduced
  const monthsEarly = Math.max(0, (ownFRA - ownClaimingAge) * 12);
  let spousalReduction = 1;
  if (monthsEarly > 0) {
    if (monthsEarly <= 36) {
      spousalReduction = 1 - (monthsEarly * 25 / 36 / 100);
    } else {
      spousalReduction = 1 - 0.25 - ((monthsEarly - 36) * 5 / 12 / 100);
    }
  }
  
  const spousalBenefit = spousalMax * spousalReduction;
  
  // Person receives greater of own or spousal
  const usesSpousal = spousalBenefit > ownBenefit;
  
  return {
    ownBenefit,
    spousalBenefit,
    usesSpousal,
  };
}

/**
 * Calculate survivor benefit (100% of deceased's benefit)
 */
export function calculateSurvivorBenefit(
  deceasedBenefit: number,
  survivorOwnBenefit: number,
  survivorAge: number,
  survivorFRA: number
): number {
  // Survivor gets the higher of their own or the deceased's benefit
  // But survivor benefit may be reduced if claimed before survivor's FRA
  let survivorReduction = 1;
  if (survivorAge < survivorFRA) {
    const monthsEarly = (survivorFRA - survivorAge) * 12;
    // Survivor benefits are reduced about 0.396% per month before FRA (max 28.5%)
    survivorReduction = Math.max(0.715, 1 - (monthsEarly * 0.00396));
  }
  
  const adjustedSurvivorBenefit = deceasedBenefit * survivorReduction;
  
  return Math.max(adjustedSurvivorBenefit, survivorOwnBenefit);
}

/**
 * Calculate Social Security taxable amount (federal)
 * Up to 85% of SS benefits may be taxable based on combined income
 */
export function calculateSSFederalTaxable(
  ssBenefit: number,
  otherIncome: number,
  filingStatus: 'single' | 'married_filing_jointly'
): number {
  const provisionalIncome = otherIncome + (ssBenefit * 0.5);
  
  const thresholds = filingStatus === 'married_filing_jointly'
    ? { first: 32000, second: 44000 }
    : { first: 25000, second: 34000 };
  
  if (provisionalIncome <= thresholds.first) {
    return 0;
  } else if (provisionalIncome <= thresholds.second) {
    return Math.min(ssBenefit * 0.5, (provisionalIncome - thresholds.first) * 0.5);
  } else {
    const firstLevel = (thresholds.second - thresholds.first) * 0.5;
    const secondLevel = (provisionalIncome - thresholds.second) * 0.85;
    return Math.min(ssBenefit * 0.85, firstLevel + secondLevel);
  }
}

/**
 * Calculate after-tax SS benefit considering state-specific rules
 */
export function calculateAfterTaxSSBenefit(
  ssBenefit: number,
  otherIncome: number,
  filingStatus: 'single' | 'married_filing_jointly',
  stateTaxRule?: StateTaxRule,
  federalMarginalRate: number = 0.22,
  age: number = 65
): number {
  // Federal tax on SS
  const federalTaxable = calculateSSFederalTaxable(ssBenefit, otherIncome, filingStatus);
  const federalTax = federalTaxable * federalMarginalRate;
  
  // State tax on SS (varies by state)
  let stateTax = 0;
  if (stateTaxRule && stateTaxRule.social_security_taxable) {
    // Some states tax SS above a threshold (e.g., MN, UT)
    const threshold = stateTaxRule.ss_exemption_threshold_joint || 0;
    const taxableSSForState = Math.max(0, ssBenefit - threshold);
    stateTax = taxableSSForState * (stateTaxRule.base_rate / 100);
  }
  
  return ssBenefit - federalTax - stateTax;
}

/**
 * Calculate full claiming strategy with year-by-year projections
 */
function calculateClaimingStrategy(
  params: HouseholdSSParams,
  primaryClaimingAge: number,
  spouseClaimingAge: number,
  strategyName: string,
  strategyDescription: string
): ClaimingStrategy {
  const maxAge = Math.max(params.primaryLifeExpectancy, params.spouseLifeExpectancy);
  const benefitsByAge: ClaimingStrategy['benefitsByAge'] = [];
  
  // Calculate COLA-adjusted PIAs at claiming
  const primaryCOLAPIA = applyCOLAToClaimingAge(
    params.primaryPIA,
    params.primaryCurrentAge,
    primaryClaimingAge,
    params.colaRate
  );
  const spouseCOLAPIA = params.isMarried
    ? applyCOLAToClaimingAge(
        params.spousePIA,
        params.spouseCurrentAge,
        spouseClaimingAge,
        params.colaRate
      )
    : 0;
  
  // Calculate monthly benefits at claiming
  const primaryAdjustment = calculateBenefitAdjustment(primaryClaimingAge, params.primaryFRA);
  const spouseAdjustment = params.isMarried
    ? calculateBenefitAdjustment(spouseClaimingAge, params.spouseFRA)
    : 0;
  
  const primaryMonthlyAtClaim = primaryCOLAPIA * primaryAdjustment;
  const spouseMonthlyAtClaim = spouseCOLAPIA * spouseAdjustment;
  
  let cumulativeBenefit = 0;
  let lifetimeBenefits = 0;
  let afterTaxLifetimeBenefits = 0;
  
  // Simulate year by year
  for (let age = params.primaryCurrentAge; age <= maxAge; age++) {
    const spouseAge = params.spouseCurrentAge + (age - params.primaryCurrentAge);
    const yearsSincePrimaryClaim = Math.max(0, age - primaryClaimingAge);
    const yearsSinceSpouseClaim = Math.max(0, spouseAge - spouseClaimingAge);
    
    // Check if each person is alive and claiming
    const primaryAlive = age <= params.primaryLifeExpectancy;
    const spouseAlive = params.isMarried && spouseAge <= params.spouseLifeExpectancy;
    const primaryClaiming = age >= primaryClaimingAge;
    const spouseClaiming = params.isMarried && spouseAge >= spouseClaimingAge;
    
    // Apply ongoing COLA
    let primaryBenefit = primaryClaiming && primaryAlive
      ? primaryMonthlyAtClaim * 12 * Math.pow(1 + params.colaRate, yearsSincePrimaryClaim)
      : 0;
    
    let spouseBenefit = spouseClaiming && spouseAlive
      ? spouseMonthlyAtClaim * 12 * Math.pow(1 + params.colaRate, yearsSinceSpouseClaim)
      : 0;
    
    let isSurvivorActive = false;
    
    // Survivor benefit logic
    if (params.isMarried) {
      if (!primaryAlive && spouseAlive && spouseClaiming) {
        // Primary died - spouse gets higher benefit
        const survivorBenefit = Math.max(primaryBenefit, spouseBenefit);
        spouseBenefit = survivorBenefit;
        primaryBenefit = 0;
        isSurvivorActive = true;
      } else if (!spouseAlive && primaryAlive && primaryClaiming) {
        // Spouse died - primary gets higher benefit
        const survivorBenefit = Math.max(primaryBenefit, spouseBenefit);
        primaryBenefit = survivorBenefit;
        spouseBenefit = 0;
        isSurvivorActive = true;
      }
    }
    
    const totalBenefit = primaryBenefit + spouseBenefit;
    cumulativeBenefit += totalBenefit;
    lifetimeBenefits += totalBenefit;
    
    // Calculate after-tax benefit
    const afterTaxBenefit = calculateAfterTaxSSBenefit(
      totalBenefit,
      30000, // Assume some other income for tax calculation
      params.filingStatus,
      params.stateTaxRule,
      0.22,
      age
    );
    afterTaxLifetimeBenefits += afterTaxBenefit;
    
    benefitsByAge.push({
      age,
      primaryBenefit,
      spouseBenefit,
      totalBenefit,
      cumulativeBenefit,
      afterTaxBenefit,
      isSurvivorActive,
    });
  }
  
  return {
    name: strategyName,
    description: strategyDescription,
    primaryClaimingAge,
    spouseClaimingAge,
    lifetimeBenefits,
    afterTaxLifetimeBenefits,
    breakEvenAge: 0, // Calculated in comparison
    monthlyBenefitAtClaim: {
      primary: primaryMonthlyAtClaim,
      spouse: spouseMonthlyAtClaim,
      combined: primaryMonthlyAtClaim + spouseMonthlyAtClaim,
    },
    annualBenefitAtClaim: (primaryMonthlyAtClaim + spouseMonthlyAtClaim) * 12,
    benefitsByAge,
  };
}

/**
 * Find break-even age between two strategies
 */
function findBreakEvenAge(
  earlierStrategy: ClaimingStrategy,
  laterStrategy: ClaimingStrategy
): number {
  for (let i = 0; i < laterStrategy.benefitsByAge.length; i++) {
    const laterCumulative = laterStrategy.benefitsByAge[i]?.cumulativeBenefit || 0;
    const earlierCumulative = earlierStrategy.benefitsByAge[i]?.cumulativeBenefit || 0;
    
    if (laterCumulative > earlierCumulative) {
      return laterStrategy.benefitsByAge[i].age;
    }
  }
  return 100; // Never breaks even
}

/**
 * Compare three household claiming strategies
 */
export function compareHouseholdStrategies(
  params: HouseholdSSParams
): StrategyComparisonResult {
  // Strategy 1: Earliest - Both claim at 62
  const earliest = calculateClaimingStrategy(
    params,
    62,
    params.isMarried ? 62 : 62,
    'Earliest',
    'Both claim at 62 for immediate income'
  );
  
  // Strategy 2: Balanced - Both claim at FRA (67)
  const balanced = calculateClaimingStrategy(
    params,
    67,
    params.isMarried ? 67 : 67,
    'Balanced',
    'Both claim at Full Retirement Age'
  );
  
  // Strategy 3: Optimal - Higher earner delays to 70, lower claims early
  const primaryIsHigherEarner = params.primaryPIA >= params.spousePIA;
  const optimal = calculateClaimingStrategy(
    params,
    primaryIsHigherEarner ? 70 : 62,
    params.isMarried ? (primaryIsHigherEarner ? 62 : 70) : 70,
    'Optimal',
    primaryIsHigherEarner 
      ? 'You delay to 70, spouse claims at 62 (maximizes survivor benefit)'
      : 'Spouse delays to 70, you claim at 62 (maximizes survivor benefit)'
  );
  
  // Calculate break-even ages
  optimal.breakEvenAge = findBreakEvenAge(earliest, optimal);
  balanced.breakEvenAge = findBreakEvenAge(earliest, balanced);
  
  // Calculate advantages
  const optimalAdvantage = {
    vsEarliest: optimal.lifetimeBenefits - earliest.lifetimeBenefits,
    vsBalanced: optimal.lifetimeBenefits - balanced.lifetimeBenefits,
    breakEvenVsEarliest: optimal.breakEvenAge,
  };
  
  // Generate recommendation
  let recommendation = '';
  if (optimalAdvantage.vsEarliest > 100000) {
    recommendation = `If you live past age ${optimal.breakEvenAge}, the Delay to 70 strategy will provide you with $${(optimalAdvantage.vsEarliest / 1000).toFixed(0)}K more in lifetime income than claiming early.`;
  } else if (optimalAdvantage.vsEarliest > 0) {
    recommendation = `Delaying provides a modest advantage of $${(optimalAdvantage.vsEarliest / 1000).toFixed(0)}K over early claiming, with break-even at age ${optimal.breakEvenAge}.`;
  } else {
    recommendation = `Given your life expectancy assumptions, claiming early may be advantageous.`;
  }
  
  return {
    earliest,
    balanced,
    optimal,
    optimalAdvantage,
    recommendation,
  };
}

/**
 * Calculate custom strategy for user-selected claiming ages
 */
export function calculateCustomStrategy(
  params: HouseholdSSParams,
  primaryClaimingAge: number,
  spouseClaimingAge: number
): ClaimingStrategy {
  return calculateClaimingStrategy(
    params,
    primaryClaimingAge,
    spouseClaimingAge,
    'Your Strategy',
    `You claim at ${primaryClaimingAge}${params.isMarried ? `, spouse at ${spouseClaimingAge}` : ''}`
  );
}

/**
 * Get after-tax benefit comparison for different states
 */
export function getStateTaxImpactComparison(
  ssBenefit: number,
  stateRules: StateTaxRule[]
): Array<{ state: string; afterTaxBenefit: number; taxAmount: number }> {
  return stateRules.map(rule => {
    const afterTax = calculateAfterTaxSSBenefit(
      ssBenefit,
      30000,
      'married_filing_jointly',
      rule,
      0.22,
      67
    );
    return {
      state: rule.state_name,
      afterTaxBenefit: afterTax,
      taxAmount: ssBenefit - afterTax,
    };
  }).sort((a, b) => b.afterTaxBenefit - a.afterTaxBenefit);
}
