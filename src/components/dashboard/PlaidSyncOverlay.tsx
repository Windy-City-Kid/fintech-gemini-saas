import { Loader2, Building2 } from 'lucide-react';

interface PlaidSyncOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function PlaidSyncOverlay({ isVisible, message = 'Syncing Bank Data...' }: PlaidSyncOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border rounded-xl p-8 shadow-lg max-w-md mx-4 text-center space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <Building2 className="h-12 w-12 text-primary" />
            <Loader2 className="h-6 w-6 text-primary absolute -bottom-1 -right-1 animate-spin" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">{message}</h2>
        <p className="text-muted-foreground text-sm">
          Please wait while we securely connect to your bank and retrieve your account information.
        </p>
        <div className="flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
