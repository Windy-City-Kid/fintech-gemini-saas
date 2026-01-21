/**
 * Cash Flow Calculation Engine
 * 
 * Implements the core formula:
 * Surplus/Gap = Total Monthly Income - (Planned Savings + Recurring Expenses + Taxes + Debt Payments + Medical)
 */

export interface MonthlyCashFlowInput {
  totalIncome: number;
  plannedSavings: number;
  recurringExpenses: number;
  taxes: number;
  debtPayments: number;
  medicalCosts: number;
}

export interface MonthlyCashFlowResult {
  month: number;
  year: number;
  totalIncome: number;
  totalOutflows: number;
  surplus: number; // Positive = excess income
  gap: number; // Positive = shortfall requiring withdrawal
  
  // Breakdown
  savedSurplus: number; // Portion saved to designated account
  unsavedSurplus: number; // Portion assumed spent (added to lifestyle)
  fundedGap: number; // Gap covered by savings withdrawal
  unfundedGap: number; // Gap that couldn't be covered (lifetime debt)
}

export interface ExcessIncomeSettings {
  enabled: boolean;
  savePercentage: number; // 0-100
  targetAccount: string;
}

export interface ShortfallWithdrawalResult {
  totalWithdrawal: number;
  sourcesUsed: {
    account: string;
    amount: number;
    remainingBalance: number;
  }[];
  unfundedAmount: number;
}

/**
 * Calculate monthly cash flow for a single month
 */
export function calculateMonthlyCashFlow(
  input: MonthlyCashFlowInput,
  excessSettings: ExcessIncomeSettings,
): Omit<MonthlyCashFlowResult, 'month' | 'year'> {
  const totalOutflows = input.plannedSavings + input.recurringExpenses + input.taxes + input.debtPayments + input.medicalCosts;
  const netCashFlow = input.totalIncome - totalOutflows;
  
  let surplus = 0;
  let gap = 0;
  let savedSurplus = 0;
  let unsavedSurplus = 0;
  const fundedGap = 0;
  const unfundedGap = 0;
  
  if (netCashFlow >= 0) {
    // SURPLUS LOGIC
    surplus = netCashFlow;
    
    if (excessSettings.enabled) {
      savedSurplus = surplus * (excessSettings.savePercentage / 100);
      unsavedSurplus = surplus - savedSurplus;
    } else {
      // All surplus assumed spent if excess savings not enabled
      unsavedSurplus = surplus;
    }
  } else {
    // GAP LOGIC - shortfall needs to be funded from savings
    gap = Math.abs(netCashFlow);
  }
  
  return {
    totalIncome: input.totalIncome,
    totalOutflows,
    surplus,
    gap,
    savedSurplus,
    unsavedSurplus,
    fundedGap,
    unfundedGap,
  };
}

/**
 * Process shortfall withdrawal from savings using tax-efficient hierarchy
 */
export function processShortfallWithdrawal(
  shortfallAmount: number,
  accountBalances: { account: string; balance: number; type: 'taxable' | 'pretax' | 'roth' }[],
): ShortfallWithdrawalResult {
  // Withdrawal order: Taxable → Pre-tax → Roth
  const sortedAccounts = [...accountBalances].sort((a, b) => {
    const order = { taxable: 1, pretax: 2, roth: 3 };
    return order[a.type] - order[b.type];
  });
  
  let remaining = shortfallAmount;
  const sourcesUsed: ShortfallWithdrawalResult['sourcesUsed'] = [];
  
  for (const account of sortedAccounts) {
    if (remaining <= 0) break;
    
    const withdrawAmount = Math.min(remaining, account.balance);
    if (withdrawAmount > 0) {
      sourcesUsed.push({
        account: account.account,
        amount: withdrawAmount,
        remainingBalance: account.balance - withdrawAmount,
      });
      remaining -= withdrawAmount;
    }
  }
  
  return {
    totalWithdrawal: shortfallAmount - remaining,
    sourcesUsed,
    unfundedAmount: remaining, // This becomes "lifetime debt"
  };
}

export interface AnnualCashFlowSummary {
  year: number;
  age: number;
  
  // Annual totals
  totalIncome: number;
  totalOutflows: number;
  
  // Surplus breakdown
  savedSurplus: number;
  unsavedSurplus: number;
  
  // Gap breakdown
  fundedGap: number;
  unfundedGap: number;
  
