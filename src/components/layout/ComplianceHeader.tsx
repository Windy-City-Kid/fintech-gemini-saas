import { AlertTriangle } from 'lucide-react';

export function ComplianceHeader() {
  return (
    <div className="compliance-header flex items-center justify-center gap-2">
      <AlertTriangle className="h-3.5 w-3.5" />
      <span>Educational tool only. No investment advice provided.</span>
    </div>
  );
}
