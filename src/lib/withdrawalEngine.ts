/**
 * Automated Withdrawal Strategy Engine
 * 
 * Implements the Traditional withdrawal order (Taxable → Tax-Deferred → Roth)
 * with RMD integration, custom ordering, and account exclusions.
 */

import { calculateRMD, getRMDStartAge } from './rmdCalculator';

export type AccountTaxType = 'taxable' | 'pretax' | 'roth';

export interface WithdrawalAccount {
  id: string;
  name: string;
  type: AccountTaxType;
  balance: number;
  expectedReturn: number;
  excludeFromWithdrawals: boolean;
}

export interface WithdrawalOrder {
  accountId: string;
  priority: number; // Lower = withdrawn first
}

export const DEFAULT_WITHDRAWAL_ORDER: AccountTaxType[] = ['taxable', 'pretax', 'roth'];

export const WITHDRAWAL_ORDER_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  traditional: {
    name: 'Traditional Order',
    description: 'Taxable → Tax-Deferred → Roth. Maximizes tax-free Roth growth and minimizes early taxes.',
  },
  reverse: {
    name: 'Reverse Order',
    description: 'Roth → Tax-Deferred → Taxable. Use Roth first for tax-free income early.',
  },
  taxEfficient: {
    name: 'Tax-Efficient',
    description: 'Optimize based on current tax bracket to minimize lifetime taxes.',
  },
  custom: {
    name: 'Custom Order',
    description: 'Drag and drop to create your own withdrawal sequence.',
  },
};

export interface RMDResult {
  accountId: string;
  accountName: string;
  rmdAmount: number;
  priorYearBalance: number;
  divisor: number;
}

export interface WithdrawalResult {
  accountId: string;
  accountName: string;
  accountType: AccountTaxType;
  withdrawalAmount: number;
  remainingBalance: number;
  taxableAmount: number; // For tax calculation
}

export interface AnnualWithdrawalSummary {
  year: number;
  age: number;
  
  // RMD details
  totalRMD: number;
  rmdByAccount: RMDResult[];
  rmdExcess: number; // RMD amount exceeding spending gap
  
  // Gap-filling withdrawals (after RMD)
  spendingGap: number;
  gapAfterRMD: number;
  withdrawals: WithdrawalResult[];
  totalWithdrawals: number;
  
  // Final state
  fundedGap: number;
  unfundedGap: number; // Lifetime debt
  endingBalances: { accountId: string; balance: number }[];
  
  // Tax impact
  totalTaxableWithdrawals: number;
}

/**
 * Calculate RMDs for all applicable accounts
 */
export function calculateAnnualRMDs(
  age: number,
  birthYear: number,
  accounts: WithdrawalAccount[],
): RMDResult[] {
  const rmdStartAge = getRMDStartAge(birthYear).age;
  
  if (age < rmdStartAge) {
    return [];
  }
  
  // RMDs only apply to pre-tax accounts (Traditional IRA, 401k)
  const pretaxAccounts = accounts.filter(a => a.type === 'pretax');
  
  return pretaxAccounts.map(account => {
    const rmdAmount = calculateRMD(age, account.balance);
    const divisorTable: Record<number, number> = {
      73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
      81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
      89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
    };
    
    return {
      accountId: account.id,
      accountName: account.name,
      rmdAmount,
      priorYearBalance: account.balance,
      divisor: divisorTable[Math.min(age, 95)] || 8.0,
    };
  });
}

/**
 * Get sorted accounts for withdrawal based on order strategy
 */
export function getSortedAccountsForWithdrawal(
  accounts: WithdrawalAccount[],
  customOrder?: WithdrawalOrder[],
  orderStrategy: 'traditional' | 'reverse' | 'custom' = 'traditional',
): WithdrawalAccount[] {
  // Filter out excluded accounts
  const eligibleAccounts = accounts.filter(a => !a.excludeFromWithdrawals && a.balance > 0);
  
  if (orderStrategy === 'custom' && customOrder) {
    // Sort by custom priority
    return [...eligibleAccounts].sort((a, b) => {
      const priorityA = customOrder.find(o => o.accountId === a.id)?.priority ?? 999;
      const priorityB = customOrder.find(o => o.accountId === b.id)?.priority ?? 999;
      
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Within same priority, withdraw from lowest return first
      return a.expectedReturn - b.expectedReturn;
    });
  }
  
  // Traditional or Reverse order
  const typeOrder = orderStrategy === 'reverse' 
    ? ['roth', 'pretax', 'taxable'] as AccountTaxType[]
    : DEFAULT_WITHDRAWAL_ORDER;
  
  return [...eligibleAccounts].sort((a, b) => {
    const typeIndexA = typeOrder.indexOf(a.type);
    const typeIndexB = typeOrder.indexOf(b.type);
    
    if (typeIndexA !== typeIndexB) return typeIndexA - typeIndexB;
    
    // Within same type, withdraw from lowest return first
    return a.expectedReturn - b.expectedReturn;
  });
}

