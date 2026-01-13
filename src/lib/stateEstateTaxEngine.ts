/**
 * 2026 State Estate & Inheritance Tax Engine
 * Comprehensive state-level estate/inheritance tax calculations
 * Includes all 12 states with estate taxes and 6 states with inheritance taxes
 */

// 2026 Federal Estate Tax Constants
export const FEDERAL_ESTATE_EXEMPTION_2026 = 15_000_000;
export const FEDERAL_ESTATE_TAX_RATE = 0.40;

// States with Estate Taxes (12 states + DC)
export const STATE_ESTATE_TAX_2026: Record<string, {
  exemption: number;
  topRate: number;
  brackets: { threshold: number; rate: number }[];
  notes: string;
}> = {
  CT: {
    exemption: 13_610_000,
    topRate: 0.12,
    brackets: [
      { threshold: 0, rate: 0.116 },
      { threshold: 1_000_000, rate: 0.12 },
    ],
    notes: 'Highest exemption among estate tax states',
  },
  DC: {
    exemption: 4_710_970,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.08 },
      { threshold: 400_000, rate: 0.11 },
      { threshold: 600_000, rate: 0.14 },
      { threshold: 10_000_000, rate: 0.16 },
    ],
    notes: 'Graduated rates from 8% to 16%',
  },
  HI: {
    exemption: 5_490_000,
    topRate: 0.20,
    brackets: [
      { threshold: 0, rate: 0.10 },
      { threshold: 1_000_000, rate: 0.15 },
      { threshold: 5_000_000, rate: 0.20 },
    ],
    notes: 'Highest top rate for estate tax states',
  },
  IL: {
    exemption: 4_000_000,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.08 },
      { threshold: 4_000_000, rate: 0.16 },
    ],
    notes: 'Cliff effect - entire estate taxed if over exemption',
  },
  ME: {
    exemption: 6_410_000,
    topRate: 0.12,
    brackets: [
      { threshold: 0, rate: 0.08 },
      { threshold: 1_000_000, rate: 0.10 },
      { threshold: 2_000_000, rate: 0.12 },
    ],
    notes: 'Inflation-adjusted exemption',
  },
  MD: {
    exemption: 5_000_000,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.08 },
      { threshold: 1_000_000, rate: 0.16 },
    ],
    notes: 'Both estate AND inheritance tax apply',
  },
  MA: {
    exemption: 2_000_000,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.08 },
      { threshold: 500_000, rate: 0.12 },
      { threshold: 1_000_000, rate: 0.16 },
    ],
    notes: 'Cliff effect - low exemption triggers entire estate tax',
  },
  MN: {
    exemption: 3_000_000,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.13 },
      { threshold: 250_000, rate: 0.14 },
      { threshold: 500_000, rate: 0.15 },
      { threshold: 1_000_000, rate: 0.16 },
    ],
    notes: 'Graduated estate tax with moderate exemption',
  },
  NY: {
    exemption: 6_940_000,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.08 },
      { threshold: 1_500_000, rate: 0.10 },
      { threshold: 2_500_000, rate: 0.12 },
      { threshold: 5_000_000, rate: 0.14 },
      { threshold: 10_000_000, rate: 0.16 },
    ],
    notes: 'Cliff effect - exceeding 105% of exemption taxes entire estate',
  },
  OR: {
    exemption: 1_000_000,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.10 },
      { threshold: 500_000, rate: 0.16 },
    ],
    notes: 'Lowest estate tax exemption in the US',
  },
  RI: {
    exemption: 1_774_583,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.08 },
      { threshold: 100_000, rate: 0.10 },
      { threshold: 400_000, rate: 0.12 },
      { threshold: 800_000, rate: 0.16 },
    ],
    notes: 'Inflation-adjusted exemption',
  },
  VT: {
    exemption: 5_000_000,
    topRate: 0.16,
    brackets: [
      { threshold: 0, rate: 0.16 },
    ],
    notes: 'Flat 16% rate above exemption',
  },
  WA: {
    exemption: 2_193_000,
    topRate: 0.20,
    brackets: [
      { threshold: 0, rate: 0.10 },
      { threshold: 1_000_000, rate: 0.14 },
      { threshold: 2_000_000, rate: 0.15 },
      { threshold: 3_000_000, rate: 0.16 },
      { threshold: 4_000_000, rate: 0.18 },
      { threshold: 6_000_000, rate: 0.19 },
      { threshold: 9_000_000, rate: 0.20 },
    ],
    notes: 'Most graduated estate tax with highest top rate',
  },
};

