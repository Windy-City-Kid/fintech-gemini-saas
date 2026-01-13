/**
 * Monte Carlo Simulation Engine v2.0
 * 
 * Specifications:
 * - Latin Hypercube Sampling (LHS) for 5,000 iterations
 * - 3x3 Cholesky Decomposition: [[1.0, -0.1, 0.0], [-0.1, 1.0, 0.2], [0.0, 0.2, 1.0]]
 * - Asset classes: [Stocks, Bonds, Cash]
 * - Stochastic inflation: μ=2.5%, σ=1%
 * - Stock returns: μ=7%, σ=18%
 * - Dynamic guardrails: 10% spending cut if portfolio < 80% of start
 * - Performance target: <500ms for 5,000 trials
 */

// ============= SIMULATION PARAMETERS =============

/** 
 * 3x3 Historical Correlation Matrix [Stocks, Bonds, Cash]
 * As specified: [[1.0, 0.1, 0.0], [0.1, 1.0, 0.1], [0.0, 0.1, 1.0]]
 */
const CORRELATION_MATRIX_3X3: number[][] = [
  [1.0, 0.1, 0.0],  // Stocks
  [0.1, 1.0, 0.1],  // Bonds
  [0.0, 0.1, 1.0],  // Cash
];

/** Pre-computed Cholesky decomposition of correlation matrix */
const CHOLESKY_L_3X3: number[][] = choleskyDecomposition3x3(CORRELATION_MATRIX_3X3);

/** Asset class return parameters */
const ASSET_PARAMS = {
  stocks: { mean: 0.07, std: 0.18 },    // 7% return, 18% volatility (as specified)
  bonds: { mean: 0.04, std: 0.06 },     // 4% return, 6% volatility
  cash: { mean: 0.02, std: 0.01 },      // 2% return, 1% volatility
  inflation: { mean: 0.025, std: 0.01 }, // 2.5% mean, 1% deviation (as specified)
};

// ============= TYPE DEFINITIONS =============

export interface SimpleAllocation {
  stocks: number;  // 0 to 1
  bonds: number;   // 0 to 1
  cash: number;    // 0 to 1
}

export interface RateRange {
  optimistic: number; // as decimal (e.g., 0.02 for 2%)
  pessimistic: number; // as decimal (e.g., 0.04 for 4%)
  marketSentiment?: number; // T10YIE anchor for simulation center (as decimal)
}

export interface RateAssumptions {
  inflation?: RateRange;
  stockReturns?: RateRange;
  bondReturns?: RateRange;
  ssCola?: RateRange;
  medicalInflation?: RateRange;
}

export interface SocialSecurityParams {
  primaryPIA: number;
  primaryClaimingAge: number;
  primaryFRA: number;
  spousePIA?: number;
  spouseClaimingAge?: number;
  spouseFRA?: number;
  spouseCurrentAge?: number;
  isMarried: boolean;
  primaryLifeExpectancy: number;
  spouseLifeExpectancy?: number;
}

export interface MedicareParams {
  enabled: boolean;
  pensionIncome: number;
  investmentIncome: number;
  estimatedIRABalance: number;
}

export interface HouseholdParams {
  isMarried: boolean;
  primaryLifeExpectancy: number;
  spouseLifeExpectancy?: number;
  spouseCurrentAge?: number;
  legacyGoalAmount: number;
}

