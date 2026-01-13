import { useMemo } from 'react';
import { CategoryInsightChart } from '@/components/charts';

interface SimulationResult {
  age: number;
  year: number;
  percentile10?: number;
  percentile25?: number;
  median?: number;
  percentile75?: number;
  percentile90?: number;
}

interface CategoryInsightsPanelProps {
  currentAge: number;
  retirementAge: number;
  monthlySpending: number;
  socialSecurityIncome: number;
  simulationResults?: SimulationResult[];
  medicalInflation?: number;
  propertyTaxRate?: number;
  homeValue?: number;
}

// Chart color palette using CSS variables for theming
const COLORS = {
  income: {
    socialSecurity: '#10b981',
    pension: '#14b8a6',
    investments: '#06b6d4',
    partTime: '#0ea5e9',
  },
  expenses: {
    housing: '#ef4444',
    medical: '#f97316',
    living: '#eab308',
    discretionary: '#84cc16',
    taxes: '#8b5cf6',
  },
  debt: {
    mortgage: '#f59e0b',
    carLoan: '#f97316',
    creditCard: '#ef4444',
    other: '#d946ef',
  },
};

export function CategoryInsightsPanel({
  currentAge,
  retirementAge,
  monthlySpending,
  socialSecurityIncome,
  simulationResults = [],
  medicalInflation = 3.36,
  propertyTaxRate = 1.1,
  homeValue = 500000,
}: CategoryInsightsPanelProps) {
  // Generate projected data from current age to 100
  const projectedData = useMemo(() => {
    const data = [];
    const currentYear = new Date().getFullYear();
    const baseSpending = monthlySpending * 12;
    const baseMedical = baseSpending * 0.12; // 12% of spending is medical
    const basePropertyTax = (homeValue * propertyTaxRate) / 100;
    
    for (let age = currentAge; age <= 100; age++) {
      const yearIndex = age - currentAge;
      const year = currentYear + yearIndex;
      const isRetired = age >= retirementAge;
      
      // Inflation factors
      const generalInflation = Math.pow(1.025, yearIndex);
      const medicalInflationFactor = Math.pow(1 + medicalInflation / 100, yearIndex);
      
      // Income projections
      const ssIncome = isRetired ? socialSecurityIncome * generalInflation : 0;
      const pensionIncome = isRetired ? 12000 * generalInflation : 0;
      const investmentIncome = isRetired ? (baseSpending * 0.4) * generalInflation : 0;
      const partTimeIncome = age >= retirementAge && age < retirementAge + 5 ? 15000 * generalInflation : 0;
      
      // Expense projections
      const housingExpense = baseSpending * 0.30 * generalInflation;
      const medicalExpense = baseMedical * medicalInflationFactor * (age >= 65 ? 1.5 : 1);
      const livingExpense = baseSpending * 0.35 * generalInflation;
      const discretionaryExpense = baseSpending * 0.15 * generalInflation * (isRetired ? 0.8 : 1);
      const taxExpense = basePropertyTax * generalInflation;
      
      // Debt projections (decreasing over time)
      const mortgageYearsLeft = Math.max(0, 30 - yearIndex);
      const mortgageBalance = mortgageYearsLeft > 0 ? (homeValue * 0.6) * (mortgageYearsLeft / 30) : 0;
      const mortgagePayment = mortgageYearsLeft > 0 ? (homeValue * 0.6) / 30 : 0;
      
      data.push({
        age,
        year,
        // Income
        socialSecurity: Math.round(ssIncome),
        pension: Math.round(pensionIncome),
        investments: Math.round(investmentIncome),
        partTime: Math.round(partTimeIncome),
        // Expenses
        housing: Math.round(housingExpense),
        medical: Math.round(medicalExpense),
        living: Math.round(livingExpense),
        discretionary: Math.round(discretionaryExpense),
        taxes: Math.round(taxExpense),
        // Debt
        mortgage: Math.round(mortgagePayment),
        carLoan: yearIndex < 5 ? Math.round(6000 * Math.pow(0.8, yearIndex)) : 0,
        creditCard: 0,
        other: 0,
      });
    }
    
    return data;
  }, [currentAge, retirementAge, monthlySpending, socialSecurityIncome, medicalInflation, propertyTaxRate, homeValue]);

  const incomeCategories = [
    { key: 'socialSecurity', label: 'Social Security', color: COLORS.income.socialSecurity },
    { key: 'pension', label: 'Pension', color: COLORS.income.pension },
    { key: 'investments', label: 'Investment Income', color: COLORS.income.investments },
    { key: 'partTime', label: 'Part-Time Work', color: COLORS.income.partTime },
  ];

  const expenseCategories = [
    { key: 'housing', label: 'Housing', color: COLORS.expenses.housing },
    { key: 'medical', label: 'Medical', color: COLORS.expenses.medical },
    { key: 'living', label: 'Living Costs', color: COLORS.expenses.living },
    { key: 'discretionary', label: 'Discretionary', color: COLORS.expenses.discretionary },
    { key: 'taxes', label: 'Property Tax', color: COLORS.expenses.taxes },
  ];

  const debtCategories = [
    { key: 'mortgage', label: 'Mortgage', color: COLORS.debt.mortgage },
    { key: 'carLoan', label: 'Car Loan', color: COLORS.debt.carLoan },
    { key: 'creditCard', label: 'Credit Cards', color: COLORS.debt.creditCard },
    { key: 'other', label: 'Other Debt', color: COLORS.debt.other },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <CategoryInsightChart
        type="income"
        data={projectedData}
        subCategories={incomeCategories}
        currentAge={currentAge}
        retirementAge={retirementAge}
        infoTooltip="Projected income sources from retirement onwards. Social Security and pension amounts are adjusted for inflation. Click any bar to see the detailed breakdown."
      />
      
      <CategoryInsightChart
        type="expenses"
        data={projectedData}
        subCategories={expenseCategories}
        currentAge={currentAge}
        retirementAge={retirementAge}
        infoTooltip="Projected annual expenses with medical costs growing at healthcare inflation rate. Housing includes utilities and maintenance. Click any bar for details."
      />
      
      <CategoryInsightChart
        type="debt"
        data={projectedData}
        subCategories={debtCategories}
        currentAge={currentAge}
        retirementAge={retirementAge}
        infoTooltip="Annual debt service payments. Mortgage payments continue until payoff. Most retirees aim to be debt-free by retirement age."
      />
    </div>
  );
}
