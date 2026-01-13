/**
 * Medicare & IRMAA Surcharge Calculator
 * 
 * 2026 Part B Premium Brackets based on MAGI (Modified Adjusted Gross Income)
 * IRMAA = Income-Related Monthly Adjustment Amount
 */

// ============= 2026 BASELINE CONSTANTS =============

/** Standard Medicare Part B premium for 2026 */
export const MEDICARE_PART_B_STANDARD = 202.90;

/** Medicare Part D base premium (approximate) */
export const MEDICARE_PART_D_BASE = 35.00;

/** Historical medical inflation rate (1985-2024 average) */
export const MEDICAL_INFLATION_HISTORICAL = 0.0336; // 3.36%

/** 2026 projected medical inflation (elevated) */
export const MEDICAL_INFLATION_2026_PROJECTION = 0.092; // 9.2%

// ============= IRMAA BRACKET DEFINITIONS =============

export interface IRMAABracket {
  singleMin: number;
  singleMax: number;
  jointMin: number;
  jointMax: number;
  partBMonthly: number;
  partDSurcharge: number; // Additional amount added to Part D base
  label: string;
}

/**
 * 2026 IRMAA brackets for Medicare Part B and Part D
 * Based on MAGI from tax return 2 years prior
 */
export const IRMAA_BRACKETS_2026: IRMAABracket[] = [
  {
    singleMin: 0,
    singleMax: 109000,
    jointMin: 0,
    jointMax: 218000,
    partBMonthly: 202.90,
    partDSurcharge: 0,
    label: 'Standard',
  },
  {
    singleMin: 109000,
    singleMax: 137000,
    jointMin: 218000,
    jointMax: 274000,
    partBMonthly: 284.10,
    partDSurcharge: 13.70,
    label: 'Tier 1',
  },
  {
    singleMin: 137000,
    singleMax: 171000,
    jointMin: 274000,
    jointMax: 342000,
    partBMonthly: 405.80,
    partDSurcharge: 35.30,
    label: 'Tier 2',
  },
  {
    singleMin: 171000,
    singleMax: 205000,
    jointMin: 342000,
    jointMax: 410000,
    partBMonthly: 527.50,
    partDSurcharge: 57.00,
    label: 'Tier 3',
  },
  {
    singleMin: 205000,
    singleMax: 500000,
    jointMin: 410000,
    jointMax: 750000,
    partBMonthly: 649.20,
    partDSurcharge: 78.60,
    label: 'Tier 4',
  },
  {
    singleMin: 500000,
    singleMax: Infinity,
    jointMin: 750000,
    jointMax: Infinity,
    partBMonthly: 678.00,
    partDSurcharge: 85.00,
    label: 'Tier 5 (Max)',
  },
];

// ============= MAGI CALCULATION =============

export interface IncomeSourcesForMAGI {
  socialSecurityIncome: number;     // Annual SS benefits
  pensionIncome: number;            // Annual pension/annuity
  rmdAmount: number;                // Required Minimum Distribution from IRAs/401k
  investmentIncome: number;         // Dividends, capital gains, interest
  otherTaxableIncome: number;       // Any other taxable income
  taxExemptInterest: number;        // Municipal bond interest (added back for MAGI)
}

/**
 * Calculate Modified Adjusted Gross Income (MAGI) for IRMAA determination
 * MAGI = AGI + tax-exempt interest + certain deductions added back
 */
export function calculateMAGI(sources: IncomeSourcesForMAGI): number {
  // Simplified MAGI calculation
  // Note: Only ~85% of SS is typically taxable, but for IRMAA purposes we use full amount
  const ssIncludedInMAGI = sources.socialSecurityIncome * 0.85;
  
  return (
    ssIncludedInMAGI +
    sources.pensionIncome +
    sources.rmdAmount +
    sources.investmentIncome +
    sources.otherTaxableIncome +
    sources.taxExemptInterest
  );
}

// ============= IRMAA BRACKET DETERMINATION =============

export interface IRMAAResult {
  bracket: IRMAABracket;
  monthlyPartB: number;
  monthlyPartD: number;
  annualPremium: number;
  surchargeAmount: number;  // Amount above standard
  isAboveStandard: boolean;
}

/**
 * Determine IRMAA bracket and premiums based on MAGI
 */
