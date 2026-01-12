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
