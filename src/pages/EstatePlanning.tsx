import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { useEstateData } from '@/hooks/useEstateData';
import { 
  EstateValueProjection, 
  WealthTransferSankey, 
  BeneficiariesTable,
  ProbabilisticEstateReport,
  CharitableBequestsManager,
  LegacyGoalCard,
  AssetTransferSummary,
  EstateStateSelector,
  LegacyTimeline,
} from '@/components/estate';
import { Skeleton } from '@/components/ui/skeleton';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';

export default function EstatePlanning() {
  const [selectedState, setSelectedState] = useState('CA');
  
  const {
    isLoading,
    legacyGoal,
    totalEstateValue,
    estateAssets,
    estateProjection,
    longevityAge,
    updateLegacyGoal,
    traditionalIraBalance,
    stepUpBasis,
    estatePercentiles,
    isSimulationRunning,
    scenario,
  } = useEstateData();

  const { beneficiaries } = useBeneficiaries();
  const hasSpouseBeneficiary = beneficiaries.some(b => b.relationship === 'spouse');
  
  // Calculate brokerage balance for timeline
  const brokerageBalance = estateAssets
    .filter(a => a.type === 'brokerage')
    .reduce((sum, a) => sum + a.value, 0);
  const brokarageCostBasis = brokerageBalance * 0.7;

  if (isLoading) {
    return (
      <DashboardLayout>
        <CategoryPageLayout
          title="Estate Planning"
          description="Plan your legacy and protect your loved ones"
          previousPage={{ label: 'Money Flows', path: '/money-flows' }}
          nextPage={{ label: 'Rate Assumptions', path: '/rate-assumptions' }}
          showManageConnections={false}
        >
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CategoryPageLayout>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Estate Planning"
        description="Plan your legacy and protect your loved ones"
        previousPage={{ label: 'Money Flows', path: '/money-flows' }}
        nextPage={{ label: 'Rate Assumptions', path: '/rate-assumptions' }}
        showManageConnections={false}
      >
        <div className="space-y-6">
          {/* Row 1: State Selector + Legacy Goal + Monte Carlo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <EstateStateSelector
              selectedState={selectedState}
              onStateChange={setSelectedState}
              grossEstate={totalEstateValue}
            />
            <LegacyGoalCard
              currentGoal={legacyGoal}
              projectedEstateValue={estateProjection?.netToHeirs || totalEstateValue}
              onSaveGoal={updateLegacyGoal}
            />
            <ProbabilisticEstateReport
              estatePercentiles={estatePercentiles}
              legacyGoal={legacyGoal}
              isLoading={isSimulationRunning}
            />
          </div>

          {/* Row 2: Interactive Legacy Timeline */}
          <LegacyTimeline
            currentAge={scenario?.current_age || 55}
            currentNetWorth={totalEstateValue}
            stateCode={selectedState}
            isMarried={hasSpouseBeneficiary}
            traditionalIraBalance={traditionalIraBalance}
            brokerageBalance={brokerageBalance}
            brokarageCostBasis={brokarageCostBasis}
            longevityAge={longevityAge}
          />

          {/* Row 3: Estate Value Projection */}
          <EstateValueProjection
            projection={estateProjection}
            longevityAge={longevityAge}
            stateCode={selectedState}
            legacyGoal={legacyGoal}
          />

          {/* Row 3: Wealth Transfer Sankey */}
          <WealthTransferSankey
            projection={estateProjection}
            stepUpBasis={stepUpBasis}
          />

          {/* Row 4: Beneficiaries + Charitable Bequests */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BeneficiariesTable
              traditionalIraBalance={traditionalIraBalance}
            />
            <CharitableBequestsManager
              totalEstateValue={totalEstateValue}
            />
          </div>

          {/* Row 5: Asset Transfer Summary */}
          <AssetTransferSummary
            projection={estateProjection}
            assets={estateAssets}
            hasSpouseBeneficiary={hasSpouseBeneficiary}
          />
        </div>
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
