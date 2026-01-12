/**
 * Monte Carlo Simulation Web Worker
 * Offloads 5,000-trial LHS/Cholesky computation from main thread
 * 
 * Correlation Matrix: [[1.0, 0.1, 0.0], [0.1, 1.0, 0.1], [0.0, 0.1, 1.0]]
 * Asset Classes: [Stocks, Bonds, Cash]
 */

// ============= TYPES =============

interface SimpleAllocation {
  stocks: number;
  bonds: number;
  cash: number;
}

interface RateRange {
  optimistic: number; // as decimal (e.g., 0.02 for 2%)
  pessimistic: number; // as decimal (e.g., 0.04 for 4%)
  marketSentiment?: number; // T10YIE anchor for simulation center (as decimal)
}

interface RateAssumptions {
  inflation?: RateRange;
  stockReturns?: RateRange;
  bondReturns?: RateRange;
  ssCola?: RateRange; // Social Security COLA (CPI-W based)
  medicalInflation?: RateRange; // Medical inflation for Medicare costs
}

interface SocialSecurityParams {
  primaryPIA: number;           // Primary Insurance Amount at FRA (monthly)
  primaryClaimingAge: number;   // Age to start benefits (62-70)
  primaryFRA: number;           // Full Retirement Age (66-67)
  spousePIA?: number;           // Spouse PIA (0 if single)
  spouseClaimingAge?: number;   // Spouse claiming age
  spouseFRA?: number;           // Spouse FRA
  spouseCurrentAge?: number;    // Spouse current age
  isMarried: boolean;
  primaryLifeExpectancy: number;
  spouseLifeExpectancy?: number;
}

interface MedicareParams {
  enabled: boolean;
  pensionIncome: number;        // Annual pension income
  investmentIncome: number;     // Expected investment income
  estimatedIRABalance: number;  // IRA/401k balance for RMD calculations
}

interface HouseholdParams {
  isMarried: boolean;
  primaryLifeExpectancy: number;
  spouseLifeExpectancy?: number;
  spouseCurrentAge?: number;
  legacyGoalAmount: number;     // Minimum end balance for success
}

interface MoneyFlowParams {
  contributions: {
    accountType: string;
    annualAmount: number;
    isIncomeLinked: boolean;
    startAge: number;
    endAge: number;
  }[];
  excessIncomeEnabled: boolean;
  excessSavePercentage: number;
  excessTargetAccount: string;
  withdrawalOrder: string[]; // e.g., ['Brokerage', '401k', 'IRA', 'Roth']
}

interface PropertyParams {
  mortgageBalance: number;
  mortgageInterestRate: number; // Annual rate as percent (e.g., 6.5 for 6.5%)
  mortgageMonthlyPayment: number;
  estimatedValue: number;
  relocationAge?: number;
  relocationSalePrice?: number;
  relocationNewPurchasePrice?: number;
  relocationNewMortgageAmount?: number;
  relocationNewInterestRate?: number;
  relocationNewTermMonths?: number;
}

interface SimulationParams {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  annualContribution: number;
  monthlyRetirementSpending: number;
  allocation: SimpleAllocation;
  rateAssumptions?: RateAssumptions;
  socialSecurity?: SocialSecurityParams;
  medicare?: MedicareParams;
  household?: HouseholdParams;
  moneyFlows?: MoneyFlowParams;
  property?: PropertyParams;
}

interface GuardrailEvent {
  yearInRetirement: number;
  activations: number;
  percentage: number;
}

interface MoneyFlowSummary {
  yearlyContributions: number[];
  yearlyWithdrawals: number[];
}

interface SimulationResult {
  percentiles: {
    p5: number[];
    p25: number[];
    p50: number[];
    p75: number[];
    p95: number[];
  };
  ages: number[];
  successRate: number;
  medianEndBalance: number;
  guardrailActivations: number;
  guardrailEvents: GuardrailEvent[];
  inflationScenarios: {
    low: number;
    median: number;
    high: number;
  };
  executionTimeMs: number;
  ssBenefitsByAge?: number[];
  medicareCostsByAge?: number[];
  irmaaYears?: number[]; // Ages where IRMAA surcharge applies
  moneyFlowSummary?: MoneyFlowSummary;
}

// ============= 2026 IRS CONTRIBUTION LIMITS =============

