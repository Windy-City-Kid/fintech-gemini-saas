/**
 * Monte Carlo Simulation Engine with:
 * - Latin Hypercube Sampling (LHS) for 5,000 iterations
 * - Cholesky Decomposition for correlated 5-asset returns
 * - Stochastic inflation modeling
 * - Dynamic spending guardrails with event tracking
 */

import { AssetAllocation } from '@/lib/assetClassification';
import { 
  ASSET_PARAMS_EXTENDED, 
  CHOLESKY_L,
  generateCorrelatedReturns,
  calculatePortfolioReturn,
} from '@/lib/correlationMatrix';

export interface SimulationParams {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  annualContribution: number;
  monthlyRetirementSpending: number;
  expectedReturn: number;
  inflationRate: number;
  allocation: AssetAllocation; // 5-asset allocation
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
  guardrailActivations: number;
  guardrailEvents: GuardrailEvent[];
  inflationScenarios: {
    low: number;
    median: number;
    high: number;
  };
}

/**
 * Latin Hypercube Sampling
 * Creates stratified samples across the probability distribution
 */
function latinHypercubeSample(n: number, dimensions: number): number[][] {
  const samples: number[][] = [];
  
  const intervals: number[][] = [];
  for (let d = 0; d < dimensions; d++) {
    const dimIntervals: number[] = [];
    for (let i = 0; i < n; i++) {
      const lower = i / n;
      const upper = (i + 1) / n;
      dimIntervals.push(lower + Math.random() * (upper - lower));
    }
    // Shuffle
    for (let i = dimIntervals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dimIntervals[i], dimIntervals[j]] = [dimIntervals[j], dimIntervals[i]];
    }
    intervals.push(dimIntervals);
  }
  
  for (let i = 0; i < n; i++) {
    const sample: number[] = [];
    for (let d = 0; d < dimensions; d++) {
      sample.push(inverseNormalCDF(intervals[d][i]));
    }
    samples.push(sample);
  }
  
  return samples;
}

/**
 * Inverse Normal CDF (Beasley-Springer-Moro algorithm)
 */
function inverseNormalCDF(p: number): number {
  p = Math.max(0.0001, Math.min(0.9999, p));
  
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
    1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
    6.680131188771972e+01, -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
    -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
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
 * Run Monte Carlo simulation with LHS, 5-asset Cholesky decomposition, and guardrails
 */
export function runMonteCarloSimulation(
  params: SimulationParams,
  iterations: number = 5000
): SimulationResult {
  const yearsToRetirement = params.retirementAge - params.currentAge;
  const retirementYears = 35;
  const yearsToSimulate = yearsToRetirement + retirementYears;
  const ages = Array.from({ length: yearsToSimulate + 1 }, (_, i) => params.currentAge + i);
  
  // Track guardrail activations by year in retirement
  const guardrailByYear: number[] = new Array(retirementYears + 1).fill(0);
  
  const allTrials: number[][] = [];
  let successCount = 0;
  let totalGuardrailActivations = 0;
  const allInflations: number[] = [];
  
  // Generate LHS samples: 6 dimensions (5 assets + inflation) per year
  const yearSamples: number[][][] = [];
  for (let year = 0; year < yearsToSimulate; year++) {
    yearSamples.push(latinHypercubeSample(iterations, 6));
  }
  
  for (let iter = 0; iter < iterations; iter++) {
    let balance = params.currentSavings;
    const balanceHistory: number[] = [balance];
    let guardrailActive = false;
    let iterGuardrailCount = 0;
    let retirementStartBalance = 0;
    let cumulativeInflation = 1;
    
    for (let year = 0; year < yearsToSimulate; year++) {
      const age = params.currentAge + year;
      const isRetired = age >= params.retirementAge;
      const yearInRetirement = isRetired ? age - params.retirementAge : -1;
      
      // Get correlated returns using 6x6 Cholesky matrix
      const yearSample = yearSamples[year][iter];
      const returns = generateCorrelatedReturns(yearSample);
      
      // Track inflation for first year
      if (year === 0) {
        allInflations.push(returns.inflation);
      }
      cumulativeInflation *= (1 + returns.inflation);
      
      // Calculate weighted portfolio return
      const portfolioReturn = calculatePortfolioReturn(returns, params.allocation);
      
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
          Math.pow(1 + ASSET_PARAMS_EXTENDED.inflation.mean, yearInRetirement);
        
        // Dynamic Spending Guardrails
        const guardrailThreshold = retirementStartBalance * 0.8;
        const recoveryThreshold = retirementStartBalance * 0.9;
        
        if (balance < guardrailThreshold && !guardrailActive) {
          guardrailActive = true;
          iterGuardrailCount++;
          // Track which year in retirement the guardrail activated
          if (yearInRetirement >= 0 && yearInRetirement < guardrailByYear.length) {
            guardrailByYear[yearInRetirement]++;
          }
        }
        
        if (guardrailActive) {
          annualSpending *= 0.9; // 10% spending reduction
          if (balance >= recoveryThreshold) {
            guardrailActive = false;
          }
        }
        
        // Apply returns (slightly reduced in retirement for safety)
        balance = balance * (1 + portfolioReturn * 0.85) - annualSpending;
      }
      
      balanceHistory.push(Math.max(0, balance));
    }
    
    allTrials.push(balanceHistory);
    
    if (balanceHistory[balanceHistory.length - 1] > 0) {
      successCount++;
    }
    
    totalGuardrailActivations += iterGuardrailCount;
  }
  
  // Calculate percentiles
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
  
  // Format guardrail events for chart
  const guardrailEvents: GuardrailEvent[] = guardrailByYear
    .map((activations, yearInRetirement) => ({
      yearInRetirement,
      activations,
      percentage: (activations / iterations) * 100,
    }))
    .filter(e => e.yearInRetirement > 0); // Skip year 0
  
  const sortedInflations = allInflations.sort((a, b) => a - b);
  
  return {
    percentiles,
    ages,
    successRate: (successCount / iterations) * 100,
    medianEndBalance: percentiles.p50[percentiles.p50.length - 1],
    guardrailActivations: totalGuardrailActivations,
    guardrailEvents,
    inflationScenarios: {
      low: sortedInflations[Math.floor(iterations * 0.1)] * 100,
      median: sortedInflations[Math.floor(iterations * 0.5)] * 100,
      high: sortedInflations[Math.floor(iterations * 0.9)] * 100,
    },
  };
}
