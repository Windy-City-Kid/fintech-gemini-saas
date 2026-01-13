import { ReactNode } from 'react';
import { ComplianceHeader } from './ComplianceHeader';
import { AppSidebar } from './AppSidebar';
import { AIAdvisorSidebar } from '@/components/advisor';
import { AIAdvisorProvider } from '@/contexts/AIAdvisorContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AIAdvisorProvider>
      <div className="min-h-screen">
        <ComplianceHeader />
        <AppSidebar />
        <main className="ml-64 pt-8 min-h-screen">
          <div className="p-8">
            {children}
          </div>
        </main>
        <AIAdvisorSidebar />
      </div>
    </AIAdvisorProvider>
  );
}