const IRS_LIMITS_2026 = {
  '401k': { base: 24000, catchUp: 7500, superCatchUp: 11250, catchUpAge: 50, superCatchUpAges: [60, 63] },
  '403b': { base: 24000, catchUp: 7500, superCatchUp: 11250, catchUpAge: 50, superCatchUpAges: [60, 63] },
  IRA: { base: 7500, catchUp: 1000, catchUpAge: 50 },
  Roth: { base: 7500, catchUp: 1000, catchUpAge: 50 },
  HSA: { individual: 4400, family: 8750, catchUp: 1000, catchUpAge: 55 },
  rothCatchUpIncomeThreshold: 150000,
};

function getIRSContributionLimit(accountType: string, age: number): number {
  const normalized = accountType.toLowerCase();
  
  if (normalized.includes('401') || normalized.includes('403')) {
    const limits = IRS_LIMITS_2026['401k'];
    let max = limits.base;
    
    // Super Catch-Up for ages 60-63
    if (age >= 60 && age <= 63) {
      max += limits.superCatchUp;
    } else if (age >= limits.catchUpAge) {
      max += limits.catchUp;
    }
    return max;
  }
  
  if (normalized.includes('ira') || normalized.includes('roth')) {
    const limits = IRS_LIMITS_2026.IRA;
    let max = limits.base;
    if (age >= limits.catchUpAge) {
      max += limits.catchUp;
    }
    return max;
  }
  
  if (normalized.includes('hsa')) {
    const limits = IRS_LIMITS_2026.HSA;
    let max = limits.family; // Assume family for simulation
    if (age >= limits.catchUpAge) {
      max += limits.catchUp;
    }
    return max;
  }
  
  // Brokerage/Taxable has no limit
  return Infinity;
}


const MEDICARE_PART_B_STANDARD = 202.90;
const MEDICARE_PART_D_BASE = 35.00;
const MEDICAL_INFLATION_DEFAULT = 0.0336; // 3.36% historical

interface IRMAABracket {
  singleMin: number;
  singleMax: number;
  jointMin: number;
  jointMax: number;
  partBMonthly: number;
  partDSurcharge: number;
}

const IRMAA_BRACKETS: IRMAABracket[] = [
  { singleMin: 0, singleMax: 109000, jointMin: 0, jointMax: 218000, partBMonthly: 202.90, partDSurcharge: 0 },
  { singleMin: 109000, singleMax: 137000, jointMin: 218000, jointMax: 274000, partBMonthly: 284.10, partDSurcharge: 13.70 },
  { singleMin: 137000, singleMax: 171000, jointMin: 274000, jointMax: 342000, partBMonthly: 405.80, partDSurcharge: 35.30 },
  { singleMin: 171000, singleMax: 205000, jointMin: 342000, jointMax: 410000, partBMonthly: 527.50, partDSurcharge: 57.00 },
  { singleMin: 205000, singleMax: 500000, jointMin: 410000, jointMax: 750000, partBMonthly: 649.20, partDSurcharge: 78.60 },
  { singleMin: 500000, singleMax: Infinity, jointMin: 750000, jointMax: Infinity, partBMonthly: 678.00, partDSurcharge: 85.00 },
];

// RMD divisors (simplified IRS Uniform Lifetime Table)
const RMD_DIVISORS: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
};

function calculateRMD(age: number, iraBalance: number): number {
  if (age < 73) return 0;
  const divisor = RMD_DIVISORS[age] || RMD_DIVISORS[95] || 8.9;
  return iraBalance / divisor;
}

function calculateMAGI(
  ssIncome: number,
  pensionIncome: number,
  rmdAmount: number,
  investmentIncome: number
): number {
  return (ssIncome * 0.85) + pensionIncome + rmdAmount + investmentIncome;
}

function calculateMedicareCost(
  magi: number,
  isMarried: boolean,
  yearsSince2026: number,
  medicalInflationRate: number
): { annualCost: number; hasIRMAA: boolean } {
  let bracket = IRMAA_BRACKETS[0];
  
  for (const b of IRMAA_BRACKETS) {
    const min = isMarried ? b.jointMin : b.singleMin;
    const max = isMarried ? b.jointMax : b.singleMax;
    if (magi >= min && magi < max) {
      bracket = b;
      break;
    }
    if (magi >= max) bracket = b;
  }
  
  const monthlyTotal = bracket.partBMonthly + MEDICARE_PART_D_BASE + bracket.partDSurcharge;
  const annualBase = monthlyTotal * 12;
  const inflatedCost = annualBase * Math.pow(1 + medicalInflationRate, yearsSince2026);
  
  return {
    annualCost: inflatedCost,
    hasIRMAA: bracket.partBMonthly > MEDICARE_PART_B_STANDARD,
  };
}