export function calculateIRMAA(
  magi: number,
  isMarried: boolean,
  partDBase: number = MEDICARE_PART_D_BASE
): IRMAAResult {
  let matchedBracket = IRMAA_BRACKETS_2026[0]; // Default to standard
  
  for (const bracket of IRMAA_BRACKETS_2026) {
    const min = isMarried ? bracket.jointMin : bracket.singleMin;
    const max = isMarried ? bracket.jointMax : bracket.singleMax;
    
    if (magi >= min && magi < max) {
      matchedBracket = bracket;
      break;
    }
    
    // If we've exceeded all brackets, use the highest
    if (magi >= max) {
      matchedBracket = bracket;
    }
  }
  
  const monthlyPartB = matchedBracket.partBMonthly;
  const monthlyPartD = partDBase + matchedBracket.partDSurcharge;
  const annualPremium = (monthlyPartB + monthlyPartD) * 12;
  const standardAnnual = (MEDICARE_PART_B_STANDARD + partDBase) * 12;
  
  return {
    bracket: matchedBracket,
    monthlyPartB,
    monthlyPartD,
    annualPremium,
    surchargeAmount: annualPremium - standardAnnual,
    isAboveStandard: matchedBracket.partBMonthly > MEDICARE_PART_B_STANDARD,
  };
}

// ============= MEDICAL INFLATION PROJECTION =============

/**
 * Apply medical inflation to Medicare premiums over time
 */
export function projectMedicareCosts(
  baseYearCost: number,
  yearsFromBase: number,
  medicalInflationRate: number = MEDICAL_INFLATION_HISTORICAL
): number {
  return baseYearCost * Math.pow(1 + medicalInflationRate, yearsFromBase);
}

/**
 * Calculate annual Medicare costs for a simulation year
 * Includes IRMAA determination and medical inflation
 */
export function calculateAnnualMedicareCost(
  simulationYear: number,
  magi: number,
  isMarried: boolean,
  medicalInflationRate: number,
  isMedicareEligible: boolean = true
): {
  annualCost: number;
  irmaaResult: IRMAAResult;
  inflatedCost: number;
} {
  if (!isMedicareEligible) {
    return {
      annualCost: 0,
      irmaaResult: {
        bracket: IRMAA_BRACKETS_2026[0],
        monthlyPartB: 0,
        monthlyPartD: 0,
        annualPremium: 0,
        surchargeAmount: 0,
        isAboveStandard: false,
      },
      inflatedCost: 0,
    };
  }
  
  // Calculate IRMAA based on current MAGI
  const irmaaResult = calculateIRMAA(magi, isMarried);
  
  // Apply medical inflation from 2026 baseline
  const inflatedCost = projectMedicareCosts(
    irmaaResult.annualPremium,
    simulationYear,
    medicalInflationRate
  );
  
  return {
    annualCost: irmaaResult.annualPremium,
    irmaaResult,
    inflatedCost,
  };
}

// ============= RMD CALCULATION (SIMPLIFIED) =============

/**
 * IRS Uniform Lifetime Table divisors (simplified)
 * Used to calculate Required Minimum Distributions
 */
const RMD_DIVISORS: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6,
  76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7,
  84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5,
  92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
};

/**
 * Calculate Required Minimum Distribution for a given age and IRA balance
 * RMD age is 73 as of 2023 (SECURE 2.0 Act)
 */
export function calculateRMD(age: number, iraBalance: number): number {
  if (age < 73) return 0;
  
  // Get divisor, use age 95 for ages beyond table
  const divisor = RMD_DIVISORS[age] || RMD_DIVISORS[95] || 8.9;
  
  return iraBalance / divisor;
}

// ============= IRMAA PROJECTION FOR UI =============

export interface IRMAAProjection {
  age: number;
  year: number;
  estimatedMAGI: number;
  bracket: string;
  monthlyPremium: number;
  annualPremium: number;
  surcharge: number;
  isHighBracket: boolean;
}

/**
 * Project IRMAA impacts over retirement years
 * Used for the "Medical Cost Watch" dashboard
 */
