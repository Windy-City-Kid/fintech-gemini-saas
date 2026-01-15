/**
 * 2026 State Tax Intelligence Engine
 * 
 * Comprehensive state-by-state tax logic including:
 * - Full 50-state + DC Social Security taxation rules
 * - The "Taxing 8" states with specific 2026 thresholds
 * - West Virginia fully exempt (2026 update)
 * - Minnesota, Connecticut, Utah, etc. exemption thresholds
 * - IRMAA interaction warnings for Tier 2 states
 */

import { StateTaxRule } from '@/hooks/useStateTaxRules';
import { FEDERAL_ESTATE_EXEMPTION_2026, FEDERAL_ESTATE_TAX_RATE } from './estateCalculator';

// 2026 SSA Constants
export const SSA_2026_CONSTANTS = {
  COLA_RATE: 0.028,                    // 2.8% COLA for 2026
  MAX_TAXABLE_EARNINGS: 184500,        // 2026 wage base
  FEDERAL_EXEMPTION: FEDERAL_ESTATE_EXEMPTION_2026, // 2026 estate tax exemption (canonical source)
  ESTATE_TAX_RATE: FEDERAL_ESTATE_TAX_RATE,         // 40% federal estate tax (canonical source)
  IRMAA_BASE_THRESHOLD_SINGLE: 106000, // 2026 IRMAA threshold
  IRMAA_BASE_THRESHOLD_JOINT: 212000,  // 2026 IRMAA threshold (MFJ)
};

/**
 * The "Taxing 8" States - States that tax Social Security in 2026
 * Each has specific exemption rules and thresholds
 */
export interface TaxingStateRules {
  stateCode: string;
  stateName: string;
  exemptionType: 'full_above_threshold' | 'partial' | 'graduated' | 'federal_rules';
  thresholdSingle: number | null;
  thresholdJoint: number | null;
  exemptionPercentage: number;          // Percentage of SS that's exempt
  specialRules: string;
  effectiveRate: (agi: number, ssBenefit: number, isJoint: boolean) => number;
}

