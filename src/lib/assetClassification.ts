/**
 * Asset Classification Utility
 * Maps Plaid Holdings ticker symbols to expanded asset classes for the Monte Carlo simulation.
 */

export type AssetClass = 'domesticStocks' | 'intlStocks' | 'bonds' | 'realEstate' | 'cash';

export interface AssetAllocation {
  domesticStocks: number;
  intlStocks: number;
  bonds: number;
  realEstate: number;
  cash: number;
}

// Well-known ticker mappings for classification
const TICKER_MAPPINGS: Record<string, AssetClass> = {
  // Domestic Stock ETFs/Funds
  'VTI': 'domesticStocks',
  'VOO': 'domesticStocks',
  'SPY': 'domesticStocks',
  'IVV': 'domesticStocks',
  'VTSAX': 'domesticStocks',
  'FXAIX': 'domesticStocks',
  'SWTSX': 'domesticStocks',
  'SCHB': 'domesticStocks',
  'ITOT': 'domesticStocks',
  'VV': 'domesticStocks',
  'VB': 'domesticStocks',
  'VXF': 'domesticStocks',
  'VFIAX': 'domesticStocks',
  'VEXAX': 'domesticStocks',
  'VUG': 'domesticStocks',
  'VTV': 'domesticStocks',
  'QQQ': 'domesticStocks',
  'IWM': 'domesticStocks',
  'IWB': 'domesticStocks',
  'IWF': 'domesticStocks',
  'IWD': 'domesticStocks',
  'SWPPX': 'domesticStocks',
  'FSKAX': 'domesticStocks',
  
  // International Stock ETFs/Funds
  'VXUS': 'intlStocks',
  'VEU': 'intlStocks',
  'VEA': 'intlStocks',
  'VWO': 'intlStocks',
  'VTIAX': 'intlStocks',
  'VGTSX': 'intlStocks',
  'IXUS': 'intlStocks',
  'IEFA': 'intlStocks',
  'IEMG': 'intlStocks',
  'EFA': 'intlStocks',
  'EEM': 'intlStocks',
  'SCHF': 'intlStocks',
  'SCHE': 'intlStocks',
  'SWISX': 'intlStocks',
  'FSPSX': 'intlStocks',
  'FPADX': 'intlStocks',
  
  // Bond ETFs/Funds
  'BND': 'bonds',
  'AGG': 'bonds',
  'TLT': 'bonds',
  'IEF': 'bonds',
  'SHY': 'bonds',
  'LQD': 'bonds',
  'HYG': 'bonds',
  'VCIT': 'bonds',
  'VBTLX': 'bonds',
  'VBMFX': 'bonds',
  'FBNDX': 'bonds',
  'FXNAX': 'bonds',
  'SCHZ': 'bonds',
  'MUB': 'bonds',
  'TIP': 'bonds',
  'VTIP': 'bonds',
  'VWAHX': 'bonds',
  'VWITX': 'bonds',
  'PTTRX': 'bonds',
  'PIMIX': 'bonds',
  
  // Real Estate ETFs/REITs
  'VNQ': 'realEstate',
  'VNQI': 'realEstate',
  'VGSLX': 'realEstate',
  'SCHH': 'realEstate',
  'IYR': 'realEstate',
  'XLRE': 'realEstate',
  'RWR': 'realEstate',
  'USRT': 'realEstate',
  'FREL': 'realEstate',
  'REET': 'realEstate',
  'O': 'realEstate',
  'AMT': 'realEstate',
  'PLD': 'realEstate',
  'SPG': 'realEstate',
  'EQIX': 'realEstate',
  
  // Cash/Money Market
  'VMFXX': 'cash',
  'SPAXX': 'cash',
  'FDRXX': 'cash',
  'SWVXX': 'cash',
  'VMMXX': 'cash',
  'FTEXX': 'cash',
  'SPRXX': 'cash',
  'SNSXX': 'cash',
  'TFDXX': 'cash',
  'BIL': 'cash',
  'SHV': 'cash',
  'SGOV': 'cash',
  'MINT': 'cash',
};

// Keywords for classification when ticker not found
const CLASSIFICATION_KEYWORDS: Record<AssetClass, string[]> = {
  domesticStocks: ['us stock', 'us equity', 'domestic stock', 'domestic equity', 's&p 500', 'total stock', 'large cap', 'mid cap', 'small cap', 'growth', 'value', 'russell', 'nasdaq', 'dow'],
  intlStocks: ['international', 'intl', 'foreign', 'emerging', 'developed', 'global', 'world', 'ex-us', 'eafe', 'europe', 'asia', 'pacific'],
  bonds: ['bond', 'fixed income', 'treasury', 'municipal', 'corporate debt', 'aggregate', 'govt', 'government bond', 'tips', 'inflation protected'],
  realEstate: ['real estate', 'reit', 'property', 'realty'],
  cash: ['money market', 'cash', 'stable value', 'short term', 'treasury bill', 'liquid', 'settlement'],
};

