/**
 * Monte Carlo Simulation Engine with:
 * - Latin Hypercube Sampling (LHS) for 5,000 iterations
 * - Cholesky Decomposition for correlated asset returns
 * - Stochastic inflation modeling
 * - Dynamic spending guardrails
 */

export interface SimulationParams {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  annualContribution: number;
  monthlyRetirementSpending: number;
  expectedReturn: number;
  inflationRate: number;
  stockAllocation: number; // 0 to 1
  bondAllocation: number;  // 0 to 1
}

export interface SimulationResult {
  percentiles: {
    p5: number[];   // 5th percentile (pessimistic)
    p25: number[];  // 25th percentile
    p50: number[];  // 50th percentile (median)
    p75: number[];  // 75th percentile
    p95: number[];  // 95th percentile (optimistic)
  };
  ages: number[];
  successRate: number;
  medianEndBalance: number;
  guardrailActivations: number;
  inflationScenarios: {
    low: number;
    median: number;
    high: number;
  };
}

// Historical parameters for asset classes (based on long-term data)
const ASSET_PARAMS = {
  stocks: { mean: 0.10, std: 0.18 },   // ~10% return, 18% volatility
  bonds: { mean: 0.05, std: 0.06 },    // ~5% return, 6% volatility
  cash: { mean: 0.02, std: 0.01 },     // ~2% return, 1% volatility
  inflation: { mean: 0.03, std: 0.015 } // ~3% inflation, 1.5% volatility
};

// Historical correlation matrix (Stocks, Bonds, Inflation)
const CORRELATION_MATRIX = [
  [1.0,  0.2,  0.1],   // Stocks
  [0.2,  1.0,  0.4],   // Bonds (moderate correlation with inflation)
  [0.1,  0.4,  1.0],   // Inflation
];

/**
 * Cholesky Decomposition
 * Converts correlation matrix to lower triangular matrix for generating correlated random variables
 */
function choleskyDecomposition(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

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

/**
 * Latin Hypercube Sampling
 * Creates stratified samples across the probability distribution
 */
function latinHypercubeSample(n: number, dimensions: number): number[][] {
  const samples: number[][] = [];
  
  // Create stratified intervals for each dimension
  const intervals: number[][] = [];
  for (let d = 0; d < dimensions; d++) {
    const dimIntervals: number[] = [];
    for (let i = 0; i < n; i++) {
      // Sample uniformly within each stratum
      const lower = i / n;
      const upper = (i + 1) / n;
      dimIntervals.push(lower + Math.random() * (upper - lower));
    }
    // Shuffle the intervals for this dimension
    for (let i = dimIntervals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dimIntervals[i], dimIntervals[j]] = [dimIntervals[j], dimIntervals[i]];
    }
    intervals.push(dimIntervals);
  }
  
  // Combine into samples
  for (let i = 0; i < n; i++) {
    const sample: number[] = [];
    for (let d = 0; d < dimensions; d++) {
      // Transform uniform to standard normal using inverse CDF (Box-Muller approximation)
      sample.push(inverseNormalCDF(intervals[d][i]));
    }
    samples.push(sample);
  }
  
  return samples;
}

/**
 * Inverse Normal CDF (Approximation using Beasley-Springer-Moro algorithm)
 */
function inverseNormalCDF(p: number): number {
  // Clamp to avoid infinity
  p = Math.max(0.0001, Math.min(0.9999, p));
  
  const a = [
    -3.969683028665376e+01,
     2.209460984245205e+02,
    -2.759285104469687e+02,
     1.383577518672690e+02,
    -3.066479806614716e+01,
     2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01,
     1.615858368580409e+02,
    -1.556989798598866e+02,
     6.680131188771972e+01,
    -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03,
    -3.223964580411365e-01,
    -2.400758277161838e+00,
    -2.549732539343734e+00,
     4.374664141464968e+00,
     2.938163982698783e+00
  ];
  const d = [
     7.784695709041462e-03,
     3.224671290700398e-01,
     2.445134137142996e+00,
     3.754408661907416e+00
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
           ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5])*q /
           (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q + c[1])*q + c[2])*q + c[3])*q + c[4])*q + c[5]) /
            ((((d[0]*q + d[1])*q + d[2])*q + d[3])*q + 1);
  }
}

/**
 * Apply Cholesky matrix to generate correlated returns
 */
function generateCorrelatedReturns(
  uncorrelatedSamples: number[],
  choleskyL: number[][],
  params: { stocks: typeof ASSET_PARAMS.stocks; bonds: typeof ASSET_PARAMS.bonds; inflation: typeof ASSET_PARAMS.inflation }
): { stockReturn: number; bondReturn: number; inflationRate: number } {
  // Apply Cholesky transformation: correlatedZ = L * uncorrelatedZ
  const correlatedZ = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j <= i; j++) {
      correlatedZ[i] += choleskyL[i][j] * uncorrelatedSamples[j];
    }
  }

  // Transform to actual returns: return = mean + std * z
  return {
    stockReturn: params.stocks.mean + params.stocks.std * correlatedZ[0],
    bondReturn: params.bonds.mean + params.bonds.std * correlatedZ[1],
    inflationRate: Math.max(0, params.inflation.mean + params.inflation.std * correlatedZ[2]),
  };
}

/**
 * Run Monte Carlo simulation with LHS, Cholesky decomposition, and guardrails
 */
