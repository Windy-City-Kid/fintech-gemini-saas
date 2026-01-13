import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { useMoneyFlows } from '@/hooks/useMoneyFlows';
import { 
  projectLifetimeCashFlow, 
  LifetimeCashFlowProjection,
  ExcessIncomeSettings,
} from '@/lib/cashFlowEngine';

export interface CashFlowDashboardData {
  projection: LifetimeCashFlowProjection | null;
  currentAge: number;
  retirementAge: number;
  excessSettings: ExcessIncomeSettings;
  
  // Quick stats
  totalLifetimeIncome: number;
  totalLifetimeSavings: number;
  totalLifetimeGaps: number;
  lifetimeDebt: number;
  
  // Derived
  isLoading: boolean;
  error: string | null;
}

export interface AccountBalance {
  account: string;
  balance: number;
  type: 'taxable' | 'pretax' | 'roth';
}

export function useCashFlowDashboard() {
  const { user } = useAuth();
  const { sources, loading: incomesLoading, getTotalAnnualIncome } = useIncomeSources();
  const { flows, loading: flowsLoading, getSummary } = useMoneyFlows();
  
  const [profile, setProfile] = useState<{
    current_age: number;
    retirement_age: number;
  } | null>(null);
  const [accounts, setAccounts] = useState<AccountBalance[]>([]);
  const [expenses, setExpenses] = useState<number>(60000);
  const [debt, setDebt] = useState<number>(12000);
  const [medical, setMedical] = useState<number>(5000);
  const [taxes, setTaxes] = useState<number>(15000);
  const [loading, setLoading] = useState(true);
  
  // Fetch profile and accounts
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch scenario for age data
        const { data: scenario } = await supabase
          .from('scenarios')
          .select('current_age, retirement_age, monthly_retirement_spending')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (scenario) {
          setProfile({
            current_age: scenario.current_age || 45,
            retirement_age: scenario.retirement_age || 65,
          });
          setExpenses((scenario.monthly_retirement_spending || 5000) * 12);
        }
        
        // Fetch account balances
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('account_name, current_balance, account_type')
          .eq('user_id', user.id);
        
        if (accountsData) {
          setAccounts(accountsData.map(a => ({
            account: a.account_name,
            balance: Number(a.current_balance),
            type: categorizeAccountType(a.account_type),
          })));
        }
      } catch (err) {
        console.error('Error fetching cash flow data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  // Get excess income settings from money flows
  const excessSettings = useMemo((): ExcessIncomeSettings => {
    const summary = getSummary();
    return {
      enabled: summary.excessIncomeEnabled,
      savePercentage: summary.excessPercentage,
      targetAccount: summary.excessTargetAccount,
    };
  }, [getSummary]);
  
  // Calculate projection
  const projection = useMemo(() => {
    if (!profile || accounts.length === 0) return null;
    
    const totalWorkIncome = getTotalAnnualIncome(false);
    const flowsSummary = getSummary();
    
    // Calculate retirement income (SS, pensions, etc.)
    const retirementIncome = sources
      .filter(s => 
        s.category === 'social_security' || 
        s.category === 'pension' || 
        s.category === 'annuity'
      )
      .reduce((sum, s) => {
        const annual = s.frequency === 'monthly' ? s.amount * 12 : s.amount;
        return sum + annual;
      }, 0);
    
    return projectLifetimeCashFlow(
      profile.current_age,
      100,
      profile.retirement_age,
      {
        workIncome: totalWorkIncome,
        retirementIncome: retirementIncome || 36000, // Default SS if not set
        annualSavings: flowsSummary.totalContributions,
        annualExpenses: expenses,
        annualDebt: debt,
        annualMedical: medical,
        annualTaxes: taxes,
        inflationRate: 0.025,
      },
      excessSettings,
      accounts,
      0.06,
    );
  }, [profile, accounts, sources, flows, expenses, debt, medical, taxes, excessSettings, getTotalAnnualIncome, getSummary]);
  
  const updateExcessSettings = useCallback(async (settings: ExcessIncomeSettings) => {
    if (!user || flows.length === 0) return;
    
    try {
      // Update first flow with excess settings
      const firstFlowId = flows[0].id;
      
      // Clear all existing excess settings
      await supabase
        .from('money_flows')
        .update({ excess_income_enabled: false })
        .eq('user_id', user.id);
      
      if (settings.enabled) {
        await supabase
          .from('money_flows')
          .update({
            excess_income_enabled: true,
            excess_save_percentage: settings.savePercentage,
            excess_target_account: settings.targetAccount,
          })
          .eq('id', firstFlowId);
      }
    } catch (err) {
      console.error('Error updating excess settings:', err);
    }
  }, [user, flows]);
  
  return {
    projection,
    currentAge: profile?.current_age || 45,
    retirementAge: profile?.retirement_age || 65,
    excessSettings,
    updateExcessSettings,
    
    // Quick stats
    totalLifetimeIncome: projection?.annualSummaries.reduce((sum, s) => sum + s.totalIncome, 0) || 0,
    totalLifetimeSavings: projection?.totalSavedSurplus || 0,
    totalLifetimeGaps: projection?.totalFundedGaps || 0,
    lifetimeDebt: projection?.totalUnfundedGaps || 0,
    
    isLoading: loading || incomesLoading || flowsLoading,
    error: null,
  };
}

function categorizeAccountType(accountType: string): 'taxable' | 'pretax' | 'roth' {
  const type = accountType.toLowerCase();
  if (type.includes('roth')) return 'roth';
  if (type.includes('401k') || type.includes('ira') || type.includes('403b') || type.includes('457')) return 'pretax';
  return 'taxable';
}