// States with Inheritance Taxes (6 states)
export const STATE_INHERITANCE_TAX_2026: Record<string, {
  spouseRate: number;
  childRate: number;
  siblingRate: number;
  otherRate: number;
  exemptions: {
    spouse: number;
    child: number;
    sibling: number;
    other: number;
  };
  notes: string;
}> = {
  IA: {
    spouseRate: 0,
    childRate: 0,
    siblingRate: 0,
    otherRate: 0.06,
    exemptions: { spouse: Infinity, child: Infinity, sibling: Infinity, other: 0 },
    notes: 'Being phased out - only Class B/C heirs taxed',
  },
  KY: {
    spouseRate: 0,
    childRate: 0,
    siblingRate: 0.06,
    otherRate: 0.16,
    exemptions: { spouse: Infinity, child: Infinity, sibling: 1000, other: 500 },
    notes: 'Class A (spouse/children) exempt, Class B (siblings) 4-8%, Class C (others) 6-16%',
  },
  MD: {
    spouseRate: 0,
    childRate: 0,
    siblingRate: 0,
    otherRate: 0.10,
    exemptions: { spouse: Infinity, child: Infinity, sibling: Infinity, other: 1000 },
    notes: 'Only applies to non-lineal heirs',
  },
  NE: {
    spouseRate: 0,
    childRate: 0.01,
    siblingRate: 0.11,
    otherRate: 0.18,
    exemptions: { spouse: Infinity, child: 100_000, sibling: 40_000, other: 25_000 },
    notes: 'Flat rate per category above exemption',
  },
  NJ: {
    spouseRate: 0,
    childRate: 0,
    siblingRate: 0.12,
    otherRate: 0.16,
    exemptions: { spouse: Infinity, child: Infinity, sibling: 25_000, other: 0 },
    notes: 'Class C (siblings) 11-14%, Class D (others) 15-16%',
  },
  PA: {
    spouseRate: 0,
    childRate: 0.045,
    siblingRate: 0.12,
    otherRate: 0.15,
    exemptions: { spouse: Infinity, child: 0, sibling: 0, other: 0 },
    notes: 'All non-spouse heirs taxed from first dollar',
  },
};

export type HeirRelationship = 'spouse' | 'child' | 'sibling' | 'other';

export interface InheritanceTaxResult {
  stateCode: string;
  heirName: string;
  relationship: HeirRelationship;
  inheritedAmount: number;
  exemption: number;
  taxableAmount: number;
  taxRate: number;
  taxAmount: number;
  netInheritance: number;
}

export interface EstateTaxResult {
  stateCode: string;
  stateName: string;
  grossEstate: number;
  exemption: number;
  taxableEstate: number;
  estateTax: number;
  effectiveRate: number;
  hasTax: boolean;
  taxType: 'estate' | 'inheritance' | 'both' | 'none';
  notes: string;
}

/**
 * Calculate state estate tax with graduated brackets
 */