/**
 * Classify a holding into an asset class based on ticker symbol, security type, and name
 */
export function classifyHolding(security: {
  ticker_symbol?: string | null;
  type?: string;
  security_name?: string;
  asset_class?: string;
}): AssetClass {
  const ticker = security.ticker_symbol?.toUpperCase() || '';
  const type = security.type?.toLowerCase() || '';
  const name = security.security_name?.toLowerCase() || '';
  const existingClass = security.asset_class?.toLowerCase() || '';
  
  // 1. Check direct ticker mapping first (most accurate)
  if (ticker && TICKER_MAPPINGS[ticker]) {
    return TICKER_MAPPINGS[ticker];
  }
  
  // 2. Check existing asset_class from Plaid classification
  if (existingClass === 'stocks' || existingClass === 'equity') {
    // Determine if domestic or international
    for (const keyword of CLASSIFICATION_KEYWORDS.intlStocks) {
      if (name.includes(keyword)) {
        return 'intlStocks';
      }
    }
    return 'domesticStocks';
  }
  
  if (existingClass === 'bonds' || existingClass === 'fixed income') {
    return 'bonds';
  }
  
  if (existingClass === 'cash') {
    return 'cash';
  }
  
  // 3. Check by security type
  if (type === 'cash' || type === 'money market') {
    return 'cash';
  }
  
  if (type === 'fixed income' || type === 'bond') {
    return 'bonds';
  }
  
  // 4. Keyword-based classification from security name
  for (const [assetClass, keywords] of Object.entries(CLASSIFICATION_KEYWORDS)) {
    for (const keyword of keywords) {
      if (name.includes(keyword)) {
        return assetClass as AssetClass;
      }
    }
  }
  
  // 5. Default classification based on type
  if (type === 'etf' || type === 'mutual fund') {
    // Check name for clues
    for (const keyword of CLASSIFICATION_KEYWORDS.bonds) {
      if (name.includes(keyword)) return 'bonds';
    }
    for (const keyword of CLASSIFICATION_KEYWORDS.realEstate) {
      if (name.includes(keyword)) return 'realEstate';
    }
    for (const keyword of CLASSIFICATION_KEYWORDS.intlStocks) {
      if (name.includes(keyword)) return 'intlStocks';
    }
    return 'domesticStocks';
  }
  
  if (type === 'equity' || type === 'stock') {
    // Check if it's a REIT
    for (const keyword of CLASSIFICATION_KEYWORDS.realEstate) {
      if (name.includes(keyword)) return 'realEstate';
    }
    return 'domesticStocks';
  }
  
  // 6. Final fallback
  return 'domesticStocks';
}

/**
 * Calculate allocation percentages from a list of holdings
 */
export function calculateAllocation(holdings: Array<{
  ticker_symbol?: string | null;
  security_name?: string;
  asset_class?: string;
  market_value: number;
}>): AssetAllocation {
  const allocation: AssetAllocation = {
    domesticStocks: 0,
    intlStocks: 0,
    bonds: 0,
    realEstate: 0,
    cash: 0,
  };
  
  for (const holding of holdings) {
    const assetClass = classifyHolding({
      ticker_symbol: holding.ticker_symbol,
      security_name: holding.security_name,
      asset_class: holding.asset_class,
    });
    
    allocation[assetClass] += Number(holding.market_value);
  }
  
  return allocation;
}

/**
 * Convert allocation to percentages (0 to 1)
 */
export function allocationToPercentages(allocation: AssetAllocation): AssetAllocation {
  const total = Object.values(allocation).reduce((sum, val) => sum + val, 0);
  
  if (total === 0) {
    // Default balanced allocation
    return {
      domesticStocks: 0.4,
      intlStocks: 0.2,
      bonds: 0.3,
      realEstate: 0.05,
      cash: 0.05,
    };
  }
  
  return {
    domesticStocks: allocation.domesticStocks / total,
    intlStocks: allocation.intlStocks / total,
    bonds: allocation.bonds / total,
    realEstate: allocation.realEstate / total,
    cash: allocation.cash / total,
  };
}

/**
 * Legacy mapping: Convert 5-class allocation to simple Stocks/Bonds/Cash
 * for compatibility with existing components
 */
export function toLegacyAllocation(allocation: AssetAllocation): {
  Stocks: number;
  Bonds: number;
  Cash: number;
  Other: number;
} {
  return {
    Stocks: allocation.domesticStocks + allocation.intlStocks,
    Bonds: allocation.bonds,
    Cash: allocation.cash,
    Other: allocation.realEstate,
  };
}