export function projectIRMAAImpacts(
  currentAge: number,
  retirementAge: number,
  ssAnnualBenefit: number,
  pensionIncome: number,
  estimatedIRABalance: number,
  investmentIncome: number,
  isMarried: boolean,
  medicalInflationRate: number,
  simulationYears: number = 30
): IRMAAProjection[] {
  const projections: IRMAAProjection[] = [];
  const currentYear = new Date().getFullYear();
  
  for (let year = 0; year < simulationYears; year++) {
    const age = currentAge + year;
    const calendarYear = currentYear + year;
    
    // Skip if not Medicare eligible (before 65)
    if (age < 65) continue;
    
    // Estimate IRA balance with modest growth
    const projectedIRABalance = estimatedIRABalance * Math.pow(1.05, year);
    
    // Calculate RMD if applicable
    const rmdAmount = calculateRMD(age, projectedIRABalance);
    
    // Inflate SS and pension with COLA (simplified)
    const colaRate = 0.025;
    const inflatedSS = ssAnnualBenefit * Math.pow(1 + colaRate, year);
    const inflatedPension = pensionIncome * Math.pow(1.02, year);
    
    // Calculate MAGI
    const magi = calculateMAGI({
      socialSecurityIncome: age >= retirementAge ? inflatedSS : 0,
      pensionIncome: age >= retirementAge ? inflatedPension : 0,
      rmdAmount,
      investmentIncome: investmentIncome * Math.pow(1.03, year),
      otherTaxableIncome: 0,
      taxExemptInterest: 0,
    });
    
    // Calculate IRMAA
    const irmaa = calculateIRMAA(magi, isMarried);
    
    // Apply medical inflation
    const inflatedPremium = projectMedicareCosts(
      irmaa.annualPremium,
      year,
      medicalInflationRate
    );
    
    projections.push({
      age,
      year: calendarYear,
      estimatedMAGI: magi,
      bracket: irmaa.bracket.label,
      monthlyPremium: inflatedPremium / 12,
      annualPremium: inflatedPremium,
      surcharge: irmaa.surchargeAmount * Math.pow(1 + medicalInflationRate, year),
      isHighBracket: irmaa.bracket.label !== 'Standard',
    });
  }
  
  return projections;
}

// ============= 2026 HEALTH STATUS ENGINE =============

export type HealthCondition = 'excellent' | 'good' | 'poor';
export type MedicareChoice = 'advantage' | 'medigap';

/** Health condition incidentals budget per year */
export const HEALTH_INCIDENTALS: Record<HealthCondition, number> = {
  excellent: 1000,  // Dental/vision/hearing only
  good: 4000,       // Coinsurance and deductibles
  poor: 10000,      // Higher utilization + Part D cap hit
};

/** Part D prescription drug out-of-pocket cap (triggered for poor health) */
export const PART_D_PRESCRIPTION_CAP = 2100;

/** End-of-life cost multiplier (final 3 years before target age) */
export const END_OF_LIFE_MULTIPLIER = 2.5; // 150% increase = 2.5x baseline

export interface HealthcareBreakdown {
  monthlyPartBPremium: number;
  monthlyPartDPremium: number;
  totalMonthlyPremiums: number;
  annualPremiums: number;
  annualIncidentals: number;
  partDCap: number;
  totalAnnualLiability: number;
  healthMultiplier: number;
  isEndOfLife: boolean;
  endOfLifeMultiplier: number;
}

/**
 * Calculate comprehensive healthcare breakdown based on health status
 */