export function calculateStateEstateTax2026(
  grossEstate: number,
  stateCode: string
): EstateTaxResult {
  const stateData = STATE_ESTATE_TAX_2026[stateCode];
  
  if (!stateData) {
    // Check if it's an inheritance tax state
    if (STATE_INHERITANCE_TAX_2026[stateCode]) {
      return {
        stateCode,
        stateName: getStateName(stateCode),
        grossEstate,
        exemption: 0,
        taxableEstate: grossEstate,
        estateTax: 0,
        effectiveRate: 0,
        hasTax: true,
        taxType: stateCode === 'MD' ? 'both' : 'inheritance',
        notes: 'This state uses inheritance tax instead of estate tax',
      };
    }
    
    return {
      stateCode,
      stateName: getStateName(stateCode),
      grossEstate,
      exemption: 0,
      taxableEstate: 0,
      estateTax: 0,
      effectiveRate: 0,
      hasTax: false,
      taxType: 'none',
      notes: 'No state estate or inheritance tax',
    };
  }

  // Check if estate is below exemption
  if (grossEstate <= stateData.exemption) {
    return {
      stateCode,
      stateName: getStateName(stateCode),
      grossEstate,
      exemption: stateData.exemption,
      taxableEstate: 0,
      estateTax: 0,
      effectiveRate: 0,
      hasTax: true,
      taxType: stateCode === 'MD' ? 'both' : 'estate',
      notes: `Estate below ${stateCode} exemption of $${(stateData.exemption / 1_000_000).toFixed(2)}M`,
    };
  }

  // NY and IL have "cliff" effects - if estate exceeds 105% of exemption, entire estate is taxed
  const hasCliffEffect = stateCode === 'NY' || stateCode === 'IL' || stateCode === 'MA';
  let taxableEstate = grossEstate - stateData.exemption;
  
  if (hasCliffEffect && stateCode === 'NY' && grossEstate > stateData.exemption * 1.05) {
    taxableEstate = grossEstate; // Tax entire estate
  }

  // Calculate graduated tax
  let estateTax = 0;
  let prevThreshold = 0;
  
  for (const bracket of stateData.brackets) {
    if (taxableEstate > prevThreshold) {
      const taxableInBracket = Math.min(taxableEstate - prevThreshold, (bracket.threshold || Infinity) - prevThreshold);
      estateTax += taxableInBracket * bracket.rate;
      prevThreshold = bracket.threshold;
    }
  }

  return {
    stateCode,
    stateName: getStateName(stateCode),
    grossEstate,
    exemption: stateData.exemption,
    taxableEstate,
    estateTax,
    effectiveRate: grossEstate > 0 ? estateTax / grossEstate : 0,
    hasTax: true,
    taxType: stateCode === 'MD' ? 'both' : 'estate',
    notes: stateData.notes,
  };
}

/**
 * Calculate inheritance tax for a specific heir
 */
export function calculateInheritanceTax2026(
  inheritedAmount: number,
  stateCode: string,
  relationship: HeirRelationship,
  heirName: string = 'Heir'
): InheritanceTaxResult {
  const stateData = STATE_INHERITANCE_TAX_2026[stateCode];
  
  if (!stateData) {
    return {
      stateCode,
      heirName,
      relationship,
      inheritedAmount,
      exemption: 0,
      taxableAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      netInheritance: inheritedAmount,
    };
  }

  // Get rate and exemption based on relationship
  let rate = 0;
  let exemption = 0;
  
  switch (relationship) {
    case 'spouse':
      rate = stateData.spouseRate;
      exemption = stateData.exemptions.spouse;
      break;
    case 'child':
      rate = stateData.childRate;
      exemption = stateData.exemptions.child;
      break;
    case 'sibling':
      rate = stateData.siblingRate;
      exemption = stateData.exemptions.sibling;
      break;
    default:
      rate = stateData.otherRate;
      exemption = stateData.exemptions.other;
  }

  const taxableAmount = Math.max(0, inheritedAmount - exemption);
  const taxAmount = taxableAmount * rate;

  return {
    stateCode,
    heirName,
    relationship,
    inheritedAmount,
    exemption,
    taxableAmount,
    taxRate: rate,
    taxAmount,
    netInheritance: inheritedAmount - taxAmount,
  };
}

/**
 * Calculate total tax leakage at different ages (for timeline visualization)
 */
export interface AgeProjection {
  age: number;
  year: number;
  projectedNetWorth: number;
  federalEstateTax: number;
  stateEstateTax: number;
  inheritanceTax: number;
  heirIncomeTax: number;
  totalTaxLeakage: number;
  netToHeirs: number;
  stepUpBasisBenefit: number;
}

