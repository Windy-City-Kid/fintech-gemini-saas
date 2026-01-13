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
} from '@/components/estate';
import { Skeleton } from '@/components/ui/skeleton';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';

export default function EstatePlanning() {
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
  } = useEstateData();

  const { beneficiaries } = useBeneficiaries();
  const hasSpouseBeneficiary = beneficiaries.some(b => b.relationship === 'spouse');

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
          {/* Row 1: Legacy Goal + Monte Carlo Estate Report */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Row 2: Estate Value Projection */}
          <EstateValueProjection
            projection={estateProjection}
            longevityAge={longevityAge}
            stateCode="CA"
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
