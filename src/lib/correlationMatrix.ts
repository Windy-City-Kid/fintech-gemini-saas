/**
 * 5x5 Historical Correlation Matrix for Asset Classes
 * Based on long-term historical data (1990-2023)
 * 
 * Asset Classes:
 * 0: Domestic Stocks (US Equities)
 * 1: International Stocks (Developed + Emerging)
 * 2: Bonds (US Aggregate)
 * 3: Real Estate (REITs)
 * 4: Cash (Money Market / T-Bills)
 * 5: Inflation (CPI)
 */

import { AssetAllocation } from './assetClassification';

// Historical return parameters (annualized)
export const ASSET_PARAMS_EXTENDED = {
  domesticStocks: { mean: 0.102, std: 0.175 },   // ~10.2% return, 17.5% volatility
  intlStocks: { mean: 0.085, std: 0.195 },       // ~8.5% return, 19.5% volatility
  bonds: { mean: 0.048, std: 0.055 },            // ~4.8% return, 5.5% volatility
  realEstate: { mean: 0.092, std: 0.185 },       // ~9.2% return, 18.5% volatility (REITs)
  cash: { mean: 0.022, std: 0.012 },             // ~2.2% return, 1.2% volatility
  inflation: { mean: 0.030, std: 0.015 },        // ~3.0% inflation, 1.5% volatility
};

/**
 * 6x6 Historical Correlation Matrix
 * Order: [Domestic Stocks, Intl Stocks, Bonds, Real Estate, Cash, Inflation]
 * 
 * Based on historical data analysis:
 * - Domestic & International stocks: high correlation (~0.82)
 * - Stocks & Bonds: low negative correlation (~-0.10 to 0.20)
 * - Real Estate correlates moderately with stocks (~0.60)
 * - Cash has near-zero correlation with everything
 * - Inflation positively correlated with bonds and cash
 */
export const CORRELATION_MATRIX_6X6: number[][] = [
  // DomStk  IntStk  Bonds   RE     Cash   Infl
  [  1.00,   0.82,   0.05,  0.58,  0.02,  0.05 ], // Domestic Stocks
  [  0.82,   1.00,   0.02,  0.55,  0.01,  0.08 ], // International Stocks
  [  0.05,   0.02,   1.00,  0.18,  0.15,  0.42 ], // Bonds (neg correlation with stocks in crises)
  [  0.58,   0.55,   0.18,  1.00,  0.05,  0.25 ], // Real Estate (REITs)
  [  0.02,   0.01,   0.15,  0.05,  1.00,  0.65 ], // Cash (tracks short-term rates)
  [  0.05,   0.08,   0.42,  0.25,  0.65,  1.00 ], // Inflation
];

/**
 * Cholesky Decomposition
 * Converts correlation matrix to lower triangular matrix for generating correlated random variables
 */
export function choleskyDecomposition(matrix: number[][]): number[][] {
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

// Pre-compute Cholesky decomposition
export const CHOLESKY_L = choleskyDecomposition(CORRELATION_MATRIX_6X6);

/**
 * Generate correlated returns for all asset classes using Cholesky decomposition
 */
export function generateCorrelatedReturns(
  uncorrelatedSamples: number[], // 6 uncorrelated standard normal samples
): {
  domesticStocks: number;
  intlStocks: number;
  bonds: number;
  realEstate: number;
  cash: number;
  inflation: number;
} {
  // Apply Cholesky transformation: correlatedZ = L * uncorrelatedZ
  const correlatedZ = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j <= i; j++) {
      correlatedZ[i] += CHOLESKY_L[i][j] * uncorrelatedSamples[j];
    }
  }

  // Transform to actual returns: return = mean + std * z
  return {
    domesticStocks: ASSET_PARAMS_EXTENDED.domesticStocks.mean + 
                    ASSET_PARAMS_EXTENDED.domesticStocks.std * correlatedZ[0],
    intlStocks: ASSET_PARAMS_EXTENDED.intlStocks.mean + 
                ASSET_PARAMS_EXTENDED.intlStocks.std * correlatedZ[1],
    bonds: ASSET_PARAMS_EXTENDED.bonds.mean + 
           ASSET_PARAMS_EXTENDED.bonds.std * correlatedZ[2],
    realEstate: ASSET_PARAMS_EXTENDED.realEstate.mean + 
                ASSET_PARAMS_EXTENDED.realEstate.std * correlatedZ[3],
    cash: ASSET_PARAMS_EXTENDED.cash.mean + 
          ASSET_PARAMS_EXTENDED.cash.std * correlatedZ[4],
    inflation: Math.max(0, ASSET_PARAMS_EXTENDED.inflation.mean + 
               ASSET_PARAMS_EXTENDED.inflation.std * correlatedZ[5]),
  };
}

/**
 * Calculate weighted portfolio return based on allocation
 */
export function calculatePortfolioReturn(
  returns: ReturnType<typeof generateCorrelatedReturns>,
  allocation: AssetAllocation,
): number {
  return (
    returns.domesticStocks * allocation.domesticStocks +
    returns.intlStocks * allocation.intlStocks +
    returns.bonds * allocation.bonds +
    returns.realEstate * allocation.realEstate +
    returns.cash * allocation.cash
  );
}

/**
 * Get asset class display names for UI
 */
export const ASSET_CLASS_LABELS: Record<keyof AssetAllocation, string> = {
  domesticStocks: 'Domestic Stocks',
  intlStocks: 'International Stocks',
  bonds: 'Bonds',
  realEstate: 'Real Estate',
  cash: 'Cash',
};

/**
 * Get asset class colors for charts
 */
export const ASSET_CLASS_COLORS: Record<keyof AssetAllocation, string> = {
  domesticStocks: 'hsl(152, 76%, 45%)',  // Primary green
  intlStocks: 'hsl(199, 89%, 48%)',      // Blue
  bonds: 'hsl(262, 83%, 58%)',           // Purple
  realEstate: 'hsl(38, 92%, 50%)',       // Orange/Gold
  cash: 'hsl(215, 20%, 65%)',            // Gray
};