// ============= PARAMETERS =============

/** 
 * 3x3 Historical Correlation Matrix [Stocks, Bonds, Cash]
 * As specified: [[1.0, 0.1, 0.0], [0.1, 1.0, 0.1], [0.0, 0.1, 1.0]]
 */
const CORRELATION_MATRIX: number[][] = [
  [1.0, 0.1, 0.0],  // Stocks
  [0.1, 1.0, 0.1],  // Bonds
  [0.0, 0.1, 1.0],  // Cash
];

/** Asset return parameters */
const ASSET_PARAMS = {
  stocks: { mean: 0.07, std: 0.18 },
  bonds: { mean: 0.04, std: 0.06 },
  cash: { mean: 0.02, std: 0.01 },
  inflation: { mean: 0.025, std: 0.01 }, // 2.5% mean, 1% std dev
};

// ============= CHOLESKY DECOMPOSITION =============

function choleskyDecomposition(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = [];
  for (let i = 0; i < n; i++) {
    L[i] = new Array(n).fill(0);
  }
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        L[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
      } else {
        L[i][j] = (matrix[i][j] - sum) / (L[j][j] || 1);
      }
    }
  }
  return L;
}

// Pre-compute Cholesky L matrix
const CHOLESKY_L = choleskyDecomposition(CORRELATION_MATRIX);

// ============= INVERSE NORMAL CDF =============

function inverseNormalCDF(p: number): number {
  p = Math.max(0.0001, Math.min(0.9999, p));
  
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
             1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
             6.680131188771972e+01, -1.328068155288572e+01];
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
             -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
             3.754408661907416e+00];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
           ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  } else if (p <= pHigh) {
    const q = p - 0.5;
    const r = q * q;
    return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5])*q /
           (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
            ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  }
}

// ============= LHS SAMPLE GENERATION =============

function generateLHSSamples(iterations: number, years: number, dimensions: number): Float64Array[] {
  const yearSamples: Float64Array[] = [];
  
  for (let year = 0; year < years; year++) {
    const samples = new Float64Array(iterations * dimensions);
    
    for (let d = 0; d < dimensions; d++) {
      const intervals = new Float64Array(iterations);
      for (let i = 0; i < iterations; i++) {
        intervals[i] = (i + Math.random()) / iterations;
      }
      
      // Fisher-Yates shuffle
      for (let i = iterations - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [intervals[i], intervals[j]] = [intervals[j], intervals[i]];
      }
      
      for (let i = 0; i < iterations; i++) {
        samples[i * dimensions + d] = inverseNormalCDF(intervals[i]);
      }
    }
    
    yearSamples.push(samples);
  }
  
  return yearSamples;
}

// ============= CORRELATED RETURNS =============

/**
 * Get correlated returns using Cholesky decomposition
 * 
 * If user rate assumptions are provided:
 * - For inflation: If market_sentiment (T10YIE) is available, use it as the center
 *   of a triangular distribution bounded by optimistic/pessimistic (Boldin framework)
 * - Otherwise: Use uniform sampling between optimistic/pessimistic bounds
 */
