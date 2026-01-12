/**
 * Social Security Benefit Calculator
 * 
 * Implements SSA rules for:
 * - Early claiming reduction (up to 30% at age 62)
 * - Delayed retirement credits (8% per year past FRA)
 * - COLA compounding (CPI-W based)
 * - Survivor benefit logic for married couples
 */

export interface SocialSecurityParams {
  primaryPIA: number;           // Primary Insurance Amount at FRA
  primaryClaimingAge: number;   // Age to start benefits (62-70)
  primaryFRA: number;           // Full Retirement Age (66-67)
  primaryCurrentAge: number;    // Current age
  spousePIA?: number;           // Spouse PIA (0 if single)
  spouseClaimingAge?: number;   // Spouse claiming age
  spouseFRA?: number;           // Spouse FRA
  spouseCurrentAge?: number;    // Spouse current age
  isMarried: boolean;
  colaRate: number;             // Annual COLA rate (e.g., 0.0254 for 2.54%)
}

export interface YearlyBenefit {
  age: number;
  primaryBenefit: number;       // Primary's annual benefit (COLA-adjusted)
  spouseBenefit: number;        // Spouse's annual benefit
  totalBenefit: number;         // Combined household benefit
  isSurvivorBenefit: boolean;   // Whether survivor benefit is active
}

export interface ClaimingScenario {
  claimingAge: number;
  monthlyBenefit: number;       // At claiming age
  lifetimeBenefits: number;     // Total through life expectancy
  breakEvenAge: number;         // Age when this beats early claiming
  adjustedBenefit: number;      // Adjustment factor applied
}

/**
 * Calculate benefit adjustment factor based on claiming age vs FRA
 * 
 * Before FRA: Reduced by 5/9 of 1% per month for first 36 months,
 *             then 5/12 of 1% per month for additional months
 * After FRA:  Increased by 8% per year (2/3% per month)
 */
export function calculateBenefitAdjustment(claimingAge: number, fra: number): number {
  const monthsDiff = (claimingAge - fra) * 12;
  
  if (monthsDiff >= 0) {
    // Delayed retirement credits: 8% per year past FRA
    return 1 + (monthsDiff / 12) * 0.08;
  } else {
    // Early claiming reduction
    const monthsEarly = Math.abs(monthsDiff);
    
    if (monthsEarly <= 36) {
      // First 36 months: 5/9 of 1% per month = ~0.556% per month
      return 1 - (monthsEarly * 5 / 9 / 100);
    } else {
      // First 36 months at 5/9 of 1%, remaining at 5/12 of 1%
      const first36Reduction = 36 * 5 / 9 / 100;
      const additionalMonths = monthsEarly - 36;
      const additionalReduction = additionalMonths * 5 / 12 / 100;
      return 1 - first36Reduction - additionalReduction;
    }
  }
}

/**
 * Calculate monthly benefit based on PIA and claiming age
 */
export function calculateMonthlyBenefit(pia: number, claimingAge: number, fra: number): number {
  const adjustment = calculateBenefitAdjustment(claimingAge, fra);
  return pia * adjustment;
}

/**
 * Apply COLA compounding to PIA from current age to claiming age
 * This reflects that benefits grow with COLA even before claiming
 */
export function applyCOLAToClaimingAge(
  pia: number,
  currentAge: number,
  claimingAge: number,
  colaRate: number
): number {
  const yearsUntilClaiming = Math.max(0, claimingAge - currentAge);
  return pia * Math.pow(1 + colaRate, yearsUntilClaiming);
}

/**
 * Calculate yearly benefits stream for simulation
 * Includes COLA compounding and survivor benefit logic
 */