export function runMonteCarloSimulation(
  params: SimulationParams,
  iterations: number = 5000
): SimulationResult {
  const yearsToSimulate = (params.retirementAge - params.currentAge) + 35; // +35 years post-retirement
  const ages = Array.from({ length: yearsToSimulate + 1 }, (_, i) => params.currentAge + i);
  
  // Precompute Cholesky decomposition
  const choleskyL = choleskyDecomposition(CORRELATION_MATRIX);
  
  // Generate LHS samples for all years and iterations
  // Each year needs 3 dimensions: stock return, bond return, inflation
  const totalSamples = iterations;
  const allTrials: number[][] = [];
  
  // Run simulation for each iteration
  let successCount = 0;
  let totalGuardrailActivations = 0;
  const finalBalances: number[] = [];
  const allInflations: number[] = [];
  
  // Generate LHS samples per year (we'll need samples for each year independently)
  const yearSamples: number[][][] = [];
  for (let year = 0; year < yearsToSimulate; year++) {
    yearSamples.push(latinHypercubeSample(iterations, 3));
  }
  
  for (let iter = 0; iter < iterations; iter++) {
    let balance = params.currentSavings;
    const balanceHistory: number[] = [balance];
    let guardrailActive = false;
    let iterGuardrailCount = 0;
    const startingRetirementBalance = 0;
    let retirementStartBalance = 0;
    
    let cumulativeInflation = 1;
    
    for (let year = 0; year < yearsToSimulate; year++) {
      const age = params.currentAge + year;
      const isRetired = age >= params.retirementAge;
      
      // Get correlated returns using this year's LHS sample for this iteration
      const yearSample = yearSamples[year][iter];
      const { stockReturn, bondReturn, inflationRate } = generateCorrelatedReturns(
        yearSample,
        choleskyL,
        ASSET_PARAMS
      );
      
      // Track inflation
      if (year === 0) {
        allInflations.push(inflationRate);
      }
      cumulativeInflation *= (1 + inflationRate);
      
      // Calculate portfolio return based on allocation
      const cashAllocation = Math.max(0, 1 - params.stockAllocation - params.bondAllocation);
      const portfolioReturn = 
        params.stockAllocation * stockReturn +
        params.bondAllocation * bondReturn +
        cashAllocation * ASSET_PARAMS.cash.mean;
      
      if (!isRetired) {
        // Accumulation phase
        balance = balance * (1 + portfolioReturn) + params.annualContribution;
      } else {
        // Store retirement start balance for guardrail calculation
        if (age === params.retirementAge) {
          retirementStartBalance = balance;
        }
        
        // Calculate inflation-adjusted spending
        const yearsInRetirement = age - params.retirementAge;
        let annualSpending = params.monthlyRetirementSpending * 12 * 
          Math.pow(1 + ASSET_PARAMS.inflation.mean, yearsInRetirement);
        
        // Dynamic Spending Guardrails
        // If portfolio drops below 80% of starting retirement balance, reduce spending by 10%
        if (balance < retirementStartBalance * 0.8 && !guardrailActive) {
          guardrailActive = true;
          iterGuardrailCount++;
        }
        
        if (guardrailActive) {
          annualSpending *= 0.9; // 10% spending reduction
          // Check if we can deactivate guardrail (portfolio recovered to 90% of start)
          if (balance >= retirementStartBalance * 0.9) {
            guardrailActive = false;
          }
        }
        
        // Apply returns and withdrawals
        balance = balance * (1 + portfolioReturn * 0.7) - annualSpending; // Reduced return in retirement
      }
      
      balanceHistory.push(Math.max(0, balance));
    }
    
    allTrials.push(balanceHistory);
    finalBalances.push(balanceHistory[balanceHistory.length - 1]);
    
    // Success = still has money at the end
    if (balanceHistory[balanceHistory.length - 1] > 0) {
      successCount++;
    }
    
    totalGuardrailActivations += iterGuardrailCount;
  }
  
  // Calculate percentiles for each year
  const percentiles = {
    p5: [] as number[],
    p25: [] as number[],
    p50: [] as number[],
    p75: [] as number[],
    p95: [] as number[],
  };
  
  for (let year = 0; year <= yearsToSimulate; year++) {
    const yearBalances = allTrials.map(trial => trial[year]).sort((a, b) => a - b);
    
    percentiles.p5.push(yearBalances[Math.floor(iterations * 0.05)]);
    percentiles.p25.push(yearBalances[Math.floor(iterations * 0.25)]);
    percentiles.p50.push(yearBalances[Math.floor(iterations * 0.50)]);
    percentiles.p75.push(yearBalances[Math.floor(iterations * 0.75)]);
    percentiles.p95.push(yearBalances[Math.floor(iterations * 0.95)]);
  }
  
  // Calculate inflation scenarios
  const sortedInflations = allInflations.sort((a, b) => a - b);
  
  return {
    percentiles,
    ages,
    successRate: (successCount / iterations) * 100,
    medianEndBalance: percentiles.p50[percentiles.p50.length - 1],
    guardrailActivations: totalGuardrailActivations,
    inflationScenarios: {
      low: sortedInflations[Math.floor(iterations * 0.1)] * 100,
      median: sortedInflations[Math.floor(iterations * 0.5)] * 100,
      high: sortedInflations[Math.floor(iterations * 0.9)] * 100,
    },
  };
}
