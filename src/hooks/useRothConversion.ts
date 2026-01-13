/**
 * Hook for Roth Conversion Strategy calculations
 */

import { useState, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolioData } from '@/hooks/usePortfolioData';
import { useStateTaxRules, StateTaxRule } from '@/hooks/useStateTaxRules';
import {
  optimizeRothConversions,
  ConversionStrategy,
  ConversionParams,
  AccountForConversion,
} from '@/lib/rothConversionEngine';

export interface RothConversionInputs {
  currentAge: number;
  retirementAge: number;
  rmdStartAge: number;
  lifeExpectancy: number;
  annualIncome: number;
  socialSecurityIncome: number;
  filingStatus: 'single' | 'married_filing_jointly';
  stateCode: string;
  targetBracket: number;
  maxAnnualConversion: number;
}

export function useRothConversion() {
  const { user } = useAuth();
  const portfolio = usePortfolioData();
  const { getRule, rules: stateTaxRules } = useStateTaxRules();
  
  const [inputs, setInputs] = useState<RothConversionInputs>({
    currentAge: 55,
    retirementAge: 60,
    rmdStartAge: 73,
    lifeExpectancy: 95,
    annualIncome: 150000,
    socialSecurityIncome: 30000,
    filingStatus: 'married_filing_jointly',
    stateCode: 'GA',
    targetBracket: 0.22,
    maxAnnualConversion: 100000,
  });
  
  const [isCalculating, setIsCalculating] = useState(false);
  
  // Build accounts for conversion from portfolio data
  const accountsForConversion = useMemo((): AccountForConversion[] => {
    const accounts: AccountForConversion[] = [];
    
    // In real implementation, filter portfolio.accountBreakdown for pre-tax accounts
    // For now, create sample accounts based on portfolio
    const preTaxTypes = ['401k', 'IRA'];
    
    // Estimate pre-tax balance as ~60% of portfolio (common allocation)
    const estimatedPreTax = portfolio.totalBalance * 0.6;
    
    if (estimatedPreTax > 0) {
      accounts.push({
        id: 'traditional-401k',
        name: 'Traditional 401(k)',
        type: 'traditional_401k',
        balance: estimatedPreTax * 0.7, // 70% in 401k
        expectedReturn: 0.07, // 7% expected
      });
      
      accounts.push({
        id: 'traditional-ira',
        name: 'Traditional IRA',
        type: 'traditional_ira',
        balance: estimatedPreTax * 0.3, // 30% in IRA
        expectedReturn: 0.065, // 6.5% expected (slightly lower)
      });
    }
    
    return accounts;
  }, [portfolio.totalBalance]);
  
  // Estimate brokerage (after-tax) balance
  const brokerageBalance = useMemo(() => {
    // Estimate 20% of portfolio is taxable
    return portfolio.totalBalance * 0.2;
  }, [portfolio.totalBalance]);
  
  // Get current state rule
  const stateRule = useMemo((): StateTaxRule | undefined => {
    return getRule(inputs.stateCode);
  }, [inputs.stateCode, getRule]);
  
  // Calculate optimal strategy
  const strategy = useMemo((): ConversionStrategy | null => {
    if (accountsForConversion.length === 0) return null;
    
    const params: ConversionParams = {
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      rmdStartAge: inputs.rmdStartAge,
      lifeExpectancy: inputs.lifeExpectancy,
      accounts: accountsForConversion,
      stateRule,
      brokerageBalance,
      annualIncome: inputs.annualIncome,
      socialSecurityIncome: inputs.socialSecurityIncome,
      filingStatus: inputs.filingStatus,
      targetBracket: inputs.targetBracket,
      maxAnnualConversion: inputs.maxAnnualConversion,
    };
    
    return optimizeRothConversions(params);
  }, [
    accountsForConversion,
    brokerageBalance,
    stateRule,
    inputs,
  ]);
  
  // Update a single input
  const updateInput = useCallback(<K extends keyof RothConversionInputs>(
    key: K,
    value: RothConversionInputs[K]
  ) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  }, []);
  
  // Reset to defaults
  const reset = useCallback(() => {
    setInputs({
      currentAge: 55,
      retirementAge: 60,
      rmdStartAge: 73,
      lifeExpectancy: 95,
      annualIncome: 150000,
      socialSecurityIncome: 30000,
      filingStatus: 'married_filing_jointly',
      stateCode: 'GA',
      targetBracket: 0.22,
      maxAnnualConversion: 100000,
    });
  }, []);
  
  // State options for dropdown
  const stateOptions = useMemo(() => {
    return stateTaxRules.map(rule => ({
      code: rule.state_code,
      name: rule.state_name,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [stateTaxRules]);
  
  return {
    inputs,
    updateInput,
    reset,
    strategy,
    isCalculating,
    accountsForConversion,
    brokerageBalance,
    stateRule,
    stateOptions,
  };
}