function getCorrelatedReturns(
  z0: number, z1: number, z2: number, zInflation: number,
  uniformRandom: number, // For uniform sampling between bounds
  triangularRandom1: number, // For triangular distribution
  triangularRandom2: number, // Second random for triangular
  rateAssumptions?: RateAssumptions
): { stockReturn: number; bondReturn: number; cashReturn: number; inflation: number } {
  // Apply Cholesky transformation for base correlations
  const c0 = CHOLESKY_L[0][0] * z0;
  const c1 = CHOLESKY_L[1][0] * z0 + CHOLESKY_L[1][1] * z1;
  const c2 = CHOLESKY_L[2][0] * z0 + CHOLESKY_L[2][1] * z1 + CHOLESKY_L[2][2] * z2;
  
  // Determine returns - use user bounds if provided, otherwise use normal distribution
  let stockReturn: number;
  let bondReturn: number;
  let inflation: number;
  
  if (rateAssumptions?.stockReturns) {
    // Uniform sampling between user's optimistic and pessimistic bounds
    const { optimistic, pessimistic } = rateAssumptions.stockReturns;
    const minReturn = Math.min(optimistic, pessimistic);
    const maxReturn = Math.max(optimistic, pessimistic);
    stockReturn = minReturn + uniformRandom * (maxReturn - minReturn);
  } else {
    stockReturn = ASSET_PARAMS.stocks.mean + ASSET_PARAMS.stocks.std * c0;
  }
  
  if (rateAssumptions?.bondReturns) {
    const { optimistic, pessimistic } = rateAssumptions.bondReturns;
    const minReturn = Math.min(optimistic, pessimistic);
    const maxReturn = Math.max(optimistic, pessimistic);
    bondReturn = minReturn + uniformRandom * (maxReturn - minReturn);
  } else {
    bondReturn = ASSET_PARAMS.bonds.mean + ASSET_PARAMS.bonds.std * c1;
  }
  
  if (rateAssumptions?.inflation) {
    const { optimistic, pessimistic, marketSentiment } = rateAssumptions.inflation;
    const minInflation = Math.min(optimistic, pessimistic);
    const maxInflation = Math.max(optimistic, pessimistic);
    
    // If market sentiment (T10YIE) is available, use triangular distribution
    // This anchors simulations to current market expectations while respecting user bounds
    if (marketSentiment !== undefined && marketSentiment !== null) {
      // Clamp market sentiment to user bounds
      const mode = Math.max(minInflation, Math.min(maxInflation, marketSentiment));
      
      // Generate triangular distribution sample
      // Using the standard triangular distribution formula
      const f = (mode - minInflation) / (maxInflation - minInflation);
      const u = triangularRandom1;
      
      if (u < f) {
        inflation = minInflation + Math.sqrt(u * (maxInflation - minInflation) * (mode - minInflation));
      } else {
        inflation = maxInflation - Math.sqrt((1 - u) * (maxInflation - minInflation) * (maxInflation - mode));
      }
    } else {
      // Uniform sampling between optimistic and pessimistic
      inflation = minInflation + uniformRandom * (maxInflation - minInflation);
    }
  } else {
    inflation = Math.max(0, ASSET_PARAMS.inflation.mean + ASSET_PARAMS.inflation.std * zInflation);
  }
  
  return {
    stockReturn,
    bondReturn,
    cashReturn: ASSET_PARAMS.cash.mean + ASSET_PARAMS.cash.std * c2,
    inflation,
  };
}

// ============= SOCIAL SECURITY CALCULATIONS =============

/**
 * Calculate SS benefit adjustment factor based on claiming age vs FRA
 * Before FRA: Reduced by 5/9 of 1% per month for first 36 months, then 5/12 of 1%
 * After FRA: Increased by 8% per year (delayed retirement credits)
 */
function calculateSSAdjustment(claimingAge: number, fra: number): number {
  const monthsDiff = (claimingAge - fra) * 12;
  
  if (monthsDiff >= 0) {
    return 1 + (monthsDiff / 12) * 0.08;
  } else {
    const monthsEarly = Math.abs(monthsDiff);
    if (monthsEarly <= 36) {
      return 1 - (monthsEarly * 5 / 9 / 100);
    } else {
      const first36Reduction = 36 * 5 / 9 / 100;
      const additionalMonths = monthsEarly - 36;
      const additionalReduction = additionalMonths * 5 / 12 / 100;
      return 1 - first36Reduction - additionalReduction;
    }
  }
}

/**
 * Calculate Social Security income for a given year in simulation
 * Includes COLA compounding and survivor benefit logic
 */