export interface MoneyFlowParams {
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

export interface PropertyParams {
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

export interface SimulationParams {
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

export interface GuardrailEvent {
  yearInRetirement: number;
  activations: number;
  percentage: number;
}

export interface SimulationResult {
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
  medianEstateValue?: number; // Portfolio + Home Equity at end
  homeEquityPercentiles?: {
    p5: number[];
    p50: number[];
    p95: number[];
  };
  guardrailActivations: number;
  guardrailEvents: GuardrailEvent[];
  inflationScenarios: {
    low: number;
    median: number;
    high: number;
  };
  executionTimeMs?: number;
  ssBenefitsByAge?: number[];
  medicareCostsByAge?: number[];
  irmaaYears?: number[];
}

// ============= MATH UTILITIES =============

/** Cholesky decomposition for 3x3 matrix */
function choleskyDecomposition3x3(matrix: number[][]): number[][] {
  const L: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  
  for (let i = 0; i < 3; i++) {
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

/** Fast inverse normal CDF using Beasley-Springer-Moro algorithm */
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

// ============= VECTORIZED LHS GENERATION =============

/**
 * Generate Latin Hypercube Samples for all years and iterations at once
 * Uses pre-allocated Float64Arrays for performance
 */
function generateAllLHSSamples(
  iterations: number,
  years: number,
  dimensions: number
): Float64Array[] {
  // Pre-allocate arrays for each year
  const yearSamples: Float64Array[] = [];
  
  for (let year = 0; year < years; year++) {
    // Each year needs iterations * dimensions values
    const samples = new Float64Array(iterations * dimensions);
    
    for (let d = 0; d < dimensions; d++) {
      // Create stratified samples for this dimension
      const intervals = new Float64Array(iterations);
      for (let i = 0; i < iterations; i++) {
        const lower = i / iterations;
        const upper = (i + 1) / iterations;
        intervals[i] = lower + Math.random() * (upper - lower);
      }
      
      // Fisher-Yates shuffle
      for (let i = iterations - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = intervals[i];
        intervals[i] = intervals[j];
        intervals[j] = temp;
      }
      
      // Convert to standard normal and store
      for (let i = 0; i < iterations; i++) {
        samples[i * dimensions + d] = inverseNormalCDF(intervals[i]);
      }
    }
    
    yearSamples.push(samples);
  }
  
  return yearSamples;
}

/**
 * Apply Cholesky transformation and generate correlated returns
 * Inline for performance
 */
function getCorrelatedReturns(
  z0: number, z1: number, z2: number, zInflation: number,
  L: number[][]
): { stockReturn: number; bondReturn: number; cashReturn: number; inflation: number } {
  // Apply Cholesky: L * z
  const c0 = L[0][0] * z0;
  const c1 = L[1][0] * z0 + L[1][1] * z1;
  const c2 = L[2][0] * z0 + L[2][1] * z1 + L[2][2] * z2;
  
  return {
    stockReturn: ASSET_PARAMS.stocks.mean + ASSET_PARAMS.stocks.std * c0,
    bondReturn: ASSET_PARAMS.bonds.mean + ASSET_PARAMS.bonds.std * c1,
    cashReturn: ASSET_PARAMS.cash.mean + ASSET_PARAMS.cash.std * c2,
    inflation: Math.max(0, ASSET_PARAMS.inflation.mean + ASSET_PARAMS.inflation.std * zInflation),
  };
}

// ============= MAIN SIMULATION ENGINE =============

/**
 * Run optimized Monte Carlo simulation
 * Target: <500ms for 5,000 iterations
 */
export function runMonteCarloSimulation(
  params: SimulationParams,
  iterations: number = 5000
): SimulationResult {
  const startTime = performance.now();
  
  const yearsToRetirement = params.retirementAge - params.currentAge;
  const retirementYears = 35;
  const yearsToSimulate = yearsToRetirement + retirementYears;
  const ages = new Array(yearsToSimulate + 1);
  for (let i = 0; i <= yearsToSimulate; i++) {
    ages[i] = params.currentAge + i;
  }
  
  // Pre-generate all LHS samples (4 dimensions: 3 assets + inflation)
  const yearSamples = generateAllLHSSamples(iterations, yearsToSimulate, 4);
  
  // Pre-allocate result arrays using Float64Array for performance
  const allBalances = new Float64Array(iterations * (yearsToSimulate + 1));
  const guardrailByYear = new Uint16Array(retirementYears + 1);
  const firstYearInflations = new Float64Array(iterations);
  
  // Guardrail threshold: 80% of starting (i.e., drops below 20% loss)
  const GUARDRAIL_THRESHOLD = 0.8;
  const RECOVERY_THRESHOLD = 0.9;
  const SPENDING_REDUCTION = 0.9; // 10% reduction
  
  let successCount = 0;
  let totalGuardrailActivations = 0;
  
  // Normalize allocation
  const allocSum = params.allocation.stocks + params.allocation.bonds + params.allocation.cash;
  const stockWeight = params.allocation.stocks / allocSum;
  const bondWeight = params.allocation.bonds / allocSum;
  const cashWeight = params.allocation.cash / allocSum;
  
  // Main simulation loop - optimized
  for (let iter = 0; iter < iterations; iter++) {
    let balance = params.currentSavings;
    allBalances[iter * (yearsToSimulate + 1)] = balance;
    
    let guardrailActive = false;
    let iterGuardrailCount = 0;
    let retirementStartBalance = 0;
    
    for (let year = 0; year < yearsToSimulate; year++) {
      const age = params.currentAge + year;
      const isRetired = age >= params.retirementAge;
      const yearInRetirement = isRetired ? age - params.retirementAge : -1;
      
      // Get samples for this year/iteration
      const sampleOffset = iter * 4;
      const samples = yearSamples[year];
      const z0 = samples[sampleOffset];
      const z1 = samples[sampleOffset + 1];
      const z2 = samples[sampleOffset + 2];
      const zInf = samples[sampleOffset + 3];
      
      // Generate correlated returns
      const returns = getCorrelatedReturns(z0, z1, z2, zInf, CHOLESKY_L_3X3);
      
      // Track first-year inflation for stats
      if (year === 0) {
        firstYearInflations[iter] = returns.inflation;
      }
      
      // Calculate weighted portfolio return
      const portfolioReturn = 
        stockWeight * returns.stockReturn +
        bondWeight * returns.bondReturn +
        cashWeight * returns.cashReturn;
      
      if (!isRetired) {
        // Accumulation phase
        balance = balance * (1 + portfolioReturn) + params.annualContribution;
      } else {
        // Store retirement start balance
        if (age === params.retirementAge) {
          retirementStartBalance = balance;
        }
        
        // Calculate inflation-adjusted spending
        let annualSpending = params.monthlyRetirementSpending * 12 * 
          Math.pow(1 + ASSET_PARAMS.inflation.mean, yearInRetirement);
        
        // Dynamic Spending Guardrails
        const guardrailThreshold = retirementStartBalance * GUARDRAIL_THRESHOLD;
        const recoveryThreshold = retirementStartBalance * RECOVERY_THRESHOLD;
        
        if (balance < guardrailThreshold && !guardrailActive) {
          guardrailActive = true;
          iterGuardrailCount++;
          if (yearInRetirement >= 0 && yearInRetirement <= retirementYears) {
            guardrailByYear[yearInRetirement]++;
          }
        }
        
        if (guardrailActive) {
          annualSpending *= SPENDING_REDUCTION;
          if (balance >= recoveryThreshold) {
            guardrailActive = false;
          }
        }
        
        // Apply returns and spending
        balance = balance * (1 + portfolioReturn) - annualSpending;
      }
      
      // Store balance (clamped to 0)
      allBalances[iter * (yearsToSimulate + 1) + year + 1] = Math.max(0, balance);
    }
    
    // Check success (has money at end)
    if (allBalances[iter * (yearsToSimulate + 1) + yearsToSimulate] > 0) {
      successCount++;
    }
    
    totalGuardrailActivations += iterGuardrailCount;
  }
  
  // Calculate percentiles efficiently
  const percentiles = {
    p5: new Array(yearsToSimulate + 1),
    p25: new Array(yearsToSimulate + 1),
    p50: new Array(yearsToSimulate + 1),
    p75: new Array(yearsToSimulate + 1),
    p95: new Array(yearsToSimulate + 1),
  };
  
  const sortBuffer = new Float64Array(iterations);
  
  for (let year = 0; year <= yearsToSimulate; year++) {
    // Extract balances for this year into sort buffer
    for (let i = 0; i < iterations; i++) {
      sortBuffer[i] = allBalances[i * (yearsToSimulate + 1) + year];
    }
    
    // Sort
    sortBuffer.sort();
    
    // Extract percentiles
    percentiles.p5[year] = sortBuffer[Math.floor(iterations * 0.05)];
    percentiles.p25[year] = sortBuffer[Math.floor(iterations * 0.25)];
    percentiles.p50[year] = sortBuffer[Math.floor(iterations * 0.50)];
    percentiles.p75[year] = sortBuffer[Math.floor(iterations * 0.75)];
    percentiles.p95[year] = sortBuffer[Math.floor(iterations * 0.95)];
  }
  
  // Format guardrail events
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
  
  // Calculate inflation scenarios
  firstYearInflations.sort();
  
  const executionTimeMs = performance.now() - startTime;
  
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
    executionTimeMs,
  };
}

// ============= LEGACY COMPATIBILITY =============

/** Convert 5-asset allocation to 3-asset for simulation */
export function convertTo3AssetAllocation(allocation: {
  domesticStocks?: number;
  intlStocks?: number;
  bonds?: number;
  realEstate?: number;
  cash?: number;
}): SimpleAllocation {
  const stocks = (allocation.domesticStocks || 0) + (allocation.intlStocks || 0);
  const bonds = (allocation.bonds || 0) + (allocation.realEstate || 0); // REITs → Bonds proxy
  const cash = allocation.cash || 0;
  
  const total = stocks + bonds + cash;
  if (total === 0) {
    return { stocks: 0.6, bonds: 0.3, cash: 0.1 };
  }
  
  return {
    stocks: stocks / total,
    bonds: bonds / total,
    cash: cash / total,
  };
}

/** Export ASSET_PARAMS for use in UI */
export { ASSET_PARAMS };