export function calculateHealthcareBreakdown(
  healthCondition: HealthCondition,
  medicareChoice: MedicareChoice,
  magi: number,
  isMarried: boolean,
  currentAge: number,
  targetAge: number = 100,
  yearsFromBase: number = 0,
  medicalInflationRate: number = MEDICAL_INFLATION_HISTORICAL
): HealthcareBreakdown {
  // Skip if not Medicare eligible
  if (currentAge < 65) {
    return {
      monthlyPartBPremium: 0,
      monthlyPartDPremium: 0,
      totalMonthlyPremiums: 0,
      annualPremiums: 0,
      annualIncidentals: 0,
      partDCap: 0,
      totalAnnualLiability: 0,
      healthMultiplier: 1.0,
      isEndOfLife: false,
      endOfLifeMultiplier: 1.0,
    };
  }

  // Get IRMAA-adjusted premiums
  const irmaa = calculateIRMAA(magi, isMarried);
  
  // Apply medical inflation
  const inflatedPartB = projectMedicareCosts(irmaa.monthlyPartB, yearsFromBase, medicalInflationRate);
  const inflatedPartD = projectMedicareCosts(irmaa.monthlyPartD, yearsFromBase, medicalInflationRate);
  
  // Medigap Plan G typically costs ~$150-250/mo more than MA
  const medigapSurcharge = medicareChoice === 'medigap' ? 175 : 0;
  
  const monthlyPartBPremium = inflatedPartB;
  const monthlyPartDPremium = inflatedPartD + medigapSurcharge;
  const totalMonthlyPremiums = monthlyPartBPremium + monthlyPartDPremium;
  const annualPremiums = totalMonthlyPremiums * 12;
  
  // Health condition incidentals (inflate over time)
  const baseIncidentals = HEALTH_INCIDENTALS[healthCondition];
  const annualIncidentals = projectMedicareCosts(baseIncidentals, yearsFromBase, medicalInflationRate);
  
  // Part D cap applies to poor health
  const partDCap = healthCondition === 'poor' 
    ? projectMedicareCosts(PART_D_PRESCRIPTION_CAP, yearsFromBase, medicalInflationRate)
    : 0;
  
  // End-of-life spike: final 3 years before target age
  const yearsToTarget = targetAge - currentAge;
  const isEndOfLife = yearsToTarget <= 3 && yearsToTarget >= 0;
  const endOfLifeMultiplier = isEndOfLife ? END_OF_LIFE_MULTIPLIER : 1.0;
  
  // Health condition multiplier affects incidentals
  const healthMultiplier = healthCondition === 'excellent' ? 0.8 
    : healthCondition === 'poor' ? 1.2 
    : 1.0;
  
  // Calculate total with all factors
  const baseLiability = annualPremiums + annualIncidentals + partDCap;
  const totalAnnualLiability = baseLiability * endOfLifeMultiplier;
  
  return {
    monthlyPartBPremium,
    monthlyPartDPremium,
    totalMonthlyPremiums,
    annualPremiums,
    annualIncidentals,
    partDCap,
    totalAnnualLiability,
    healthMultiplier,
    isEndOfLife,
    endOfLifeMultiplier,
  };
}

/**
 * Get baseline Medicare costs for a person at age 65 with standard MAGI
 */
export function getBaselineMedicareCosts(
  healthCondition: HealthCondition,
  medicareChoice: MedicareChoice
): HealthcareBreakdown {
  return calculateHealthcareBreakdown(
    healthCondition,
    medicareChoice,
    100000, // Standard MAGI (no IRMAA)
    true,   // Married
    65,     // Medicare start age
    100,    // Target longevity
    0,      // No inflation yet
    MEDICAL_INFLATION_HISTORICAL
  );
}

/**
 * Project Medicare costs over simulation period
 */
export function projectMedicareHealthCosts(
  healthCondition: HealthCondition,
  medicareChoice: MedicareChoice,
  currentAge: number,
  targetAge: number,
  magi: number,
  isMarried: boolean,
  medicalInflationRate: number = MEDICAL_INFLATION_HISTORICAL
): { age: number; annualCost: number; isEndOfLife: boolean }[] {
  const projections: { age: number; annualCost: number; isEndOfLife: boolean }[] = [];
  
  for (let age = Math.max(65, currentAge); age <= targetAge; age++) {
    const yearsFromBase = age - 65;
    const breakdown = calculateHealthcareBreakdown(
      healthCondition,
      medicareChoice,
      magi,
      isMarried,
      age,
      targetAge,
      yearsFromBase,
      medicalInflationRate
    );
    
    projections.push({
      age,
      annualCost: breakdown.totalAnnualLiability,
      isEndOfLife: breakdown.isEndOfLife,
    });
  }
  
  return projections;
}

// ============= SIMULATION INTEGRATION =============

export interface SimulationHealthcareParams {
  healthCondition: HealthCondition;
  medicareChoice: MedicareChoice;
  isMarried: boolean;
  medicalInflationRate: number;
  targetAge: number;
}

export interface AnnualHealthcareCost {
  basePremiums: number;
  irmaaSurcharge: number;
  outOfPocket: number;
  partDCap: number;
  endOfLifeMultiplier: number;
  totalCost: number;
  irmaaResult: IRMAAResult;
  isEndOfLife: boolean;
}