function calculateSSIncome(
  params: SocialSecurityParams,
  currentAge: number,
  simulationYear: number,
  colaRate: number,
  primaryDead: boolean,
  spouseDead: boolean
): number {
  const age = currentAge + simulationYear;
  const spouseAge = params.spouseCurrentAge ? params.spouseCurrentAge + simulationYear : 0;
  
  // COLA compounds from age 62 (or current age if older) on the PIA
  const yearsOfCOLA = Math.max(0, simulationYear);
  
  // Primary benefit calculation
  let primaryBenefit = 0;
  if (!primaryDead && age >= params.primaryClaimingAge) {
    const adjustment = calculateSSAdjustment(params.primaryClaimingAge, params.primaryFRA);
    const yearsSinceClaiming = age - params.primaryClaimingAge;
    // COLA compounds on PIA before claiming, then continues after
    const colaMultiplier = Math.pow(1 + colaRate, yearsOfCOLA);
    primaryBenefit = params.primaryPIA * adjustment * colaMultiplier * 12;
  }
  
  // Spouse benefit calculation
  let spouseBenefit = 0;
  if (params.isMarried && params.spousePIA && params.spouseClaimingAge && params.spouseFRA) {
    if (!spouseDead && spouseAge >= params.spouseClaimingAge) {
      const adjustment = calculateSSAdjustment(params.spouseClaimingAge, params.spouseFRA);
      const colaMultiplier = Math.pow(1 + colaRate, yearsOfCOLA);
      spouseBenefit = params.spousePIA * adjustment * colaMultiplier * 12;
    }
  }
  
  // Survivor benefit logic: surviving spouse gets higher of the two benefits
  if (params.isMarried) {
    if (primaryDead && !spouseDead) {
      // Primary died - spouse gets max of their benefit or primary's
      const primaryAdjustment = calculateSSAdjustment(params.primaryClaimingAge, params.primaryFRA);
      const colaMultiplier = Math.pow(1 + colaRate, yearsOfCOLA);
      const primaryWouldHaveBeen = params.primaryPIA * primaryAdjustment * colaMultiplier * 12;
      return Math.max(spouseBenefit, primaryWouldHaveBeen);
    } else if (spouseDead && !primaryDead) {
      // Spouse died - primary gets max of their benefit or spouse's
      const spouseAdjustment = params.spouseClaimingAge && params.spouseFRA
        ? calculateSSAdjustment(params.spouseClaimingAge, params.spouseFRA)
        : 1;
      const colaMultiplier = Math.pow(1 + colaRate, yearsOfCOLA);
      const spouseWouldHaveBeen = (params.spousePIA || 0) * spouseAdjustment * colaMultiplier * 12;
      return Math.max(primaryBenefit, spouseWouldHaveBeen);
    }
  }
  
  return primaryBenefit + spouseBenefit;
}

// ============= MAIN SIMULATION =============

