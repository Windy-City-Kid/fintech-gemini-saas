/**
 * 2026 IRS Contribution Limits
 * 
 * Sources: IRS Notice 2024-80 (projected)
 * Includes Super Catch-Up provisions for ages 60-63
 */

export interface ContributionLimit {
  base: number;
  catchUp: number; // Age 50+
  superCatchUp?: number; // Ages 60-63 only (SECURE 2.0)
  catchUpStartAge: number;
  superCatchUpAges?: [number, number]; // [start, end]
}

export interface IRSLimits {
  '401k': ContributionLimit;
  '403b': ContributionLimit;
  '457b': ContributionLimit;
  IRA: ContributionLimit;
  Roth: ContributionLimit;
  HSA: {
    individual: number;
    family: number;
    catchUp: number;
    catchUpStartAge: number;
  };
  SIMPLE: ContributionLimit;
  SEP_IRA: {
    maxPercentage: number;
    maxDollar: number;
  };
  rothCatchUpIncomeThreshold: number; // High earner threshold for mandatory Roth catch-up
}

/**
 * 2026 IRS Contribution Limits
 * Note: These are projected based on 2024/2025 inflation adjustments
 */
export const IRS_LIMITS_2026: IRSLimits = {
  '401k': {
    base: 24000,
    catchUp: 7500,
    superCatchUp: 11250, // SECURE 2.0 Super Catch-Up for ages 60-63
    catchUpStartAge: 50,
    superCatchUpAges: [60, 63],
  },
  '403b': {
    base: 24000,
    catchUp: 7500,
    superCatchUp: 11250,
    catchUpStartAge: 50,
    superCatchUpAges: [60, 63],
  },
  '457b': {
    base: 24000,
    catchUp: 7500,
    superCatchUp: 11250,
    catchUpStartAge: 50,
    superCatchUpAges: [60, 63],
  },
  IRA: {
    base: 7500,
    catchUp: 1000,
    catchUpStartAge: 50,
  },
  Roth: {
    base: 7500,
    catchUp: 1000,
    catchUpStartAge: 50,
  },
  HSA: {
    individual: 4400,
    family: 8750,
    catchUp: 1000,
    catchUpStartAge: 55,
  },
  SIMPLE: {
    base: 17600,
    catchUp: 3850,
    superCatchUp: 5350,
    catchUpStartAge: 50,
    superCatchUpAges: [60, 63],
  },
  SEP_IRA: {
    maxPercentage: 25, // 25% of net self-employment income
    maxDollar: 70000,
  },
  // SECURE 2.0: High earners must make catch-up contributions as Roth
  rothCatchUpIncomeThreshold: 150000,
};

/**
 * Calculate the maximum contribution limit for a given account type and age
 */
export function getContributionLimit(
  accountType: string,
  age: number,
  isHighEarner: boolean = false,
  hsaFamilyCoverage: boolean = false
): { maxContribution: number; catchUpAmount: number; isRothCatchUp: boolean; breakdown: string } {
  const normalizedType = normalizeAccountType(accountType);
  
  if (normalizedType === 'HSA') {
    const base = hsaFamilyCoverage ? IRS_LIMITS_2026.HSA.family : IRS_LIMITS_2026.HSA.individual;
    const catchUp = age >= IRS_LIMITS_2026.HSA.catchUpStartAge ? IRS_LIMITS_2026.HSA.catchUp : 0;
    return {
      maxContribution: base + catchUp,
      catchUpAmount: catchUp,
      isRothCatchUp: false,
      breakdown: `Base: $${base.toLocaleString()}${catchUp > 0 ? ` + Catch-up: $${catchUp.toLocaleString()}` : ''}`,
    };
  }
  
  if (normalizedType === 'SEP') {
    return {
      maxContribution: IRS_LIMITS_2026.SEP_IRA.maxDollar,
      catchUpAmount: 0,
      isRothCatchUp: false,
      breakdown: `Up to 25% of income, max $${IRS_LIMITS_2026.SEP_IRA.maxDollar.toLocaleString()}`,
    };
  }
  
  const limits = IRS_LIMITS_2026[normalizedType as keyof typeof IRS_LIMITS_2026] as ContributionLimit;
  if (!limits || typeof limits !== 'object' || !('base' in limits)) {
    // Default to IRA limits for unknown types
    const iraLimits = IRS_LIMITS_2026.IRA;
    const catchUp = age >= iraLimits.catchUpStartAge ? iraLimits.catchUp : 0;
    return {
      maxContribution: iraLimits.base + catchUp,
      catchUpAmount: catchUp,
      isRothCatchUp: false,
      breakdown: `Base: $${iraLimits.base.toLocaleString()}${catchUp > 0 ? ` + Catch-up: $${catchUp.toLocaleString()}` : ''}`,
    };
  }
  
  let catchUp = 0;
  let isSuperCatchUp = false;
  let isRothCatchUp = false;
  
  // Check if in Super Catch-Up age range (60-63)
  if (limits.superCatchUpAges && limits.superCatchUp) {
    const [startAge, endAge] = limits.superCatchUpAges;
    if (age >= startAge && age <= endAge) {
      catchUp = limits.superCatchUp;
      isSuperCatchUp = true;
    }
  }
  
  // Regular catch-up if not in Super Catch-Up range
  if (!isSuperCatchUp && age >= limits.catchUpStartAge) {
    catchUp = limits.catchUp;
  }
  
  // SECURE 2.0: High earners must make catch-up as Roth (401k/403b/457b only)
  if (isHighEarner && catchUp > 0 && ['401k', '403b', '457b'].includes(normalizedType)) {
    isRothCatchUp = true;
  }
  
  const maxContribution = limits.base + catchUp;
  
  let breakdown = `Base: $${limits.base.toLocaleString()}`;
  if (catchUp > 0) {
    if (isSuperCatchUp) {
      breakdown += ` + Super Catch-up (60-63): $${catchUp.toLocaleString()}`;
    } else {
      breakdown += ` + Catch-up (50+): $${catchUp.toLocaleString()}`;
    }
    if (isRothCatchUp) {
      breakdown += ' (must be Roth)';
    }
  }
  
  return {
    maxContribution,
    catchUpAmount: catchUp,
    isRothCatchUp,
    breakdown,
  };
}