/**
 * Calculate healthcare costs for a specific simulation year
 * Used by Monte Carlo engine with dynamic MAGI lookback
 */
export function calculateSimulationHealthcareCost(
  age: number,
  magiFromPriorYear: number, // IRMAA uses 2-year lookback, simulation uses prior year estimate
  params: SimulationHealthcareParams
): AnnualHealthcareCost {
  // Not Medicare eligible before 65
  if (age < 65) {
    return {
      basePremiums: 0,
      irmaaSurcharge: 0,
      outOfPocket: 0,
      partDCap: 0,
      endOfLifeMultiplier: 1.0,
      totalCost: 0,
      isEndOfLife: false,
      irmaaResult: {
        bracket: IRMAA_BRACKETS_2026[0],
        monthlyPartB: 0,
        monthlyPartD: 0,
        annualPremium: 0,
        surchargeAmount: 0,
        isAboveStandard: false,
      },
    };
  }

  const yearsFromBase = age - 65;
  
  // Calculate IRMAA based on prior year MAGI (2-year lookback in reality)
  const irmaaResult = calculateIRMAA(magiFromPriorYear, params.isMarried);
  
  // Base premiums with medical inflation
  const basePartB = projectMedicareCosts(MEDICARE_PART_B_STANDARD, yearsFromBase, params.medicalInflationRate);
  const basePartD = projectMedicareCosts(MEDICARE_PART_D_BASE, yearsFromBase, params.medicalInflationRate);
  const basePremiums = (basePartB + basePartD) * 12;
  
  // IRMAA surcharge (already includes inflation-adjusted amounts)
  const inflatedPartB = projectMedicareCosts(irmaaResult.monthlyPartB, yearsFromBase, params.medicalInflationRate);
  const inflatedPartD = projectMedicareCosts(irmaaResult.monthlyPartD, yearsFromBase, params.medicalInflationRate);
  const irmaaSurcharge = ((inflatedPartB - basePartB) + (inflatedPartD - basePartD)) * 12;
  
  // Medigap surcharge if applicable
  const medigapCost = params.medicareChoice === 'medigap' 
    ? projectMedicareCosts(175, yearsFromBase, params.medicalInflationRate) * 12 
    : 0;
  
  // Out-of-pocket based on health condition
  const baseOOP = HEALTH_INCIDENTALS[params.healthCondition];
  const outOfPocket = projectMedicareCosts(baseOOP, yearsFromBase, params.medicalInflationRate);
  
  // Part D cap for poor health
  const partDCap = params.healthCondition === 'poor'
    ? projectMedicareCosts(PART_D_PRESCRIPTION_CAP, yearsFromBase, params.medicalInflationRate)
    : 0;
  
  // End-of-life spike: final 3-5 years (using 5 for simulation)
  const yearsToTarget = params.targetAge - age;
  const isEndOfLife = yearsToTarget <= 5 && yearsToTarget >= 0;
  const endOfLifeMultiplier = isEndOfLife ? END_OF_LIFE_MULTIPLIER : 1.0;
  
  // Calculate total
  const preTotalCost = basePremiums + irmaaSurcharge + medigapCost + outOfPocket + partDCap;
  const totalCost = preTotalCost * endOfLifeMultiplier;
  
  return {
    basePremiums: basePremiums + medigapCost,
    irmaaSurcharge,
    outOfPocket,
    partDCap,
    endOfLifeMultiplier,
    totalCost,
    isEndOfLife,
    irmaaResult,
  };
}

// ============= IRMAA BRACKET CHANGE DETECTION =============

export interface IRMAABracketChange {
  previousBracket: IRMAABracket;
  newBracket: IRMAABracket;
  annualPremiumIncrease: number;
  magiThresholdExceeded: number;
  triggerAmount: number; // How much the income exceeded the threshold
}

/**
 * Check if a proposed income change would push user into higher IRMAA bracket
 * Used for Roth conversion and RMD planning alerts
 */