/**
 * Process automated withdrawals to fill spending gap
 */
export function processWithdrawals(
  spendingGap: number,
  accounts: WithdrawalAccount[],
  customOrder?: WithdrawalOrder[],
  orderStrategy: 'traditional' | 'reverse' | 'custom' = 'traditional',
): { withdrawals: WithdrawalResult[]; unfundedGap: number; updatedBalances: Map<string, number> } {
  const sortedAccounts = getSortedAccountsForWithdrawal(accounts, customOrder, orderStrategy);
  const updatedBalances = new Map<string, number>();
  const withdrawals: WithdrawalResult[] = [];
  
  let remainingGap = spendingGap;
  
  // Initialize balances
  accounts.forEach(a => updatedBalances.set(a.id, a.balance));
  
  for (const account of sortedAccounts) {
    if (remainingGap <= 0) break;
    
    const currentBalance = updatedBalances.get(account.id) || 0;
    const withdrawalAmount = Math.min(remainingGap, currentBalance);
    
    if (withdrawalAmount > 0) {
      const newBalance = currentBalance - withdrawalAmount;
      updatedBalances.set(account.id, newBalance);
      
      // Calculate taxable portion
      let taxableAmount = 0;
      if (account.type === 'pretax') {
        taxableAmount = withdrawalAmount; // 100% taxable
      } else if (account.type === 'taxable') {
        taxableAmount = withdrawalAmount * 0.15; // Approximate capital gains (simplified)
      }
      // Roth = 0 taxable (qualified)
      
      withdrawals.push({
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        withdrawalAmount,
        remainingBalance: newBalance,
        taxableAmount,
      });
      
      remainingGap -= withdrawalAmount;
    }
  }
  
  return {
    withdrawals,
    unfundedGap: remainingGap, // This becomes "lifetime debt"
    updatedBalances,
  };
}

/**
 * Process a full year's withdrawals including RMDs
 */
