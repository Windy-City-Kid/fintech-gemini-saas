import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CategoryPageLayout } from '@/components/layout/CategoryPageLayout';
import { CategoryCard } from '@/components/layout/CategoryCard';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Heart, FileText, Gift, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function EstatePlanning() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{
    spouse_name: string | null;
    spouse_dob: string | null;
    spouse_retirement_age: number | null;
    spouse_pia: number | null;
    legacy_goal_amount: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [legacyGoal, setLegacyGoal] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('spouse_name, spouse_dob, spouse_retirement_age, spouse_pia, legacy_goal_amount')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setProfile(data);
        setLegacyGoal(data?.legacy_goal_amount?.toString() || '');
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveLegacy = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ legacy_goal_amount: parseFloat(legacyGoal) || null })
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Legacy goal updated');
    } catch (error) {
      toast.error('Failed to update legacy goal');
    } finally {
      setSaving(false);
    }
  };

  const hasSpouse = !!(profile?.spouse_name);
  const hasLegacy = !!(profile?.legacy_goal_amount);

  return (
    <DashboardLayout>
      <CategoryPageLayout
        title="Estate Planning"
        description="Plan your legacy and protect your loved ones"
        previousPage={{ label: 'Money Flows', path: '/money-flows' }}
        nextPage={{ label: 'Rate Assumptions', path: '/rate-assumptions' }}
        showManageConnections={false}
      >
        {/* Legacy Goal Card */}
        <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-chart-3" />
              <div>
                <h3 className="font-semibold text-foreground">Legacy Goal</h3>
                <p className="text-sm text-muted-foreground">
                  The amount you want to leave to your heirs
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="legacyGoal">Target Amount</Label>
                <Input
                  id="legacyGoal"
                  type="number"
                  value={legacyGoal}
                  onChange={(e) => setLegacyGoal(e.target.value)}
                  placeholder="e.g., 500000"
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSaveLegacy} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
            {hasLegacy && (
              <p className="text-sm text-muted-foreground">
                Current goal: <span className="font-mono text-chart-3">{formatCurrency(profile?.legacy_goal_amount || 0)}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Spouse/Partner Section */}
        <CategoryCard
          title="Spouse or Partner"
          subtitle={hasSpouse ? profile?.spouse_name || 'Partner configured' : 'Add spouse details for household planning'}
          icon={<Heart className="h-5 w-5" />}
          isComplete={hasSpouse}
          onStart={hasSpouse ? undefined : () => window.location.href = '/settings'}
          startLabel="Add Spouse"
        >
          {hasSpouse && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Name</p>
                <p className="font-medium">{profile?.spouse_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{profile?.spouse_dob || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Retirement Age</p>
                <p className="font-medium">{profile?.spouse_retirement_age || 'Not set'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Social Security PIA</p>
                <p className="font-medium font-mono">
                  {profile?.spouse_pia ? formatCurrency(profile.spouse_pia) : 'Not set'}
                </p>
              </div>
            </div>
          )}
        </CategoryCard>

        {/* Beneficiaries */}
        <CategoryCard
          title="Beneficiaries"
          subtitle="Designate who will inherit your assets"
          icon={<Users className="h-5 w-5" />}
          onStart={() => {}}
          startLabel="Add Beneficiaries"
        />

        {/* Trusts & Legal Documents */}
        <CategoryCard
          title="Trusts & Legal Documents"
          subtitle="Wills, trusts, and power of attorney"
          icon={<FileText className="h-5 w-5" />}
          onStart={() => {}}
          startLabel="Start"
        />

        {/* Charitable Giving */}
        <CategoryCard
          title="Charitable Giving"
          subtitle="Plan tax-efficient charitable contributions"
          icon={<Gift className="h-5 w-5" />}
          onStart={() => {}}
          startLabel="Plan Giving"
        />
      </CategoryPageLayout>
    </DashboardLayout>
  );
}