export function checkIRMAABracketChange(
  currentMAGI: number,
  proposedIncomeIncrease: number,
  isMarried: boolean
): IRMAABracketChange | null {
  const currentIRMAA = calculateIRMAA(currentMAGI, isMarried);
  const newMAGI = currentMAGI + proposedIncomeIncrease;
  const newIRMAA = calculateIRMAA(newMAGI, isMarried);
  
  // No change in bracket
  if (currentIRMAA.bracket.label === newIRMAA.bracket.label) {
    return null;
  }
  
  // Find which threshold was exceeded
  const thresholdExceeded = isMarried 
    ? newIRMAA.bracket.jointMin 
    : newIRMAA.bracket.singleMin;
  
  return {
    previousBracket: currentIRMAA.bracket,
    newBracket: newIRMAA.bracket,
    annualPremiumIncrease: newIRMAA.annualPremium - currentIRMAA.annualPremium,
    magiThresholdExceeded: thresholdExceeded,
    triggerAmount: newMAGI - thresholdExceeded,
  };
}

/**
 * Get the nearest IRMAA bracket threshold above current MAGI
 * Useful for showing "headroom" before next bracket
 */
export function getNextIRMAAThreshold(
  currentMAGI: number,
  isMarried: boolean
): { threshold: number; headroom: number; nextBracketLabel: string } | null {
  const currentBracketIndex = IRMAA_BRACKETS_2026.findIndex((bracket, i) => {
    const min = isMarried ? bracket.jointMin : bracket.singleMin;
    const max = isMarried ? bracket.jointMax : bracket.singleMax;
    return currentMAGI >= min && currentMAGI < max;
  });
  
  // Already at highest bracket
  if (currentBracketIndex === IRMAA_BRACKETS_2026.length - 1) {
    return null;
  }
  
  const nextBracket = IRMAA_BRACKETS_2026[currentBracketIndex + 1];
  const threshold = isMarried ? nextBracket.jointMin : nextBracket.singleMin;
  
  return {
    threshold,
    headroom: threshold - currentMAGI,
    nextBracketLabel: nextBracket.label,
  };
}

// ============= HEALTHCARE PROJECTION FOR CHARTS =============

export interface HealthcareProjectionPoint {
  age: number;
  year: number;
  basePremiums: number;
  irmaaSurcharge: number;
  outOfPocket: number;
  endOfLifeSurge: number;
  total: number;
  isEndOfLife: boolean;
  irmaaBracket: string;
}

/**
 * Generate comprehensive healthcare projection for visualization
 * Age 65 to targetAge with all cost components separated
 */
export function generateHealthcareProjection(
  currentAge: number,
  targetAge: number,
  baseMAGI: number,
  annualMAGIGrowth: number, // e.g., 0.02 for 2% annual growth
  healthCondition: HealthCondition,
  medicareChoice: MedicareChoice,
  isMarried: boolean,
  medicalInflationRate: number = MEDICAL_INFLATION_HISTORICAL
): HealthcareProjectionPoint[] {
  const projections: HealthcareProjectionPoint[] = [];
  const currentYear = new Date().getFullYear();
  const startAge = Math.max(65, currentAge);
  
  for (let age = startAge; age <= targetAge; age++) {
    const yearsFromNow = age - currentAge;
    const year = currentYear + yearsFromNow;
    
    // Project MAGI with growth
    const projectedMAGI = baseMAGI * Math.pow(1 + annualMAGIGrowth, yearsFromNow);
    
    const params: SimulationHealthcareParams = {
      healthCondition,
      medicareChoice,
      isMarried,
      medicalInflationRate,
      targetAge,
    };
    
    const costs = calculateSimulationHealthcareCost(age, projectedMAGI, params);
    
    // Separate end-of-life surge from base costs for chart
    const baseTotalWithoutEOL = costs.basePremiums + costs.irmaaSurcharge + costs.outOfPocket + costs.partDCap;
    const endOfLifeSurge = costs.isEndOfLife ? baseTotalWithoutEOL * (costs.endOfLifeMultiplier - 1) : 0;
    
    projections.push({
      age,
      year,
      basePremiums: costs.basePremiums,
      irmaaSurcharge: costs.irmaaSurcharge,
      outOfPocket: costs.outOfPocket + costs.partDCap,
      endOfLifeSurge,
      total: costs.totalCost,
      isEndOfLife: costs.isEndOfLife,
      irmaaBracket: costs.irmaaResult.bracket.label,
    });
  }
  
  return projections;
}
