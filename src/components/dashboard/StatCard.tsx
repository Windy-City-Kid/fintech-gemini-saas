import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, changeType = 'neutral', icon, className }: StatCardProps) {
  return (
    <div className={cn('stat-card animate-fade-in', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-semibold mt-2 font-mono tracking-tight">{value}</p>
          {change && (
            <p className={cn(
              'text-sm mt-2 font-medium',
              changeType === 'positive' && 'balance-positive',
              changeType === 'negative' && 'balance-negative',
              changeType === 'neutral' && 'text-muted-foreground'
            )}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
