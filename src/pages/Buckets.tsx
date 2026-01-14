import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BucketManager } from '@/components/buckets';

const Buckets = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <BucketManager />
      </div>
    </DashboardLayout>
  );
};

export default Buckets;