/**
 * Calculate spousal IRA limits
 */
export function getSpousalIRALimit(
  primaryAge: number,
  spouseAge: number
): { combined: number; primary: number; spouse: number; breakdown: string } {
  const primaryLimit = getContributionLimit('IRA', primaryAge);
  const spouseLimit = getContributionLimit('IRA', spouseAge);
  
  return {
    combined: primaryLimit.maxContribution + spouseLimit.maxContribution,
    primary: primaryLimit.maxContribution,
    spouse: spouseLimit.maxContribution,
    breakdown: `Primary: $${primaryLimit.maxContribution.toLocaleString()} + Spouse: $${spouseLimit.maxContribution.toLocaleString()}`,
  };
}

/**
 * Validate a contribution amount against IRS limits
 */
export function validateContribution(
  accountType: string,
  amount: number,
  age: number,
  isHighEarner: boolean = false,
  hsaFamilyCoverage: boolean = false
): { isValid: boolean; maxAllowed: number; excess: number; warning?: string } {
  const { maxContribution, isRothCatchUp, breakdown } = getContributionLimit(
    accountType,
    age,
    isHighEarner,
    hsaFamilyCoverage
  );
  
  const isValid = amount <= maxContribution;
  const excess = Math.max(0, amount - maxContribution);
  
  let warning: string | undefined;
  
  if (!isValid) {
    warning = `Your planned ${accountType} contribution of $${amount.toLocaleString()} exceeds the 2026 IRS maximum of $${maxContribution.toLocaleString()}. The simulation will cap contributions at the limit.`;
  } else if (isRothCatchUp) {
    warning = `Note: As a high earner (income > $150K), your catch-up contributions must be made as Roth (post-tax) per SECURE 2.0.`;
  }
  
  return {
    isValid,
    maxAllowed: maxContribution,
    excess,
    warning,
  };
}

/**
 * Normalize account type string to match our limit keys
 */
function normalizeAccountType(type: string): string {
  const normalized = type.toLowerCase().trim();
  
  if (normalized.includes('401') || normalized === '401k') return '401k';
  if (normalized.includes('403')) return '403b';
  if (normalized.includes('457')) return '457b';
  if (normalized.includes('roth') && !normalized.includes('401')) return 'Roth';
  if (normalized.includes('ira') && !normalized.includes('sep') && !normalized.includes('simple')) return 'IRA';
  if (normalized.includes('sep')) return 'SEP';
  if (normalized.includes('simple')) return 'SIMPLE';
  if (normalized.includes('hsa')) return 'HSA';
  if (normalized.includes('brokerage') || normalized.includes('taxable')) return 'Brokerage';
  
  return type;
}

/**
 * Get all limits for display purposes
 */
export function getAllLimitsForAge(age: number, isHighEarner: boolean = false): Record<string, { max: number; breakdown: string }> {
  const accountTypes = ['401k', 'IRA', 'Roth', 'HSA'];
  const result: Record<string, { max: number; breakdown: string }> = {};
  
  for (const type of accountTypes) {
    const limit = getContributionLimit(type, age, isHighEarner, false);
    result[type] = {
      max: limit.maxContribution,
      breakdown: limit.breakdown,
    };
  }
  
  // Add HSA family option
  const hsaFamily = getContributionLimit('HSA', age, false, true);
  result['HSA (Family)'] = {
    max: hsaFamily.maxContribution,
    breakdown: hsaFamily.breakdown,
  };
  
  return result;
}
