/**
 * Hook for Year-End Rebalance Audit
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePortfolioData } from './usePortfolioData';
import { useBeneficiaries } from './useBeneficiaries';
import { useScenarios } from './useScenarios';
import {
  calculateAllocationDrift,
  calculateRebalanceTrades,
  findTaxLossCandidates,
  generateTaxStrategies,
  determineBucketRefillStatus,
  AllocationDrift,
  RebalanceTrade,
  TaxLossCandidate,
  CharitableStrategy,
  BucketRefillStatus,
  TargetAllocation,
  HoldingWithBasis,
  IRS_LIMITS_2026,
} from '@/lib/rebalanceAuditEngine';
import { calculateRMD, getRMDStartAge } from '@/lib/rmdCalculator';

export interface RebalanceAuditData {
  // Portfolio Drift
  driftAnalysis: AllocationDrift[];
  suggestedTrades: RebalanceTrade[];
  hasDriftExceeded: boolean;

  // Bucket Refill
  bucketRefillStatus: BucketRefillStatus;
  
  // Tax Optimization
  taxLossCandidates: TaxLossCandidate[];
  taxStrategies: CharitableStrategy[];

  // Beneficiary Review
  beneficiaryReviewNeeded: boolean;
  lastBeneficiaryReview: string | null;

  // Metadata
  marketCondition: {
    sp500YtdReturn: number;
    bondIndexYtdReturn: number;
  };
  estateExemption: number;
}

const DEFAULT_TARGET_ALLOCATION: TargetAllocation = {
  domesticStocks: 0.40,
  intlStocks: 0.15,
  bonds: 0.30,
  realEstate: 0.05,
  cash: 0.10,
};

export function useRebalanceAudit() {
  const { user } = useAuth();
  const { allocation, totalBalance, isLoading: portfolioLoading } = usePortfolioData();
  const { beneficiaries, isLoading: beneficiariesLoading } = useBeneficiaries();
  // Scenarios hook for baseline data

  const [holdings, setHoldings] = useState<HoldingWithBasis[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetAllocation, setTargetAllocation] = useState<TargetAllocation>(DEFAULT_TARGET_ALLOCATION);
  const [userAge, setUserAge] = useState(65);
  const [annualExpenses, setAnnualExpenses] = useState(60000);
  const [cashBucketBalance, setCashBucketBalance] = useState(120000);

  // Simulated market conditions (in production, fetch from API)
  const [marketCondition, setMarketCondition] = useState({
    sp500YtdReturn: 12.5, // Example: market up
    bondIndexYtdReturn: 2.3,
  });

  // Fetch holdings with cost basis
  const fetchHoldings = useCallback(async () => {
    if (!user) return;

    try {
      const { data: holdingsData, error: holdingsError } = await supabase
        .from('holdings')
        .select(`
          security_name,
          ticker_symbol,
          market_value,
          cost_basis,
          account_id
        `);

      if (holdingsError) throw holdingsError;

      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('id, account_name');

      if (accountsError) throw accountsError;

      const accountMap = new Map(accountsData?.map(a => [a.id, a.account_name]) || []);

      setHoldings((holdingsData || []).map(h => ({
        securityName: h.security_name,
        tickerSymbol: h.ticker_symbol,
        marketValue: h.market_value,
        costBasis: h.cost_basis,
        accountName: accountMap.get(h.account_id) || 'Unknown Account',
      })));
    } catch (error) {
      console.error('Error fetching holdings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const { baselineScenario } = useScenarios();

  // Fetch user age from scenario
  useEffect(() => {
    if (baselineScenario?.current_age) {
      setUserAge(baselineScenario.current_age);
    }
    if (baselineScenario?.monthly_retirement_spending) {
      setAnnualExpenses(baselineScenario.monthly_retirement_spending * 12);
    }
  }, [baselineScenario]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings]);

  // Calculate drift analysis
  const driftAnalysis = useMemo(() => {
    if (!allocation) return [];
    return calculateAllocationDrift(allocation, targetAllocation, totalBalance);
  }, [allocation, targetAllocation, totalBalance]);

  // Calculate suggested trades
  const suggestedTrades = useMemo(() => {
    return calculateRebalanceTrades(driftAnalysis, totalBalance);
  }, [driftAnalysis, totalBalance]);

  // Find tax-loss candidates
  const taxLossCandidates = useMemo(() => {
    return findTaxLossCandidates(holdings);
  }, [holdings]);

  // Calculate RMD for QCD eligibility
  const rmdAmount = useMemo(() => {
    const rmdStartInfo = getRMDStartAge(new Date().getFullYear() - userAge);
    if (userAge < rmdStartInfo.age) return 0;
    
    // Get traditional IRA balance from allocation
    const iraBalance = totalBalance * 0.4; // Estimate 40% in tax-deferred
    return calculateRMD(userAge, iraBalance);
  }, [userAge, totalBalance]);

  // Generate tax strategies
  const taxStrategies = useMemo(() => {
    return generateTaxStrategies(
      taxLossCandidates,
      userAge,
      rmdAmount,
      5000, // Example charitable giving
      8000, // Example SALT deductions
      'married',
    );
  }, [taxLossCandidates, userAge, rmdAmount]);

  // Bucket refill status
  const bucketRefillStatus = useMemo(() => {
    return determineBucketRefillStatus(
      {
        sp500YtdReturn: marketCondition.sp500YtdReturn,
        isMarketUp: marketCondition.sp500YtdReturn > 0,
        bondIndexYtdReturn: marketCondition.bondIndexYtdReturn,
        isBondMarketUp: marketCondition.bondIndexYtdReturn > 0,
      },
      annualExpenses,
      cashBucketBalance,
    );
  }, [marketCondition, annualExpenses, cashBucketBalance]);

  // Compile audit data
  const auditData: RebalanceAuditData = useMemo(() => ({
    driftAnalysis,
    suggestedTrades,
    hasDriftExceeded: driftAnalysis.some(d => d.exceedsDriftThreshold),
    bucketRefillStatus,
    taxLossCandidates,
    taxStrategies,
    beneficiaryReviewNeeded: beneficiaries.length === 0 || 
      beneficiaries.reduce((sum, b) => sum + b.allocation_percentage, 0) !== 100,
    lastBeneficiaryReview: null, // Would track in DB
    marketCondition,
    estateExemption: IRS_LIMITS_2026.estateExemption,
  }), [
    driftAnalysis,
    suggestedTrades,
    bucketRefillStatus,
    taxLossCandidates,
    taxStrategies,
    beneficiaries,
    marketCondition,
  ]);

  return {
    auditData,
    loading: loading || portfolioLoading || beneficiariesLoading,
    targetAllocation,
    setTargetAllocation,
    setMarketCondition,
    refetch: fetchHoldings,
  };
}
