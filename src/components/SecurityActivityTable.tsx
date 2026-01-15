import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Clock, Monitor, AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SecurityLogEntry {
  id: string;
  event_type: 'login' | 'logout' | 'password_reset' | 'password_change' | 'email_change' | 'mfa_enabled' | 'mfa_disabled' | 'account_created';
  ip_masked: string | null;
  user_agent: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

const EVENT_TYPE_LABELS: Record<SecurityLogEntry['event_type'], string> = {
  login: 'Sign In',
  logout: 'Sign Out',
  password_reset: 'Password Reset',
  password_change: 'Password Changed',
  email_change: 'Email Changed',
  mfa_enabled: 'MFA Enabled',
  mfa_disabled: 'MFA Disabled',
  account_created: 'Account Created',
};

const EVENT_TYPE_VARIANTS: Record<SecurityLogEntry['event_type'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  login: 'default',
  logout: 'secondary',
  password_reset: 'outline',
  password_change: 'default',
  email_change: 'default',
  mfa_enabled: 'default',
  mfa_disabled: 'secondary',
  account_created: 'default',
};

export function SecurityActivityTable() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['security-audit-logs', user?.id, page],
    queryFn: async () => {
      if (!user) return { logs: [], total: 0 };

      const { data, error: queryError, count } = await supabase
        .from('security_audit_logs')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (queryError) throw queryError;

      return {
        logs: (data || []) as SecurityLogEntry[],
        total: count || 0,
      };
    },
    enabled: !!user,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  };

  const getBrowserFromUserAgent = (userAgent: string | null): string => {
    if (!userAgent) return 'Unknown';

    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edg')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';

    return 'Unknown';
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <p className="text-sm font-medium">Failed to load security logs</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  const totalPages = logs ? Math.ceil(logs.total / pageSize) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Security Activity</h3>
          <p className="text-sm text-muted-foreground">
            Recent authentication and security events for your account
          </p>
        </div>
        {logs && logs.total > 0 && (
          <Badge variant="secondary">{logs.total} events</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : !logs || logs.logs.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-muted-foreground">
            No security events found
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Your authentication events will appear here
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Device</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={EVENT_TYPE_VARIANTS[log.event_type]}>
                        {EVENT_TYPE_LABELS[log.event_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.ip_masked || 'Not available'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-3 w-3" />
                        {getBrowserFromUserAgent(log.user_agent)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="text-xs px-3 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="text-xs px-3 py-1 rounded border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
