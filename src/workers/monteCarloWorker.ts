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
}

interface SimulationParams {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  annualContribution: number;
  monthlyRetirementSpending: number;
  allocation: SimpleAllocation;
  rateAssumptions?: RateAssumptions;
}

interface GuardrailEvent {
  yearInRetirement: number;
  activations: number;
  percentage: number;
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

// ============= MAIN SIMULATION =============

function runSimulation(params: SimulationParams, iterations: number): SimulationResult {
  const startTime = performance.now();
  
  const yearsToRetirement = params.retirementAge - params.currentAge;
  const retirementYears = 35;
  const yearsToSimulate = yearsToRetirement + retirementYears;
  
  const ages: number[] = [];
  for (let i = 0; i <= yearsToSimulate; i++) {
    ages.push(params.currentAge + i);
  }
  
  // Generate all LHS samples upfront (4 dims: 3 assets + inflation)
  const yearSamples = generateLHSSamples(iterations, yearsToSimulate, 4);
  
  // Pre-allocate arrays
  const allBalances = new Float64Array(iterations * (yearsToSimulate + 1));
  const guardrailByYear = new Uint16Array(retirementYears + 1);
  const firstYearInflations = new Float64Array(iterations);
  
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
      
      if (!isRetired) {
        balance = balance * (1 + portfolioReturn) + params.annualContribution;
      } else {
        if (age === params.retirementAge) {
          retirementStartBalance = balance;
        }
        
        // Inflation-adjusted spending
        let annualSpending = params.monthlyRetirementSpending * 12 * 
          Math.pow(1 + ASSET_PARAMS.inflation.mean, yearInRetirement);
        
        // Guardrail logic
        if (balance < retirementStartBalance * GUARDRAIL_THRESHOLD && !guardrailActive) {
          guardrailActive = true;
          iterGuardrailCount++;
          if (yearInRetirement >= 0 && yearInRetirement <= retirementYears) {
            guardrailByYear[yearInRetirement]++;
          }
        }
        
        if (guardrailActive) {
          annualSpending *= 0.9; // 10% reduction
          if (balance >= retirementStartBalance * RECOVERY_THRESHOLD) {
            guardrailActive = false;
          }
        }
        
        balance = balance * (1 + portfolioReturn) - annualSpending;
      }
      
      allBalances[iter * (yearsToSimulate + 1) + year + 1] = Math.max(0, balance);
    }
    
    if (allBalances[iter * (yearsToSimulate + 1) + yearsToSimulate] > 0) {
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