export const TAXING_8_STATES_2026: TaxingStateRules[] = [
  {
    stateCode: 'MN',
    stateName: 'Minnesota',
    exemptionType: 'full_above_threshold',
    thresholdSingle: 84490,
    thresholdJoint: 108480,
    exemptionPercentage: 100,
    specialRules: 'Full exemption for AGI up to $84,490 (single) / $108,480 (joint). Partial exemption phases out above thresholds.',
    effectiveRate: (agi: number, ssBenefit: number, isJoint: boolean) => {
      const threshold = isJoint ? 108480 : 84490;
      if (agi <= threshold) return 0;
      // Phase-out calculation - partial taxation above threshold
      const excessAGI = agi - threshold;
      const phaseOutRate = Math.min(1, excessAGI / 25000);
      return 0.0985 * 0.85 * phaseOutRate; // 9.85% state rate on 85% of SS
    },
  },
  {
    stateCode: 'CT',
    stateName: 'Connecticut',
    exemptionType: 'partial',
    thresholdSingle: 75000,
    thresholdJoint: 100000,
    exemptionPercentage: 75,
    specialRules: 'Up to 75% exempt if AGI > $100,000 (joint). Below threshold, may be fully exempt.',
    effectiveRate: (agi: number, ssBenefit: number, isJoint: boolean) => {
      const threshold = isJoint ? 100000 : 75000;
      if (agi <= threshold) return 0;
      // 25% of SS is taxable at state rates
      return 0.0699 * 0.25;
    },
  },
  {
    stateCode: 'MT',
    stateName: 'Montana',
    exemptionType: 'graduated',
    thresholdSingle: 25000,
    thresholdJoint: 32000,
    exemptionPercentage: 0,
    specialRules: 'Partial deduction based on AGI. Low-income filers may see reduced taxation.',
    effectiveRate: (agi: number, ssBenefit: number, isJoint: boolean) => {
      const threshold = isJoint ? 32000 : 25000;
      if (agi <= threshold) return 0;
      return 0.0675 * 0.50; // Approximately 50% of SS taxable
    },
  },
  {
    stateCode: 'NM',
    stateName: 'New Mexico',
    exemptionType: 'full_above_threshold',
    thresholdSingle: 100000,
    thresholdJoint: 150000,
    exemptionPercentage: 100,
    specialRules: 'Full exemption for AGI under $100,000 (single) / $150,000 (joint). Above, follows federal rules.',
    effectiveRate: (agi: number, ssBenefit: number, isJoint: boolean) => {
      const threshold = isJoint ? 150000 : 100000;
      if (agi <= threshold) return 0;
      return 0.059 * 0.85; // Up to 85% taxable
    },
  },
  {
    stateCode: 'RI',
    stateName: 'Rhode Island',
    exemptionType: 'full_above_threshold',
    thresholdSingle: 95800,
    thresholdJoint: 119750,
    exemptionPercentage: 100,
    specialRules: 'Full exemption if AGI under $95,800 (single) / $119,750 (joint) and reached FRA.',
    effectiveRate: (agi: number, ssBenefit: number, isJoint: boolean) => {
      const threshold = isJoint ? 119750 : 95800;
      if (agi <= threshold) return 0;
      return 0.0599 * 0.85;
    },
  },
  {
    stateCode: 'UT',
    stateName: 'Utah',
    exemptionType: 'federal_rules',
    thresholdSingle: 45000,
    thresholdJoint: 75000,
    exemptionPercentage: 0,
    specialRules: 'Follows federal taxation rules. Tax credit available for low-income seniors to offset.',
    effectiveRate: (agi: number, ssBenefit: number, isJoint: boolean) => {
      // Utah taxes SS but offers credits
      const threshold = isJoint ? 75000 : 45000;
      if (agi <= threshold) return 0.0495 * 0.30; // Reduced effective rate
      return 0.0495 * 0.85;
    },
  },
  {
    stateCode: 'VT',
    stateName: 'Vermont',
    exemptionType: 'full_above_threshold',
    thresholdSingle: 50000,
    thresholdJoint: 65000,
    exemptionPercentage: 100,
    specialRules: 'Full exemption for AGI under $50,000 (single) / $65,000 (joint). Phased reduction above.',
    effectiveRate: (agi: number, ssBenefit: number, isJoint: boolean) => {
      const threshold = isJoint ? 65000 : 50000;
      if (agi <= threshold) return 0;
      return 0.0875 * 0.50;
    },
  },
  // Note: West Virginia was previously in this list but is NOW FULLY EXEMPT as of 2026
];

// States that DO NOT tax Social Security (including 2026 West Virginia update)
export const SS_EXEMPT_STATES_2026 = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MS', 'MO', 'NE', 'NV', 'NH', 'NJ', 'NY', 'NC', 'ND',
  'OH', 'OK', 'OR', 'PA', 'SC', 'SD', 'TN', 'TX', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

// States with no income tax at all
export const NO_INCOME_TAX_STATES = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'];

// Tier 2 States - SS exempt but AGI still determines IRMAA
export const TIER_2_SS_EXEMPT_STATES = [
  'AL', 'AZ', 'AR', 'DE', 'GA', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA',
  'MI', 'MO', 'NE', 'NJ', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'SC', 'VA', 'WI'
];

/**
 * Calculate state income tax on Social Security
 */
export function calculateSSStateTax(
  stateCode: string,
  ssBenefit: number,
  agi: number,
  isJoint: boolean,
  stateTaxRules?: StateTaxRule[]
): {
  taxAmount: number;
  effectiveRate: number;
  isTaxed: boolean;
  exemptionDetails: string;
} {
  // Check if in Taxing 8
  const taxingRule = TAXING_8_STATES_2026.find(s => s.stateCode === stateCode);
  
  if (taxingRule) {
    const effectiveRate = taxingRule.effectiveRate(agi, ssBenefit, isJoint);
    const taxAmount = ssBenefit * effectiveRate;
    
    const threshold = isJoint ? taxingRule.thresholdJoint : taxingRule.thresholdSingle;
    let exemptionDetails = taxingRule.specialRules;
    
    if (threshold && agi <= threshold) {
      exemptionDetails = `Your AGI of $${agi.toLocaleString()} is below the ${isJoint ? 'joint' : 'single'} threshold of $${threshold.toLocaleString()}. Your SS is exempt.`;
    }
    
    return {
      taxAmount,
      effectiveRate,
      isTaxed: effectiveRate > 0,
      exemptionDetails,
    };
  }
  
  // Not in Taxing 8 - check if it's a no-income-tax state
  if (NO_INCOME_TAX_STATES.includes(stateCode)) {
    return {
      taxAmount: 0,
      effectiveRate: 0,
      isTaxed: false,
      exemptionDetails: 'This state has no income tax. Your Social Security is fully exempt.',
    };
  }
  
  // All other states don't tax SS
  return {
    taxAmount: 0,
    effectiveRate: 0,
    isTaxed: false,
    exemptionDetails: 'This state does not tax Social Security benefits.',
  };
}