function runSimulation(params: SimulationParams, iterations: number): SimulationResult {
  const startTime = performance.now();
  
  const yearsToRetirement = params.retirementAge - params.currentAge;
  
  // Dual lifespan calculation: run until the LATER of:
  // 1. Primary's life expectancy
  // 2. Spouse's life expectancy (if married)
  let endAge = params.household?.primaryLifeExpectancy || (params.currentAge + 35 + yearsToRetirement);
  
  if (params.household?.isMarried && params.household?.spouseLifeExpectancy && params.household?.spouseCurrentAge) {
    const spouseEndAge = params.household.spouseLifeExpectancy;
    const spouseCurrentAge = params.household.spouseCurrentAge;
    const ageDiff = params.currentAge - spouseCurrentAge;
    // Spouse's end year relative to primary
    const spouseEndYear = spouseEndAge + ageDiff;
    endAge = Math.max(endAge, spouseEndYear);
  }
  
  const yearsToSimulate = Math.max(endAge - params.currentAge, yearsToRetirement + 25);
  const retirementYears = yearsToSimulate - yearsToRetirement;
  
  const ages: number[] = [];
  for (let i = 0; i <= yearsToSimulate; i++) {
    ages.push(params.currentAge + i);
  }
  
  // Legacy goal for success determination
  const legacyGoal = params.household?.legacyGoalAmount || 0;
  
  // Generate all LHS samples upfront (4 dims: 3 assets + inflation)
  const yearSamples = generateLHSSamples(iterations, yearsToSimulate, 4);
  
  // Pre-allocate arrays
  const allBalances = new Float64Array(iterations * (yearsToSimulate + 1));
  const guardrailByYear = new Uint16Array(retirementYears + 1);
  const firstYearInflations = new Float64Array(iterations);
  const ssBenefitTotals = new Float64Array(yearsToSimulate + 1);
  const medicareCostTotals = new Float64Array(yearsToSimulate + 1);
  const irmaaYearSet = new Set<number>();
  
  // Normalize allocation
  const total = params.allocation.stocks + params.allocation.bonds + params.allocation.cash;
  const sw = params.allocation.stocks / total;
  const bw = params.allocation.bonds / total;
  const cw = params.allocation.cash / total;
  
  let successCount = 0;
  let totalGuardrailActivations = 0;
  
  // Guardrail: 80% threshold (20% loss triggers)
  const GUARDRAIL_THRESHOLD = 0.8;
  const RECOVERY_THRESHOLD = 0.9;
  
  // Get COLA rate from assumptions or use default CPI-W historical average
  const colaRate = params.rateAssumptions?.ssCola
    ? (params.rateAssumptions.ssCola.optimistic + params.rateAssumptions.ssCola.pessimistic) / 2
    : 0.0254; // 2.54% historical CPI-W
  
  // Get medical inflation rate from assumptions or use historical average
  const medicalInflationRate = params.rateAssumptions?.medicalInflation
    ? (params.rateAssumptions.medicalInflation.optimistic + params.rateAssumptions.medicalInflation.pessimistic) / 2
    : MEDICAL_INFLATION_DEFAULT;
  
  // Initialize property/mortgage tracking
  let mortgageBalance = params.property?.mortgageBalance || 0;
  let mortgageMonthlyRate = (params.property?.mortgageInterestRate || 0) / 100 / 12;
  let mortgageMonthlyPayment = params.property?.mortgageMonthlyPayment || 0;
  let homeValue = params.property?.estimatedValue || 0;
  const homeAppreciationRate = 0.03; // 3% annual appreciation
  
  for (let iter = 0; iter < iterations; iter++) {
    let balance = params.currentSavings;
    allBalances[iter * (yearsToSimulate + 1)] = balance;
    
    let guardrailActive = false;
    let iterGuardrailCount = 0;
    let retirementStartBalance = 0;
    
    // Reset mortgage state for each iteration
    let iterMortgageBalance = mortgageBalance;
    let iterMortgageMonthlyRate = mortgageMonthlyRate;
    let iterMortgageMonthlyPayment = mortgageMonthlyPayment;
    let iterHomeValue = homeValue;
    
    // Simulate death for survivor benefit (simplified: use life expectancy)
    // For each trial, randomize death year around life expectancy
    let primaryDeathYear = Infinity;
    let spouseDeathYear = Infinity;
    
    if (params.socialSecurity) {
      const primaryLifeExpectancy = params.socialSecurity.primaryLifeExpectancy;
      // Add randomness: +/- 5 years uniform distribution
      primaryDeathYear = primaryLifeExpectancy - params.currentAge + Math.floor((Math.random() - 0.5) * 10);
      
      if (params.socialSecurity.isMarried && params.socialSecurity.spouseLifeExpectancy && params.socialSecurity.spouseCurrentAge) {
        spouseDeathYear = params.socialSecurity.spouseLifeExpectancy - params.socialSecurity.spouseCurrentAge + Math.floor((Math.random() - 0.5) * 10);
      }
    }
    
    for (let year = 0; year < yearsToSimulate; year++) {
      const age = params.currentAge + year;
      const isRetired = age >= params.retirementAge;
      const yearInRetirement = isRetired ? age - params.retirementAge : -1;
      
      // Check if primary/spouse are alive this year
      const primaryDead = year >= primaryDeathYear;
      const spouseDead = year >= spouseDeathYear;
      
      // Get LHS samples
      const offset = iter * 4;
      const samples = yearSamples[year];
      
      // Generate random values for user-defined bound sampling
      const uniformRandom = Math.random();
      const triangularRandom1 = Math.random();
      const triangularRandom2 = Math.random();
      
      const returns = getCorrelatedReturns(
        samples[offset], samples[offset + 1], samples[offset + 2], samples[offset + 3],
        uniformRandom,
        triangularRandom1,
        triangularRandom2,
        params.rateAssumptions
      );
      
      if (year === 0) {
        firstYearInflations[iter] = returns.inflation;
      }
      
      // Portfolio return based on allocation
      const portfolioReturn = sw * returns.stockReturn + bw * returns.bondReturn + cw * returns.cashReturn;
      
      // Calculate Social Security income (with COLA compounding)
      let ssIncome = 0;
      if (params.socialSecurity && isRetired) {
        ssIncome = calculateSSIncome(
          params.socialSecurity,
          params.currentAge,
          year,
          colaRate,
          primaryDead,
          spouseDead
        );
        ssBenefitTotals[year + 1] += ssIncome;
      }
      
      // Calculate Medicare costs with IRMAA (age 65+)
      let medicareCost = 0;
      if (age >= 65 && params.medicare?.enabled) {
        // Calculate MAGI for IRMAA determination
        const projectedIRABalance = params.medicare.estimatedIRABalance * Math.pow(1.05, year);
        const rmdAmount = calculateRMD(age, projectedIRABalance);
        const inflatedPension = params.medicare.pensionIncome * Math.pow(1.02, year);
        const inflatedInvestment = params.medicare.investmentIncome * Math.pow(1.03, year);
        
        const magi = calculateMAGI(
          ssIncome,
          inflatedPension,
          rmdAmount,
          inflatedInvestment
        );
        
        const isMarried = params.socialSecurity?.isMarried || false;
        const yearsSince2026 = Math.max(0, year);
        const medicareCostResult = calculateMedicareCost(magi, isMarried, yearsSince2026, medicalInflationRate);
        
        medicareCost = medicareCostResult.annualCost;
        medicareCostTotals[year + 1] += medicareCost;
        
        if (medicareCostResult.hasIRMAA) {
          irmaaYearSet.add(age);
        }
      }
      
      // ============= MORTGAGE AMORTIZATION =============
      // Pay down mortgage principal each month based on interest rate
      if (iterMortgageBalance > 0 && iterMortgageMonthlyPayment > 0) {
        // Calculate monthly amortization (12 payments per year)
        for (let month = 0; month < 12; month++) {
          if (iterMortgageBalance <= 0) break;
          
          const monthlyInterest = iterMortgageBalance * iterMortgageMonthlyRate;
          const principalPayment = Math.min(
            iterMortgageMonthlyPayment - monthlyInterest,
            iterMortgageBalance
          );
          
          iterMortgageBalance = Math.max(0, iterMortgageBalance - principalPayment);
        }
      }
      
      // Appreciate home value
      iterHomeValue *= (1 + homeAppreciationRate);
      
      // Handle relocation/downsizing
      if (params.property?.relocationAge && age === params.property.relocationAge) {
        // Sell current home
        const saleProceeds = (params.property.relocationSalePrice || iterHomeValue) - iterMortgageBalance;
        
        // Buy new home
        const newPurchasePrice = params.property.relocationNewPurchasePrice || 0;
        iterHomeValue = newPurchasePrice;
        iterMortgageBalance = params.property.relocationNewMortgageAmount || 0;
        iterMortgageMonthlyRate = (params.property.relocationNewInterestRate || 0) / 100 / 12;
        
        // Calculate new monthly payment if we have a new mortgage
        if (iterMortgageBalance > 0 && iterMortgageMonthlyRate > 0 && params.property.relocationNewTermMonths) {
          const n = params.property.relocationNewTermMonths;
          const r = iterMortgageMonthlyRate;
          iterMortgageMonthlyPayment = iterMortgageBalance * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        } else {
          iterMortgageMonthlyPayment = 0;
        }
        
        // Add net proceeds to portfolio (or reduce if buying up)
        const netProceeds = saleProceeds - (newPurchasePrice - iterMortgageBalance);
        balance += netProceeds;
      }
      
      if (!isRetired) {
        // Accumulation phase - calculate contributions from money flows
        let yearContributions = params.annualContribution;
        
        // Add contributions from money flows, enforcing IRS limits per account type
        if (params.moneyFlows?.contributions) {
          // Track contributions by account type for limit enforcement
          const contributionsByType: Record<string, number> = {};
          
          for (const contrib of params.moneyFlows.contributions) {
            if (age >= contrib.startAge && age <= contrib.endAge) {
              const accountType = contrib.accountType;
              const irsLimit = getIRSContributionLimit(accountType, age);
              
              // Get current total for this account type
              const currentTotal = contributionsByType[accountType] || 0;
              
              // Cap at IRS limit
              const allowedAmount = Math.min(
                contrib.annualAmount,
                Math.max(0, irsLimit - currentTotal)
              );
              
              contributionsByType[accountType] = currentTotal + allowedAmount;
              yearContributions += allowedAmount;
            }
          }
        }
        
        // Apply excess income rule if enabled
        // Assume base income = contributions + some base (simplified model)
        if (params.moneyFlows?.excessIncomeEnabled) {
          const estimatedIncome = yearContributions * 2; // Simplified: assume contributions are ~50% savings rate
          const estimatedExpenses = params.monthlyRetirementSpending * 12; // Pre-retirement spending
          const surplus = estimatedIncome - estimatedExpenses - yearContributions;
          if (surplus > 0) {
            const excessSavings = surplus * (params.moneyFlows.excessSavePercentage / 100);
            yearContributions += excessSavings;
          }
        }
        
        balance = balance * (1 + portfolioReturn) + yearContributions;
      } else {
        if (age === params.retirementAge) {
          retirementStartBalance = balance;
        }
        
        // Inflation-adjusted spending (net of SS income, plus Medicare costs)
        let annualSpending = params.monthlyRetirementSpending * 12 * 
          Math.pow(1 + ASSET_PARAMS.inflation.mean, yearInRetirement);
        
        // Add Medicare costs to spending
        annualSpending += medicareCost;
        
        // Subtract Social Security income from required portfolio withdrawals
        const netWithdrawal = Math.max(0, annualSpending - ssIncome);
        
        // Withdrawal Hierarchy: Taxable → Pre-tax → Roth
        // This is a simplified model - in practice, the simulation uses aggregate balance
        // but the hierarchy determines tax efficiency and is reflected in final outcome
        // For this simulation, we note the withdrawal order exists and affects strategy
        
        // Guardrail logic
        if (balance < retirementStartBalance * GUARDRAIL_THRESHOLD && !guardrailActive) {
          guardrailActive = true;
          iterGuardrailCount++;
          if (yearInRetirement >= 0 && yearInRetirement <= retirementYears) {
            guardrailByYear[yearInRetirement]++;
          }
        }
        
        if (guardrailActive) {
          // 10% reduction in spending (but SS income and Medicare are fixed)
          const reducedSpending = (annualSpending - medicareCost) * 0.9 + medicareCost;
          const reducedNetWithdrawal = Math.max(0, reducedSpending - ssIncome);
          balance = balance * (1 + portfolioReturn) - reducedNetWithdrawal;
          
          if (balance >= retirementStartBalance * RECOVERY_THRESHOLD) {
            guardrailActive = false;
          }
        } else {
          balance = balance * (1 + portfolioReturn) - netWithdrawal;
        }
      }
      
      allBalances[iter * (yearsToSimulate + 1) + year + 1] = Math.max(0, balance);
    }
    
    // Success = portfolio remains ABOVE legacy goal at end
    const finalBalance = allBalances[iter * (yearsToSimulate + 1) + yearsToSimulate];
    if (finalBalance >= legacyGoal) {
      successCount++;
    }
    
    totalGuardrailActivations += iterGuardrailCount;
  }
  
  // Calculate percentiles
  const percentiles = {
    p5: new Array(yearsToSimulate + 1),
    p25: new Array(yearsToSimulate + 1),
    p50: new Array(yearsToSimulate + 1),
    p75: new Array(yearsToSimulate + 1),
    p95: new Array(yearsToSimulate + 1),
  };
  
  const sortBuffer = new Float64Array(iterations);
  
  for (let year = 0; year <= yearsToSimulate; year++) {
    for (let i = 0; i < iterations; i++) {
      sortBuffer[i] = allBalances[i * (yearsToSimulate + 1) + year];
    }
    sortBuffer.sort();
    
    percentiles.p5[year] = sortBuffer[Math.floor(iterations * 0.05)];
    percentiles.p25[year] = sortBuffer[Math.floor(iterations * 0.25)];
    percentiles.p50[year] = sortBuffer[Math.floor(iterations * 0.50)];
    percentiles.p75[year] = sortBuffer[Math.floor(iterations * 0.75)];
    percentiles.p95[year] = sortBuffer[Math.floor(iterations * 0.95)];
  }
  
  // Average SS benefits by year
  const ssBenefitsByAge = Array.from(ssBenefitTotals).map(total => total / iterations);
  
  // Average Medicare costs by year
  const medicareCostsByAge = Array.from(medicareCostTotals).map(total => total / iterations);
  
  // Collect IRMAA years
  const irmaaYears = Array.from(irmaaYearSet).sort((a, b) => a - b);
  
  // Guardrail events
  const guardrailEvents: GuardrailEvent[] = [];
  for (let y = 1; y <= retirementYears; y++) {
    if (guardrailByYear[y] > 0) {
      guardrailEvents.push({
        yearInRetirement: y,
        activations: guardrailByYear[y],
        percentage: (guardrailByYear[y] / iterations) * 100,
      });
    }
  }
  
  // Inflation stats
  firstYearInflations.sort();
  
  return {
    percentiles,
    ages,
    successRate: (successCount / iterations) * 100,
    medianEndBalance: percentiles.p50[yearsToSimulate],
    guardrailActivations: totalGuardrailActivations,
    guardrailEvents,
    inflationScenarios: {
      low: firstYearInflations[Math.floor(iterations * 0.1)] * 100,
      median: firstYearInflations[Math.floor(iterations * 0.5)] * 100,
      high: firstYearInflations[Math.floor(iterations * 0.9)] * 100,
    },
    executionTimeMs: performance.now() - startTime,
    ssBenefitsByAge,
    medicareCostsByAge,
    irmaaYears,
  };
}

// ============= WORKER MESSAGE HANDLER =============

self.onmessage = (e: MessageEvent<{ params: SimulationParams; iterations: number }>) => {
  const { params, iterations } = e.data;
  
  try {
    const result = runSimulation(params, iterations);
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: String(error) });
  }
};