  // Net
  netCashFlow: number;
  cumulativeDebt: number;
  
  // Monthly data for detail views
  monthlyData: MonthlyCashFlowResult[];
}

export interface YearlyCashFlowInputs {
  age: number;
  year: number;
  monthlyIncome: number; // Base monthly income
  incomeByMonth?: number[]; // Optional: 12 values for month-by-month income
  monthlySavings: number;
  monthlyExpenses: number;
  monthlyDebt: number;
  monthlyMedical: number;
  monthlyTaxes: number;
  isRetired: boolean;
  retirementMonth?: number; // 1-12, month when retirement starts
}

/**
 * Calculate annual cash flow with monthly granularity
 * Critical for capturing mid-year transitions (e.g., retirement)
 */
export function calculateAnnualCashFlow(
  inputs: YearlyCashFlowInputs,
  excessSettings: ExcessIncomeSettings,
  accountBalances: { account: string; balance: number; type: 'taxable' | 'pretax' | 'roth' }[],
): AnnualCashFlowSummary {
  const monthlyResults: MonthlyCashFlowResult[] = [];
  const currentBalances = [...accountBalances];
  let cumulativeUnfunded = 0;
  
  for (let month = 1; month <= 12; month++) {
    // Determine income for this month (handles mid-year retirement)
    let monthlyIncome = inputs.monthlyIncome;
    
    // If income by month is provided, use it
    if (inputs.incomeByMonth && inputs.incomeByMonth[month - 1] !== undefined) {
      monthlyIncome = inputs.incomeByMonth[month - 1];
    }
    // If retired mid-year, work income stops
    else if (inputs.isRetired && inputs.retirementMonth && month >= inputs.retirementMonth) {
      monthlyIncome = 0; // Work income stops; other income sources handled separately
    }
    
    // Calculate cash flow for this month
    const monthResult = calculateMonthlyCashFlow(
      {
        totalIncome: monthlyIncome,
        plannedSavings: inputs.monthlySavings,
        recurringExpenses: inputs.monthlyExpenses,
        taxes: inputs.monthlyTaxes / 12, // Spread annual tax estimate
        debtPayments: inputs.monthlyDebt,
        medicalCosts: inputs.monthlyMedical,
      },
      excessSettings,
    );
    
    // Process gap funding if there's a shortfall
    if (monthResult.gap > 0) {
      const withdrawalResult = processShortfallWithdrawal(monthResult.gap, currentBalances);
      
      monthResult.fundedGap = withdrawalResult.totalWithdrawal;
      monthResult.unfundedGap = withdrawalResult.unfundedAmount;
      cumulativeUnfunded += withdrawalResult.unfundedAmount;
      
      // Update balances for next month
      withdrawalResult.sourcesUsed.forEach(source => {
        const idx = currentBalances.findIndex(b => b.account === source.account);
        if (idx >= 0) {
          currentBalances[idx] = { ...currentBalances[idx], balance: source.remainingBalance };
        }
      });
    }
    
    // If saving surplus, add to target account
    if (monthResult.savedSurplus > 0 && excessSettings.enabled) {
      const targetIdx = currentBalances.findIndex(b => 
        b.account.toLowerCase() === excessSettings.targetAccount.toLowerCase()
      );
      if (targetIdx >= 0) {
        currentBalances[targetIdx] = {
          ...currentBalances[targetIdx],
          balance: currentBalances[targetIdx].balance + monthResult.savedSurplus,
        };
      }
    }
    
    monthlyResults.push({
      ...monthResult,
      month,
      year: inputs.year,
    });
  }
  
  // Aggregate to annual summary
  const annualSummary: AnnualCashFlowSummary = {
    year: inputs.year,
    age: inputs.age,
    totalIncome: monthlyResults.reduce((sum, m) => sum + m.totalIncome, 0),
    totalOutflows: monthlyResults.reduce((sum, m) => sum + m.totalOutflows, 0),
    savedSurplus: monthlyResults.reduce((sum, m) => sum + m.savedSurplus, 0),
    unsavedSurplus: monthlyResults.reduce((sum, m) => sum + m.unsavedSurplus, 0),
    fundedGap: monthlyResults.reduce((sum, m) => sum + m.fundedGap, 0),
    unfundedGap: monthlyResults.reduce((sum, m) => sum + m.unfundedGap, 0),
    netCashFlow: 0, // Calculated below
    cumulativeDebt: cumulativeUnfunded,
    monthlyData: monthlyResults,
  };
  
  annualSummary.netCashFlow = 
    annualSummary.savedSurplus + annualSummary.unsavedSurplus - 
    annualSummary.fundedGap - annualSummary.unfundedGap;
  
  return annualSummary;
}