export function calculateYearlyBenefits(
  params: SocialSecurityParams,
  simulationYears: number,
  primaryDeathYear?: number,  // Year of simulation when primary dies
  spouseDeathYear?: number    // Year of simulation when spouse dies
): YearlyBenefit[] {
  const benefits: YearlyBenefit[] = [];
  
  // Calculate base benefits with COLA applied to claiming age
  const primaryCOLAAdjustedPIA = applyCOLAToClaimingAge(
    params.primaryPIA,
    params.primaryCurrentAge,
    params.primaryClaimingAge,
    params.colaRate
  );
  
  const primaryAdjustment = calculateBenefitAdjustment(params.primaryClaimingAge, params.primaryFRA);
  const primaryMonthlyAtClaiming = primaryCOLAAdjustedPIA * primaryAdjustment;
  
  let spouseMonthlyAtClaiming = 0;
  let spouseCOLAAdjustedPIA = 0;
  let spouseAdjustment = 1;
  
  if (params.isMarried && params.spousePIA && params.spouseClaimingAge && params.spouseFRA && params.spouseCurrentAge) {
    spouseCOLAAdjustedPIA = applyCOLAToClaimingAge(
      params.spousePIA,
      params.spouseCurrentAge,
      params.spouseClaimingAge,
      params.colaRate
    );
    spouseAdjustment = calculateBenefitAdjustment(params.spouseClaimingAge, params.spouseFRA);
    spouseMonthlyAtClaiming = spouseCOLAAdjustedPIA * spouseAdjustment;
  }
  
  for (let year = 0; year < simulationYears; year++) {
    const age = params.primaryCurrentAge + year;
    const spouseAge = params.spouseCurrentAge ? params.spouseCurrentAge + year : 0;
    
    // Check if person is alive and has started claiming
    const primaryAlive = !primaryDeathYear || year < primaryDeathYear;
    const spouseAlive = !spouseDeathYear || year < spouseDeathYear;
    const primaryClaiming = age >= params.primaryClaimingAge;
    const spouseClaiming = params.isMarried && spouseAge >= (params.spouseClaimingAge || 0);
    
    // Calculate years since claiming for COLA adjustment
    const primaryYearsSinceClaiming = Math.max(0, age - params.primaryClaimingAge);
    const spouseYearsSinceClaiming = params.spouseClaimingAge 
      ? Math.max(0, spouseAge - params.spouseClaimingAge) 
      : 0;
    
    let primaryBenefit = 0;
    let spouseBenefit = 0;
    let isSurvivorBenefit = false;
    
    // Apply ongoing COLA after claiming
    const primaryAnnualBenefit = primaryClaiming && primaryAlive
      ? primaryMonthlyAtClaiming * 12 * Math.pow(1 + params.colaRate, primaryYearsSinceClaiming)
      : 0;
    
    const spouseAnnualBenefit = spouseClaiming && spouseAlive
      ? spouseMonthlyAtClaiming * 12 * Math.pow(1 + params.colaRate, spouseYearsSinceClaiming)
      : 0;
    
    // Survivor benefit logic
    if (params.isMarried) {
      if (!primaryAlive && spouseAlive) {
        // Primary died - spouse gets higher of own benefit or primary's benefit
        const survivorBenefit = Math.max(primaryAnnualBenefit, spouseAnnualBenefit);
        spouseBenefit = survivorBenefit;
        isSurvivorBenefit = spouseAnnualBenefit < primaryAnnualBenefit;
      } else if (!spouseAlive && primaryAlive) {
        // Spouse died - primary gets higher of own benefit or spouse's benefit
        const survivorBenefit = Math.max(primaryAnnualBenefit, spouseAnnualBenefit);
        primaryBenefit = survivorBenefit;
        isSurvivorBenefit = primaryAnnualBenefit < spouseAnnualBenefit;
      } else if (primaryAlive && spouseAlive) {
        // Both alive - each gets their own benefit
        primaryBenefit = primaryAnnualBenefit;
        spouseBenefit = spouseAnnualBenefit;
      }
    } else {
      // Single person
      primaryBenefit = primaryAlive ? primaryAnnualBenefit : 0;
    }
    
    benefits.push({
      age,
      primaryBenefit,
      spouseBenefit,
      totalBenefit: primaryBenefit + spouseBenefit,
      isSurvivorBenefit,
    });
  }
  
  return benefits;
}

/**
 * Calculate lifetime cumulative benefits for different claiming ages
 * Used for the breakeven analysis chart
 */
export function calculateClaimingScenarios(
  pia: number,
  fra: number,
  currentAge: number,
  lifeExpectancy: number,
  colaRate: number
): ClaimingScenario[] {
  const claimingAges = [62, 63, 64, 65, 66, 67, 68, 69, 70];
  const scenarios: ClaimingScenario[] = [];
  
  for (const claimingAge of claimingAges) {
    // Skip if claiming age is before current age
    if (claimingAge < currentAge) continue;
    
    // Apply COLA to PIA until claiming age
    const colaAdjustedPIA = applyCOLAToClaimingAge(pia, currentAge, claimingAge, colaRate);
    
    // Calculate adjusted monthly benefit
    const adjustment = calculateBenefitAdjustment(claimingAge, fra);
    const monthlyBenefit = colaAdjustedPIA * adjustment;
    
    // Calculate lifetime benefits with ongoing COLA
    let lifetimeBenefits = 0;
    for (let age = claimingAge; age <= lifeExpectancy; age++) {
      const yearsSinceClaiming = age - claimingAge;
      const yearlyBenefit = monthlyBenefit * 12 * Math.pow(1 + colaRate, yearsSinceClaiming);
      lifetimeBenefits += yearlyBenefit;
    }
    
    scenarios.push({
      claimingAge,
      monthlyBenefit,
      lifetimeBenefits,
      breakEvenAge: 0, // Calculated below
      adjustedBenefit: adjustment,
    });
  }
  
  // Calculate breakeven ages (when later claiming beats earlier)
  for (let i = 1; i < scenarios.length; i++) {
    const earlier = scenarios[i - 1];
    const later = scenarios[i];
    
    // Find when cumulative benefits of later claiming exceed earlier
    let cumulativeEarlier = 0;
    let cumulativeLater = 0;
    
    for (let age = earlier.claimingAge; age <= 100; age++) {
      if (age >= earlier.claimingAge) {
        const yearsSinceEarlier = age - earlier.claimingAge;
        cumulativeEarlier += earlier.monthlyBenefit * 12 * Math.pow(1 + colaRate, yearsSinceEarlier);
      }
      
      if (age >= later.claimingAge) {
        const yearsSinceLater = age - later.claimingAge;
        cumulativeLater += later.monthlyBenefit * 12 * Math.pow(1 + colaRate, yearsSinceLater);
      }
      
      if (cumulativeLater > cumulativeEarlier && later.breakEvenAge === 0) {
        scenarios[i].breakEvenAge = age;
        break;
      }
    }
  }
  
  return scenarios;
}

/**
 * Get lifetime benefits for specific claiming ages (62, 67, 70)
 * for the comparison bar chart
 */
export function getLifetimeBenefitComparison(
  pia: number,
  fra: number,
  currentAge: number,
  lifeExpectancy: number,
  colaRate: number
): { age62: number; age67: number; age70: number } {
  const scenarios = calculateClaimingScenarios(pia, fra, currentAge, lifeExpectancy, colaRate);
  
  const age62 = scenarios.find(s => s.claimingAge === 62)?.lifetimeBenefits || 0;
  const age67 = scenarios.find(s => s.claimingAge === 67)?.lifetimeBenefits || 0;
  const age70 = scenarios.find(s => s.claimingAge === 70)?.lifetimeBenefits || 0;
  
  return { age62, age67, age70 };
}