export function processAnnualWithdrawals(
  year: number,
  age: number,
  birthYear: number,
  spendingGap: number, // Positive = need to withdraw
  accounts: WithdrawalAccount[],
  customOrder?: WithdrawalOrder[],
  orderStrategy: 'traditional' | 'reverse' | 'custom' = 'traditional',
  excessIncomeSettings?: { enabled: boolean; savePercentage: number; targetAccountId: string },
): AnnualWithdrawalSummary {
  // Step 1: Calculate RMDs
  const rmdResults = calculateAnnualRMDs(age, birthYear, accounts);
  const totalRMD = rmdResults.reduce((sum, r) => sum + r.rmdAmount, 0);
  
  // Step 2: Apply RMDs to account balances
  const balancesAfterRMD = new Map<string, number>();
  accounts.forEach(a => balancesAfterRMD.set(a.id, a.balance));
  
  rmdResults.forEach(rmd => {
    const currentBalance = balancesAfterRMD.get(rmd.accountId) || 0;
    balancesAfterRMD.set(rmd.accountId, currentBalance - rmd.rmdAmount);
  });
  
  // Step 3: Determine if RMD covers the gap
  const gapAfterRMD = Math.max(0, spendingGap - totalRMD);
  const rmdExcess = Math.max(0, totalRMD - spendingGap);
  
  // Step 4: If RMD has excess, apply to excess income logic
  if (rmdExcess > 0 && excessIncomeSettings?.enabled && excessIncomeSettings.targetAccountId) {
    const savedExcess = rmdExcess * (excessIncomeSettings.savePercentage / 100);
    const targetBalance = balancesAfterRMD.get(excessIncomeSettings.targetAccountId) || 0;
    balancesAfterRMD.set(excessIncomeSettings.targetAccountId, targetBalance + savedExcess);
  }
  
  // Step 5: Process gap-filling withdrawals if needed
  const accountsAfterRMD: WithdrawalAccount[] = accounts.map(a => ({
    ...a,
    balance: balancesAfterRMD.get(a.id) || 0,
  }));
  
  let withdrawals: WithdrawalResult[] = [];
  let unfundedGap = 0;
  
  if (gapAfterRMD > 0) {
    const result = processWithdrawals(gapAfterRMD, accountsAfterRMD, customOrder, orderStrategy);
    withdrawals = result.withdrawals;
    unfundedGap = result.unfundedGap;
    
    // Update balances
    result.updatedBalances.forEach((balance, id) => balancesAfterRMD.set(id, balance));
  }
  
  // Step 6: Calculate totals
  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.withdrawalAmount, 0);
  const totalTaxableWithdrawals = 
    rmdResults.reduce((sum, r) => sum + r.rmdAmount, 0) + // All RMDs are taxable
    withdrawals.reduce((sum, w) => sum + w.taxableAmount, 0);
  
  return {
    year,
    age,
    totalRMD,
    rmdByAccount: rmdResults,
    rmdExcess,
    spendingGap,
    gapAfterRMD,
    withdrawals,
    totalWithdrawals,
    fundedGap: spendingGap - unfundedGap,
    unfundedGap,
    endingBalances: Array.from(balancesAfterRMD.entries()).map(([accountId, balance]) => ({
      accountId,
      balance,
    })),
    totalTaxableWithdrawals,
  };
}

/**
 * Project withdrawals over lifetime
 */
export function projectLifetimeWithdrawals(
  currentAge: number,
  birthYear: number,
  endAge: number,
  accounts: WithdrawalAccount[],
  annualSpendingGaps: { year: number; age: number; gap: number }[],
  customOrder?: WithdrawalOrder[],
  orderStrategy: 'traditional' | 'reverse' | 'custom' = 'traditional',
  excessIncomeSettings?: { enabled: boolean; savePercentage: number; targetAccountId: string },
): AnnualWithdrawalSummary[] {
  const summaries: AnnualWithdrawalSummary[] = [];
  const currentBalances = new Map<string, number>();
  accounts.forEach(a => currentBalances.set(a.id, a.balance));
  
  for (const { year, age, gap } of annualSpendingGaps) {
    // Build accounts with current balances
    const currentAccounts: WithdrawalAccount[] = accounts.map(a => ({
      ...a,
      balance: currentBalances.get(a.id) || 0,
    }));
    
    const summary = processAnnualWithdrawals(
      year,
      age,
      birthYear,
      gap,
      currentAccounts,
      customOrder,
      orderStrategy,
      excessIncomeSettings,
    );
    
    // Update balances for next year (apply returns)
    summary.endingBalances.forEach(({ accountId, balance }) => {
      const account = accounts.find(a => a.id === accountId);
      const returnRate = account?.expectedReturn || 0.06;
      currentBalances.set(accountId, balance * (1 + returnRate));
    });
    
    summaries.push(summary);
  }
  
  return summaries;
}

/**
 * Get withdrawal chart data grouped by account
 */
export interface WithdrawalChartData {
  year: number;
  age: number;
  byAccount: Record<string, number>; // accountName -> amount
  rmd: number;
  gapFilled: number;
  unfunded: number;
}

export function getWithdrawalChartData(summaries: AnnualWithdrawalSummary[]): WithdrawalChartData[] {
  return summaries.map(s => {
    const byAccount: Record<string, number> = {};
    
    // Add RMDs
    s.rmdByAccount.forEach(rmd => {
      byAccount[rmd.accountName] = (byAccount[rmd.accountName] || 0) + rmd.rmdAmount;
    });
    
    // Add gap-filling withdrawals
    s.withdrawals.forEach(w => {
      byAccount[w.accountName] = (byAccount[w.accountName] || 0) + w.withdrawalAmount;
    });
    
    return {
      year: s.year,
      age: s.age,
      byAccount,
      rmd: s.totalRMD,
      gapFilled: s.fundedGap,
      unfunded: s.unfundedGap,
    };
  });
}