/**
 * Calculate 30-year state tax impact comparison
 */
export interface StateComparisonResult {
  stateCode: string;
  stateName: string;
  year1Tax: number;
  totalTax30Year: number;
  isSSTaxed: boolean;
  topMarginalRate: number;
  propertyTaxRate: number;
  retirementFriendliness: string;
  specialNotes: string;
}

export function calculate30YearStateComparison(
  annualSSBenefit: number,
  annualRMDIncome: number,
  otherIncome: number,
  homeValue: number,
  states: string[],
  stateTaxRules: StateTaxRule[],
  colaRate: number = SSA_2026_CONSTANTS.COLA_RATE
): StateComparisonResult[] {
  const results: StateComparisonResult[] = [];
  
  for (const stateCode of states) {
    const rule = stateTaxRules.find(r => r.state_code === stateCode);
    if (!rule) continue;
    
    let totalTax30Year = 0;
    let year1Tax = 0;
    
    for (let year = 0; year < 30; year++) {
      // Apply COLA to SS benefit
      const ssForYear = annualSSBenefit * Math.pow(1 + colaRate, year);
      const rmdForYear = annualRMDIncome * Math.pow(1.025, year); // RMDs grow with portfolio
      const otherForYear = otherIncome * Math.pow(1.025, year);
      const totalAGI = ssForYear + rmdForYear + otherForYear;
      const homeForYear = homeValue * Math.pow(1.03, year);
      
      // SS tax
      const ssTax = calculateSSStateTax(stateCode, ssForYear, totalAGI, true, stateTaxRules);
      
      // Income tax on other income (RMDs, etc.)
      let incomeTax = 0;
      if (rule.rate_type !== 'none') {
        let taxableIncome = rmdForYear + otherForYear;
        
        // Apply retirement exclusion
        if (rule.retirement_exclusion_amount > 0) {
          taxableIncome = Math.max(0, taxableIncome - rule.retirement_exclusion_amount);
        }
        
        incomeTax = taxableIncome * ((rule.top_marginal_rate || 0) / 100);
      }
      
      // Property tax
      const propertyTax = homeForYear * ((rule.property_tax_rate || 0) / 100);
      
      const yearlyTotal = ssTax.taxAmount + incomeTax + propertyTax;
      totalTax30Year += yearlyTotal;
      
      if (year === 0) {
        year1Tax = yearlyTotal;
      }
    }
    
    const taxingRule = TAXING_8_STATES_2026.find(s => s.stateCode === stateCode);
    
    results.push({
      stateCode,
      stateName: rule.state_name,
      year1Tax,
      totalTax30Year,
      isSSTaxed: !!taxingRule,
      topMarginalRate: rule.top_marginal_rate || 0,
      propertyTaxRate: rule.property_tax_rate || 0,
      retirementFriendliness: rule.retirement_friendliness || 'neutral',
      specialNotes: taxingRule?.specialRules || (rule.notes || ''),
    });
  }
  
  return results.sort((a, b) => a.totalTax30Year - b.totalTax30Year);
}

/**
 * IRMAA Tier Warning Logic
 * Even if SS is state-exempt, high AGI still triggers federal IRMAA
 */
export interface IRMAAWarning {
  hasWarning: boolean;
  irmaaCategory: 'none' | 'tier1' | 'tier2' | 'tier3' | 'tier4' | 'tier5';
  estimatedMonthlyPartB: number;
  estimatedMonthlyPartD: number;
  warningMessage: string;
}

