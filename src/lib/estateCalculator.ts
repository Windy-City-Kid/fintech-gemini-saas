/**
 * Estate Tax Calculator
 * 2026 Federal Estate Tax & State-specific estate/inheritance taxes
 */

// 2026 Federal Estate Tax Constants
export const FEDERAL_ESTATE_EXEMPTION_2026 = 15_000_000; // $15M per person
export const FEDERAL_ESTATE_TAX_RATE = 0.40; // 40% on amounts over exemption

// States with Estate or Inheritance Taxes (2026 estimates)
export const STATE_ESTATE_TAXES: Record<string, {
  type: 'estate' | 'inheritance' | 'both';
  exemption: number;
  topRate: number;
  brackets?: { threshold: number; rate: number }[];
}> = {
  CT: { type: 'estate', exemption: 13_610_000, topRate: 0.12 },
  DC: { type: 'estate', exemption: 4_710_970, topRate: 0.16 },
  HI: { type: 'estate', exemption: 5_490_000, topRate: 0.20 },
  IL: { type: 'estate', exemption: 4_000_000, topRate: 0.16 },
  IA: { type: 'inheritance', exemption: 0, topRate: 0.06 }, // Class B/C heirs only
  KY: { type: 'inheritance', exemption: 1_000, topRate: 0.16 },
  ME: { type: 'estate', exemption: 6_410_000, topRate: 0.12 },
  MD: { type: 'both', exemption: 5_000_000, topRate: 0.16 },
  MA: { type: 'estate', exemption: 2_000_000, topRate: 0.16 },
  MN: { type: 'estate', exemption: 3_000_000, topRate: 0.16 },
  NE: { type: 'inheritance', exemption: 100_000, topRate: 0.18 },
  NJ: { type: 'inheritance', exemption: 0, topRate: 0.16 }, // Class C/D heirs
  NY: { type: 'estate', exemption: 6_940_000, topRate: 0.16 },
  OR: { type: 'estate', exemption: 1_000_000, topRate: 0.16 },
  PA: { type: 'inheritance', exemption: 0, topRate: 0.15 },
  RI: { type: 'estate', exemption: 1_774_583, topRate: 0.16 },
  VT: { type: 'estate', exemption: 5_000_000, topRate: 0.16 },
  WA: { type: 'estate', exemption: 2_193_000, topRate: 0.20 },
};

export interface EstateAsset {
  name: string;
  value: number;
  costBasis: number;
  type: 'ira' | 'roth' | '401k' | 'brokerage' | 'real_estate' | 'cash' | 'other';
  accountId?: string;
}

export interface Beneficiary {
  name: string;
  relationship: 'spouse' | 'child' | 'sibling' | 'other';
  percentage: number;
}

export interface CharitableBequest {
  name: string;
  amount: number;
  isPercentage: boolean;
}

export interface EstateProjectionParams {
  totalAssets: number;
  stateCode: string;
  isMarried: boolean;
  charitableBequests: CharitableBequest[];
  assets: EstateAsset[];
  beneficiaries: Beneficiary[];
}

export interface EstateProjectionResult {
  grossEstate: number;
  charitableDeductions: number;
  taxableEstate: number;
  federalEstateTax: number;
  stateEstateTax: number;
  totalEstateTax: number;
  netToHeirs: number;
  stepUpBasis: number;
  traditionalIraBalance: number;
  heir10YearTaxEstimate: number;
  assetBreakdown: {
    toTaxes: number;
    toHeirs: number;
    toCharity: number;
  };
}

/**
 * Calculate federal estate tax
 */
export function calculateFederalEstateTax(
  taxableEstate: number,
  isMarried: boolean
): number {
  // Married couples can use portability (doubled exemption if spouse predeceased)
  const exemption = isMarried ? FEDERAL_ESTATE_EXEMPTION_2026 * 2 : FEDERAL_ESTATE_EXEMPTION_2026;
  
  if (taxableEstate <= exemption) {
    return 0;
  }
  
  return (taxableEstate - exemption) * FEDERAL_ESTATE_TAX_RATE;
}

/**
 * Calculate state estate/inheritance tax
 */