export function projectEstateByAge(params: {
  currentAge: number;
  currentNetWorth: number;
  stateCode: string;
  isMarried: boolean;
  annualGrowthRate: number;
  traditionalIraBalance: number;
  brokerageBalance: number;
  brokarageCostBasis: number;
  heirMarginalRate: number;
  startAge?: number;
  endAge?: number;
}): AgeProjection[] {
  const {
    currentAge,
    currentNetWorth,
    stateCode,
    isMarried,
    annualGrowthRate,
    traditionalIraBalance,
    brokerageBalance,
    brokarageCostBasis,
    heirMarginalRate,
    startAge = 65,
    endAge = 100,
  } = params;

  const projections: AgeProjection[] = [];
  const currentYear = new Date().getFullYear();

  for (let age = startAge; age <= endAge; age++) {
    const yearsFromNow = age - currentAge;
    const year = currentYear + yearsFromNow;
    const growthFactor = Math.pow(1 + annualGrowthRate, Math.max(0, yearsFromNow));
    
    const projectedNetWorth = currentNetWorth * growthFactor;
    const projectedTraditionalIra = traditionalIraBalance * growthFactor;
    const projectedBrokerage = brokerageBalance * growthFactor;
    
    // Calculate federal estate tax
    const federalExemption = isMarried ? FEDERAL_ESTATE_EXEMPTION_2026 * 2 : FEDERAL_ESTATE_EXEMPTION_2026;
    const federalEstateTax = projectedNetWorth > federalExemption
      ? (projectedNetWorth - federalExemption) * FEDERAL_ESTATE_TAX_RATE
      : 0;
    
    // Calculate state estate tax
    const stateResult = calculateStateEstateTax2026(projectedNetWorth, stateCode);
    const stateEstateTax = stateResult.estateTax;
    
    // Calculate inheritance tax (simplified - assume children as heirs)
    const inheritanceResult = calculateInheritanceTax2026(
      projectedNetWorth - federalEstateTax - stateEstateTax,
      stateCode,
      'child'
    );
    const inheritanceTax = inheritanceResult.taxAmount;
    
    // Calculate heir income tax on inherited traditional IRA (10-year rule)
    const heirIncomeTax = projectedTraditionalIra * heirMarginalRate;
    
    // Step-up in basis benefit
    const unrealizedGains = projectedBrokerage - (brokarageCostBasis * growthFactor);
    const stepUpBasisBenefit = Math.max(0, unrealizedGains * heirMarginalRate);
    
    const totalTaxLeakage = federalEstateTax + stateEstateTax + inheritanceTax + heirIncomeTax;
    const netToHeirs = projectedNetWorth - federalEstateTax - stateEstateTax - inheritanceTax;

    projections.push({
      age,
      year,
      projectedNetWorth,
      federalEstateTax,
      stateEstateTax,
      inheritanceTax,
      heirIncomeTax,
      totalTaxLeakage,
      netToHeirs,
      stepUpBasisBenefit,
    });
  }

  return projections;
}

/**
 * Compare estate tax across multiple states
 */
export function compareStateEstateTaxes(
  grossEstate: number,
  states: string[]
): EstateTaxResult[] {
  return states.map(stateCode => calculateStateEstateTax2026(grossEstate, stateCode));
}

/**
 * Get all estate tax states
 */
export function getEstateTaxStates(): string[] {
  return Object.keys(STATE_ESTATE_TAX_2026);
}

/**
 * Get all inheritance tax states
 */
export function getInheritanceTaxStates(): string[] {
  return Object.keys(STATE_INHERITANCE_TAX_2026);
}

/**
 * Get human-readable state name
 */
function getStateName(stateCode: string): string {
  const stateNames: Record<string, string> = {
    CT: 'Connecticut', DC: 'District of Columbia', HI: 'Hawaii', IL: 'Illinois',
    IA: 'Iowa', KY: 'Kentucky', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts',
    MN: 'Minnesota', NE: 'Nebraska', NJ: 'New Jersey', NY: 'New York', OR: 'Oregon',
    PA: 'Pennsylvania', RI: 'Rhode Island', VT: 'Vermont', WA: 'Washington',
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', ID: 'Idaho',
    IN: 'Indiana', KS: 'Kansas', LA: 'Louisiana', MI: 'Michigan', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NV: 'Nevada', NH: 'New Hampshire', NM: 'New Mexico',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VA: 'Virginia',
    WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  };
  return stateNames[stateCode] || stateCode;
}

export { getStateName };