export function checkIRMAAInteraction(
  stateCode: string,
  projectedAGI: number,
  isJoint: boolean
): IRMAAWarning {
  // 2026 IRMAA thresholds (estimated)
  const thresholds = isJoint
    ? [212000, 266000, 332000, 398000, 750000]
    : [106000, 133000, 166000, 199000, 500000];
  
  // 2026 Part B base premium
  const partBBase = 174.70;
  const partBSurcharges = [69.90, 174.70, 279.50, 384.30, 419.30];
  
  const partDBase = 35.00;
  const partDSurcharges = [12.90, 33.30, 53.80, 74.20, 81.00];
  
  // Determine IRMAA tier
  let tier = 0;
  for (let i = 0; i < thresholds.length; i++) {
    if (projectedAGI > thresholds[i]) {
      tier = i + 1;
    }
  }
  
  const tierLabels: IRMAAWarning['irmaaCategory'][] = ['none', 'tier1', 'tier2', 'tier3', 'tier4', 'tier5'];
  
  // Check if this is a Tier 2 SS-exempt state
  const isTier2SSExempt = TIER_2_SS_EXEMPT_STATES.includes(stateCode);
  
  let warningMessage = '';
  
  if (tier > 0) {
    if (isTier2SSExempt) {
      warningMessage = `While your Social Security is state-exempt in ${stateCode}, your total AGI of $${projectedAGI.toLocaleString()} still determines your federal IRMAA bracket. A relocation won't lower your Medicare premiums. You're in IRMAA Tier ${tier}, adding $${(partBSurcharges[tier - 1] + partDSurcharges[tier - 1]).toFixed(2)}/month to your premiums.`;
    } else if (NO_INCOME_TAX_STATES.includes(stateCode)) {
      warningMessage = `Your AGI of $${projectedAGI.toLocaleString()} places you in IRMAA Tier ${tier}. Moving to ${stateCode} saves state taxes but won't reduce your Medicare surcharges of $${(partBSurcharges[tier - 1] + partDSurcharges[tier - 1]).toFixed(2)}/month.`;
    } else {
      warningMessage = `Your AGI triggers IRMAA Tier ${tier}, adding $${(partBSurcharges[tier - 1] + partDSurcharges[tier - 1]).toFixed(2)}/month to Medicare premiums.`;
    }
  }
  
  return {
    hasWarning: tier > 0 && (isTier2SSExempt || NO_INCOME_TAX_STATES.includes(stateCode)),
    irmaaCategory: tierLabels[tier],
    estimatedMonthlyPartB: partBBase + (tier > 0 ? partBSurcharges[tier - 1] : 0),
    estimatedMonthlyPartD: partDBase + (tier > 0 ? partDSurcharges[tier - 1] : 0),
    warningMessage,
  };
}

/**
 * Get relocation savings headline
 */
export function getRelocationSavingsHeadline(
  currentStateCode: string,
  destinationStateCode: string,
  savings: number
): string {
  if (savings <= 0) {
    return `Moving to ${destinationStateCode} would not save you money on state taxes.`;
  }
  
  if (savings >= 100000) {
    return `Moving to ${destinationStateCode} saves you $${(savings / 1000).toFixed(0)}K in lifetime state taxes.`;
  }
  
  return `Moving to ${destinationStateCode} saves you $${savings.toLocaleString()} over 30 years.`;
}

/**
 * Federal SS taxation calculation (up to 85% taxable)
 */
export function calculateFederalSSTaxable(
  ssBenefit: number,
  otherIncome: number,
  isJoint: boolean
): { taxableAmount: number; taxablePercentage: number } {
  const provisionalIncome = otherIncome + (ssBenefit * 0.5);
  
  const thresholds = isJoint
    ? { first: 32000, second: 44000 }
    : { first: 25000, second: 34000 };
  
  if (provisionalIncome <= thresholds.first) {
    return { taxableAmount: 0, taxablePercentage: 0 };
  }
  
  if (provisionalIncome <= thresholds.second) {
    const taxable = Math.min(ssBenefit * 0.5, (provisionalIncome - thresholds.first) * 0.5);
    return { taxableAmount: taxable, taxablePercentage: (taxable / ssBenefit) * 100 };
  }
  
  const firstLevel = (thresholds.second - thresholds.first) * 0.5;
  const secondLevel = (provisionalIncome - thresholds.second) * 0.85;
  const taxable = Math.min(ssBenefit * 0.85, firstLevel + secondLevel);
  
  return { taxableAmount: taxable, taxablePercentage: (taxable / ssBenefit) * 100 };
}
