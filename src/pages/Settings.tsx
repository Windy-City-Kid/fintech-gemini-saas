import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Shield, Bell, Lock, Save, AlertTriangle, Users, Heart } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { SecurityActivityTable } from '@/components/SecurityActivityTable';
import { toast } from 'sonner';

const profileSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
});

const familySchema = z.object({
  spouse_name: z.string().optional(),
  spouse_dob: z.string().optional(),
  spouse_retirement_age: z.coerce.number().min(55).max(80).optional(),
  spouse_pia: z.coerce.number().min(0).optional(),
  legacy_goal_amount: z.coerce.number().min(0).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type FamilyFormData = z.infer<typeof familySchema>;

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  mfa_enabled: boolean | null;
  spouse_name: string | null;
  spouse_dob: string | null;
  spouse_retirement_age: number | null;
  spouse_pia: number | null;
  legacy_goal_amount: number | null;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingFamily, setSavingFamily] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const { 
    register: registerFamily, 
    handleSubmit: handleSubmitFamily, 
    setValue: setFamilyValue,
    formState: { errors: familyErrors } 
  } = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        
        if (data) {
          setProfile(data);
          setValue('full_name', data.full_name || '');
          setValue('email', data.email || user.email || '');
          
          // Family form values
          setFamilyValue('spouse_name', data.spouse_name || '');
          setFamilyValue('spouse_dob', data.spouse_dob || '');
          setFamilyValue('spouse_retirement_age', data.spouse_retirement_age || 65);
          setFamilyValue('spouse_pia', data.spouse_pia || 0);
          setFamilyValue('legacy_goal_amount', data.legacy_goal_amount || 0);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, setValue, setFamilyValue]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user || !profile) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Failed to update profile', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const onSubmitFamily = async (data: FamilyFormData) => {
    if (!user || !profile) return;
    
    setSavingFamily(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          spouse_name: data.spouse_name || null,
          spouse_dob: data.spouse_dob || null,
          spouse_retirement_age: data.spouse_retirement_age || null,
          spouse_pia: data.spouse_pia || null,
          legacy_goal_amount: data.legacy_goal_amount || null,
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        spouse_name: data.spouse_name || null,
        spouse_dob: data.spouse_dob || null,
        spouse_retirement_age: data.spouse_retirement_age || null,
        spouse_pia: data.spouse_pia || null,
        legacy_goal_amount: data.legacy_goal_amount || null,
      } : null);
      
      toast.success('Family & legacy settings saved');
    } catch (error: any) {
      toast.error('Failed to save settings', { description: error.message });
    } finally {
      setSavingFamily(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="max-w-3xl">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted/30">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-2">
              <Users className="h-4 w-4" />
              Family & Legacy
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="stat-card">
              <h3 className="text-lg font-semibold mb-6">Profile Information</h3>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input 
                    id="full_name"
                    {...register('full_name')}
                  />
                  {errors.full_name && (
                    <p className="text-sm text-destructive">{errors.full_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    disabled
                    {...register('email')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed here
                  </p>
                </div>

                <Button type="submit" className="gap-2" disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* Family & Legacy Tab */}
          <TabsContent value="family" className="space-y-6">
            <div className="stat-card">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                Spouse Information
              </h3>
              
              <form onSubmit={handleSubmitFamily(onSubmitFamily)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="spouse_name">Spouse Name</Label>
                    <Input 
                      id="spouse_name"
                      placeholder="Enter spouse's name"
                      {...registerFamily('spouse_name')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spouse_dob">Spouse Date of Birth</Label>
                    <Input 
                      id="spouse_dob"
                      type="date"
                      {...registerFamily('spouse_dob')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spouse_retirement_age">Spouse Retirement Age</Label>
                    <Input 
                      id="spouse_retirement_age"
                      type="number"
                      min={55}
                      max={80}
                      {...registerFamily('spouse_retirement_age')}
                    />
                    {familyErrors.spouse_retirement_age && (
                      <p className="text-sm text-destructive">{familyErrors.spouse_retirement_age.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="spouse_pia">Spouse Social Security PIA ($/month)</Label>
                    <Input 
                      id="spouse_pia"
                      type="number"
                      min={0}
                      placeholder="Monthly benefit at FRA"
                      {...registerFamily('spouse_pia')}
                    />
                    <p className="text-xs text-muted-foreground">
                      Primary Insurance Amount at Full Retirement Age
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-semibold mb-4">Legacy Goals</h4>
                  <div className="space-y-2 max-w-md">
                    <Label htmlFor="legacy_goal_amount">Target Inheritance Amount ($)</Label>
                    <Input 
                      id="legacy_goal_amount"
                      type="number"
                      min={0}
                      step={10000}
                      placeholder="e.g., 500000"
                      {...registerFamily('legacy_goal_amount')}
                    />
                    <p className="text-xs text-muted-foreground">
                      The minimum portfolio value you want to leave at the end of your plan. 
                      Trials ending below this amount will be marked as unsuccessful.
                    </p>
                  </div>
                </div>

                <Button type="submit" className="gap-2" disabled={savingFamily}>
                  <Save className="h-4 w-4" />
                  {savingFamily ? 'Saving...' : 'Save Family & Legacy'}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="stat-card">
              <h3 className="text-lg font-semibold mb-6">Security Settings</h3>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Multi-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                  <Switch disabled checked={false} />
                </div>

                <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                    <div>
                      <p className="font-medium text-warning">MFA Coming Soon</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Multi-factor authentication will be available in a future update. 
                        This feature will add SMS or authenticator app verification.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <h4 className="font-medium mb-4">Password</h4>
                  <Button variant="outline">Change Password</Button>
                </div>
              </div>
            </div>

            <div className="stat-card">
              <h3 className="text-lg font-semibold mb-4">Data Security</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>• All data is encrypted in transit using TLS 1.3</p>
                <p>• Plaid access tokens are stored with placeholder encryption</p>
                <p>• Row-level security ensures data isolation between users</p>
                <p>• Sessions automatically expire after inactivity</p>
              </div>
            </div>

            <div className="stat-card">
              <SecurityActivityTable />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <div className="stat-card">
              <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Summary</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a weekly overview of your net worth
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Account Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified of significant balance changes
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Security Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Be notified of new sign-ins and security events
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
