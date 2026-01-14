/**
 * Beneficiary Review Component
 * Annual check for beneficiary alignment with Legacy Goal
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  ExternalLink,
  Shield,
  Calendar,
} from 'lucide-react';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { IRS_LIMITS_2026 } from '@/lib/rebalanceAuditEngine';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface BeneficiaryReviewProps {
  estateExemption: number;
  reviewNeeded: boolean;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function BeneficiaryReview({
  estateExemption,
  reviewNeeded,
}: BeneficiaryReviewProps) {
  const navigate = useNavigate();
  const { beneficiaries, totalAllocation, isValidAllocation } = useBeneficiaries();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    setShowConfirmDialog(false);
    toast.success('Beneficiary review completed for 2026');
  };

  return (
    <>
      <Card className={reviewNeeded && !confirmed ? 'border-warning' : ''}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Annual Beneficiary Review
          </CardTitle>
          {confirmed ? (
            <Badge variant="default" className="bg-chart-2 gap-1">
              <CheckCircle className="h-3 w-3" />
              Reviewed 2026
            </Badge>
          ) : reviewNeeded ? (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Review Required
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estate Exemption Alert */}
          <Alert className="bg-primary/10 border-primary/30">
            <Shield className="h-4 w-4 text-primary" />
            <AlertTitle className="text-primary">2026 Estate Tax Update</AlertTitle>
            <AlertDescription>
              The Federal Estate Exemption is now <strong>{formatCurrency(estateExemption)}</strong> per person.
              Estates below this threshold are not subject to federal estate tax.
            </AlertDescription>
          </Alert>

          {/* Beneficiary Summary */}
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium">Current Beneficiaries</span>
              <span className="text-lg font-bold">{beneficiaries.length}</span>
            </div>
            
            {beneficiaries.length > 0 ? (
              <div className="space-y-2">
                {beneficiaries.slice(0, 3).map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{b.name}</span>
                    <span className="font-mono">{b.allocation_percentage}%</span>
                  </div>
                ))}
                {beneficiaries.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    +{beneficiaries.length - 3} more...
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No beneficiaries configured
              </p>
            )}

            {!isValidAllocation && beneficiaries.length > 0 && (
              <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/30">
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Allocations total {totalAllocation}% (must equal 100%)
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!confirmed && (
              <Button
                onClick={() => setShowConfirmDialog(true)}
                className="flex-1 gap-2"
                variant={reviewNeeded ? 'default' : 'outline'}
              >
                <CheckCircle className="h-4 w-4" />
                Confirm Beneficiaries
              </Button>
            )}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/estate-planning')}
            >
              <ExternalLink className="h-4 w-4" />
              Edit in Estate Planning
            </Button>
          </div>

          {confirmed && (
            <div className="flex items-center gap-2 text-sm text-chart-2">
              <CheckCircle className="h-4 w-4" />
              <span>Last reviewed: {new Date().toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Confirm Beneficiary Review
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertTitle>Annual Beneficiary Check</AlertTitle>
              <AlertDescription>
                The 2026 Estate Exemption is <strong>{formatCurrency(estateExemption)}</strong>. 
                Please confirm your beneficiaries still align with your Legacy Goal.
              </AlertDescription>
            </Alert>

            <div className="p-4 rounded-lg bg-muted/30 border">
              <h4 className="font-medium mb-2">Quick Checklist:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Verify all beneficiary names are current</li>
                <li>✓ Check allocation percentages total 100%</li>
                <li>✓ Consider if Traditional IRA designations are optimal</li>
                <li>✓ Review spouse vs. non-spouse designations for tax efficiency</li>
              </ul>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm-review"
                checked={confirmChecked}
                onCheckedChange={(checked) => setConfirmChecked(checked as boolean)}
              />
              <label htmlFor="confirm-review" className="text-sm leading-tight cursor-pointer">
                I have reviewed my beneficiaries and confirm they align with my current 
                estate planning goals.
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={!confirmChecked}>
              Confirm Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