export function calculateStateEstateTax(
  taxableEstate: number,
  stateCode: string
): number {
  const stateTax = STATE_ESTATE_TAXES[stateCode];
  
  if (!stateTax) {
    return 0; // State has no estate/inheritance tax
  }
  
  if (taxableEstate <= stateTax.exemption) {
    return 0;
  }
  
  // Simplified: Apply top rate to amount over exemption
  // In reality, most states have graduated brackets
  return (taxableEstate - stateTax.exemption) * stateTax.topRate;
}

/**
 * Calculate step-up in basis for inherited assets
 */
export function calculateStepUpBasis(assets: EstateAsset[]): number {
  return assets
    .filter(a => a.type === 'brokerage' || a.type === 'real_estate')
    .reduce((sum, asset) => {
      const unrealizedGain = asset.value - asset.costBasis;
      return sum + Math.max(0, unrealizedGain);
    }, 0);
}

/**
 * Estimate heir tax liability for inherited IRAs (10-year rule)
 * Non-spouse beneficiaries must empty inherited IRAs within 10 years
 */
export function calculateHeir10YearTaxLiability(
  traditionalBalance: number,
  hasSpouseBeneficiary: boolean,
  estimatedHeirMarginalRate: number = 0.32 // Assume 32% bracket
): number {
  if (hasSpouseBeneficiary) {
    // Spouse can roll over to own IRA, no immediate tax
    return 0;
  }
  
  // Non-spouse heirs must distribute over 10 years
  // Estimate tax as balance * marginal rate
  return traditionalBalance * estimatedHeirMarginalRate;
}

/**
 * Full estate projection
 */
export function projectEstate(params: EstateProjectionParams): EstateProjectionResult {
  const {
    totalAssets,
    stateCode,
    isMarried,
    charitableBequests,
    assets,
    beneficiaries,
  } = params;
  
  // Calculate charitable deductions
  const charitableDeductions = charitableBequests.reduce((sum, bequest) => {
    if (bequest.isPercentage) {
      return sum + (totalAssets * bequest.amount / 100);
    }
    return sum + bequest.amount;
  }, 0);
  
  // Taxable estate = gross - charitable deductions
  const taxableEstate = Math.max(0, totalAssets - charitableDeductions);
  
  // Calculate taxes
  const federalEstateTax = calculateFederalEstateTax(taxableEstate, isMarried);
  const stateEstateTax = calculateStateEstateTax(taxableEstate, stateCode);
  const totalEstateTax = federalEstateTax + stateEstateTax;
  
  // Net to heirs (rounded to cents to prevent floating-point errors)
  const netToHeirs = Math.round((totalAssets - totalEstateTax - charitableDeductions) * 100) / 100;
  
  // Step-up in basis calculation
  const stepUpBasis = calculateStepUpBasis(assets);
  
  // Traditional IRA/401k balance for 10-year rule
  const traditionalIraBalance = assets
    .filter(a => a.type === 'ira' || a.type === '401k')
    .reduce((sum, a) => sum + a.value, 0);
  
  // Check if spouse is a beneficiary
  const hasSpouseBeneficiary = beneficiaries.some(b => b.relationship === 'spouse');
  const heir10YearTaxEstimate = calculateHeir10YearTaxLiability(
    traditionalIraBalance,
    hasSpouseBeneficiary
  );
  
  return {
    grossEstate: totalAssets,
    charitableDeductions,
    taxableEstate,
    federalEstateTax,
    stateEstateTax,
    totalEstateTax,
    netToHeirs,
    stepUpBasis,
    traditionalIraBalance,
    heir10YearTaxEstimate,
    assetBreakdown: {
      toTaxes: totalEstateTax,
      toHeirs: netToHeirs,
      toCharity: charitableDeductions,
    },
  };
}

/**
 * Format currency for display
 */
export function formatEstateCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Check if legacy goal is at risk
 */
export function checkLegacyGoalStatus(
  projectedEstateValue: number,
  legacyGoal: number
): { isAtRisk: boolean; shortfall: number; message: string } {
  const shortfall = legacyGoal - projectedEstateValue;
  
  if (projectedEstateValue >= legacyGoal) {
    return {
      isAtRisk: false,
      shortfall: 0,
      message: `Estate exceeds legacy goal by ${formatEstateCurrency(projectedEstateValue - legacyGoal)}`,
    };
  }
  
  return {
    isAtRisk: true,
    shortfall,
    message: `Legacy Goal at Risk: Projected estate is ${formatEstateCurrency(shortfall)} below your goal`,
  };
}
