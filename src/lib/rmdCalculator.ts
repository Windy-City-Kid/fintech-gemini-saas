/**
 * IRS Required Minimum Distribution (RMD) Calculator
 * 
 * Based on 2026 IRS Uniform Lifetime Table
 * SECURE Act 2.0: RMD age is 73 for those born 1951-1959, 75 for those born 1960+
 */

// IRS Uniform Lifetime Table (Distribution Periods)
export const RMD_DIVISORS: Record<number, number> = {
  72: 27.4,
  73: 26.5,
  74: 25.5,
  75: 24.6,
  76: 23.7,
  77: 22.9,
  78: 22.0,
  79: 21.1,
  80: 20.2,
  81: 19.4,
  82: 18.5,
  83: 17.7,
  84: 16.8,
  85: 16.0,
  86: 15.2,
  87: 14.4,
  88: 13.7,
  89: 12.9,
  90: 12.2,
  91: 11.5,
  92: 10.8,
  93: 10.1,
  94: 9.5,
  95: 8.9,
  96: 8.4,
  97: 7.8,
  98: 7.3,
  99: 6.8,
  100: 6.4,
  101: 6.0,
  102: 5.6,
  103: 5.2,
  104: 4.9,
  105: 4.6,
  106: 4.3,
  107: 4.1,
  108: 3.9,
  109: 3.7,
  110: 3.5,
  111: 3.4,
  112: 3.3,
  113: 3.1,
  114: 3.0,
  115: 2.9,
  116: 2.8,
  117: 2.7,
  118: 2.5,
  119: 2.3,
  120: 2.0,
};

export interface RMDStartAge {
  age: 73 | 75;
  reason: string;
}

/**
 * Determine RMD starting age based on birth year (SECURE Act 2.0)
 */
export function getRMDStartAge(birthYear: number): RMDStartAge {
  if (birthYear <= 1959) {
    return { age: 73, reason: 'Born 1951-1959: RMDs begin at age 73' };
  }
  return { age: 75, reason: 'Born 1960+: RMDs begin at age 75' };
}

export interface RMDCalculation {
  year: number;
  age: number;
  priorYearBalance: number;
  divisor: number;
  rmdAmount: number;
  cumulativeRMD: number;
}

/**
 * Calculate single year RMD
 */
export function calculateRMD(age: number, priorYearBalance: number): number {
  if (age < 72 || priorYearBalance <= 0) return 0;
  
  const cappedAge = Math.min(age, 120);
  const divisor = RMD_DIVISORS[cappedAge] || 2.0;
  
  return priorYearBalance / divisor;
}

/**
 * Project RMDs from current age to specified end age
 */
export function projectRMDs(
  currentAge: number,
  birthYear: number,
  currentIRABalance: number,
  current401kBalance: number,
  expectedReturn: number = 0.06,
  inflationRate: number = 0.025,
  endAge: number = 100
): RMDCalculation[] {
  const rmdStartAge = getRMDStartAge(birthYear).age;
  const totalBalance = currentIRABalance + current401kBalance;
  
  if (totalBalance <= 0) return [];
  
  const projections: RMDCalculation[] = [];
  let balance = totalBalance;
  let cumulativeRMD = 0;
  const currentYear = new Date().getFullYear();
  
  for (let age = currentAge; age <= endAge; age++) {
    const year = currentYear + (age - currentAge);
    
    // Before RMD age, just grow the balance
    if (age < rmdStartAge) {
      balance = balance * (1 + expectedReturn);
      continue;
    }
    
    // Calculate RMD based on prior year-end balance
    const priorYearBalance = balance;
    const divisor = RMD_DIVISORS[Math.min(age, 120)] || 2.0;
    const rmdAmount = priorYearBalance / divisor;
    
    cumulativeRMD += rmdAmount;
    
    projections.push({
      year,
      age,
      priorYearBalance,
      divisor,
      rmdAmount,
      cumulativeRMD,
    });
    
    // Update balance: subtract RMD, then apply growth
    balance = (priorYearBalance - rmdAmount) * (1 + expectedReturn);
  }
  
  return projections;
}

export interface RMDSummary {
  rmdStartAge: number;
  firstRMDYear: number;
  estimatedFirstRMD: number;
  lifetimeRMD: number;
  peakRMDAge: number;
  peakRMDAmount: number;
}

/**
 * Get RMD summary statistics
 */
export function getRMDSummary(
  currentAge: number,
  birthYear: number,
  currentIRABalance: number,
  current401kBalance: number,
  expectedReturn: number = 0.06
): RMDSummary {
  const projections = projectRMDs(
    currentAge,
    birthYear,
    currentIRABalance,
    current401kBalance,
    expectedReturn,
    0.025,
    100
  );
  
  if (projections.length === 0) {
    const rmdStartAge = getRMDStartAge(birthYear).age;
    return {
      rmdStartAge,
      firstRMDYear: new Date().getFullYear() + (rmdStartAge - currentAge),
      estimatedFirstRMD: 0,
      lifetimeRMD: 0,
      peakRMDAge: rmdStartAge,
      peakRMDAmount: 0,
    };
  }
  
  const peakRMD = projections.reduce((max, p) => 
    p.rmdAmount > max.rmdAmount ? p : max, projections[0]
  );
  
  return {
    rmdStartAge: projections[0].age,
    firstRMDYear: projections[0].year,
    estimatedFirstRMD: projections[0].rmdAmount,
    lifetimeRMD: projections[projections.length - 1].cumulativeRMD,
    peakRMDAge: peakRMD.age,
    peakRMDAmount: peakRMD.rmdAmount,
  };
}

/**
 * Calculate RMD impact on MAGI for IRMAA purposes
 */
export function getRMDImpactOnMAGI(
  age: number,
  iraBalance: number,
  otherIncome: number,
  socialSecurityIncome: number
): {
  rmdAmount: number;
  estimatedMAGI: number;
  irmaaImpact: boolean;
  bracket: string;
} {
  const rmdAmount = calculateRMD(age, iraBalance);
  
  // Simplified MAGI calculation (RMDs are fully taxable)
  const estimatedMAGI = otherIncome + rmdAmount + (socialSecurityIncome * 0.85);
  
  // 2026 IRMAA thresholds (projected)
  let bracket = 'Standard';
  let irmaaImpact = false;
  
  if (estimatedMAGI > 500000) {
    bracket = 'IRMAA Tier 5 (Highest)';
    irmaaImpact = true;
  } else if (estimatedMAGI > 403000) {
    bracket = 'IRMAA Tier 4';
    irmaaImpact = true;
  } else if (estimatedMAGI > 306000) {
    bracket = 'IRMAA Tier 3';
    irmaaImpact = true;
  } else if (estimatedMAGI > 204000) {
    bracket = 'IRMAA Tier 2';
    irmaaImpact = true;
  } else if (estimatedMAGI > 103000) {
    bracket = 'IRMAA Tier 1';
    irmaaImpact = true;
  }
  
  return {
    rmdAmount,
    estimatedMAGI,
    irmaaImpact,
    bracket,
  };
}