export interface LifetimeCashFlowProjection {
  annualSummaries: AnnualCashFlowSummary[];
  totalSavedSurplus: number;
  totalUnsavedSurplus: number;
  totalFundedGaps: number;
  totalUnfundedGaps: number; // "Lifetime Debt"
  yearsWithSurplus: number;
  yearsWithGap: number;
  yearsWithUnfundedGap: number;
}

/**
 * Project lifetime cash flow from current age to end age
 */
export function projectLifetimeCashFlow(
  currentAge: number,
  endAge: number,
  retirementAge: number,
  inputs: {
    workIncome: number; // Annual work income
    retirementIncome: number; // Annual retirement income (SS, pensions, etc.)
    annualSavings: number;
    annualExpenses: number;
    annualDebt: number;
    annualMedical: number;
    annualTaxes: number;
    inflationRate: number;
  },
  excessSettings: ExcessIncomeSettings,
  initialBalances: { account: string; balance: number; type: 'taxable' | 'pretax' | 'roth' }[],
  expectedReturn: number = 0.06,
): LifetimeCashFlowProjection {
  const summaries: AnnualCashFlowSummary[] = [];
  let currentBalances = [...initialBalances];
  let cumulativeDebt = 0;
  const currentYear = new Date().getFullYear();
  
  for (let age = currentAge; age <= endAge; age++) {
    const year = currentYear + (age - currentAge);
    const yearsFromNow = age - currentAge;
    const isRetired = age >= retirementAge;
    const isRetirementYear = age === retirementAge;
    
    // Apply inflation to expenses and income
    const inflationMultiplier = Math.pow(1 + inputs.inflationRate, yearsFromNow);
    
    const annualIncome = isRetired 
      ? inputs.retirementIncome * inflationMultiplier
      : inputs.workIncome * inflationMultiplier;
    
    const annualExpenses = inputs.annualExpenses * inflationMultiplier;
    const annualMedical = inputs.annualMedical * Math.pow(1 + 0.055, yearsFromNow); // Medical inflates faster
    const annualDebt = inputs.annualDebt; // Debt usually fixed
    const annualTaxes = isRetired 
      ? inputs.annualTaxes * 0.7 * inflationMultiplier // Lower taxes in retirement
      : inputs.annualTaxes * inflationMultiplier;
    const annualSavings = isRetired ? 0 : inputs.annualSavings * inflationMultiplier;
    
    const yearSummary = calculateAnnualCashFlow(
      {
        age,
        year,
        monthlyIncome: annualIncome / 12,
        monthlySavings: annualSavings / 12,
        monthlyExpenses: annualExpenses / 12,
        monthlyDebt: annualDebt / 12,
        monthlyMedical: annualMedical / 12,
        monthlyTaxes: annualTaxes,
        isRetired,
        retirementMonth: isRetirementYear ? 7 : undefined, // Assume mid-year retirement
      },
      excessSettings,
      currentBalances,
    );
    
    cumulativeDebt += yearSummary.unfundedGap;
    yearSummary.cumulativeDebt = cumulativeDebt;
    
    // Apply investment returns to balances
    currentBalances = currentBalances.map(b => ({
      ...b,
      balance: b.balance * (1 + expectedReturn),
    }));
    
    summaries.push(yearSummary);
  }
  
  return {
    annualSummaries: summaries,
    totalSavedSurplus: summaries.reduce((sum, s) => sum + s.savedSurplus, 0),
    totalUnsavedSurplus: summaries.reduce((sum, s) => sum + s.unsavedSurplus, 0),
    totalFundedGaps: summaries.reduce((sum, s) => sum + s.fundedGap, 0),
    totalUnfundedGaps: summaries.reduce((sum, s) => sum + s.unfundedGap, 0),
    yearsWithSurplus: summaries.filter(s => s.savedSurplus + s.unsavedSurplus > 0).length,
    yearsWithGap: summaries.filter(s => s.fundedGap > 0).length,
    yearsWithUnfundedGap: summaries.filter(s => s.unfundedGap > 0).length,
  };
}
