import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Shield, 
  Zap, 
  Percent, 
  Home, 
  Link2, 
  PiggyBank, 
  CreditCard, 
  Banknote, 
  Heart, 
  ArrowLeftRight, 
  Users,
  ChevronDown,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanCompletion } from '@/hooks/usePlanCompletion';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';

const myPlanItems = [
  { title: 'Summary', path: '/summary', icon: LayoutDashboard, completionKey: 'summary' as const },
  { title: 'Connections', path: '/connections', icon: Link2, completionKey: 'connections' as const },
  { title: 'Accounts & Assets', path: '/accounts', icon: PiggyBank, completionKey: 'accounts' as const },
  { title: 'Home and Real Estate', path: '/real-estate', icon: Home, completionKey: 'realEstate' as const },
  { title: 'Debts', path: '/debts', icon: CreditCard, completionKey: 'debts' as const },
  { title: 'Income', path: '/income', icon: Banknote, completionKey: 'income' as const },
  { title: 'Expenses and Healthcare', path: '/expenses', icon: Heart, completionKey: 'expenses' as const },
  { title: 'Money Flows', path: '/money-flows', icon: ArrowLeftRight, completionKey: 'moneyFlows' as const },
  { title: 'Estate Planning', path: '/estate-planning', icon: Users, completionKey: 'estatePlanning' as const },
  { title: 'Rate Assumptions', path: '/rate-assumptions', icon: Percent, completionKey: 'rateAssumptions' as const },
];

const otherItems = [
  { title: 'Retirement Scenarios', path: '/scenarios', icon: TrendingUp },
  { title: 'Settings', path: '/settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { isPro, isLoading, startCheckout } = useSubscription();
  const { completion, completedCount, totalCount } = usePlanCompletion();
  const [myPlanOpen, setMyPlanOpen] = useState(true);

  const isMyPlanActive = myPlanItems.some(item => location.pathname === item.path);

  return (
    <aside className="fixed left-0 top-8 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">WealthPlan</h1>
            <p className="text-xs text-muted-foreground">Financial Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Dashboard Link */}
        <NavLink
          to="/"
          className={cn(
            'sidebar-item',
            location.pathname === '/' && 'active'
          )}
        >
          <FileText className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>

        {/* My Plan Collapsible Section */}
        <Collapsible open={myPlanOpen} onOpenChange={setMyPlanOpen}>
          <CollapsibleTrigger className={cn(
            'sidebar-item w-full justify-between',
            isMyPlanActive && 'text-primary'
          )}>
            <div className="flex items-center gap-3">
              <LayoutDashboard className="h-5 w-5" />
              <span>My Plan</span>
              <span className="text-xs text-muted-foreground ml-1">
                ({completedCount}/{totalCount})
              </span>
            </div>
            <ChevronDown className={cn(
              'h-4 w-4 transition-transform',
              myPlanOpen && 'rotate-180'
            )} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-0.5">
            {myPlanItems.map((item) => {
              const isActive = location.pathname === item.path;
              const isComplete = completion[item.completionKey];
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'sidebar-item text-sm py-2 justify-between',
                    isActive && 'active'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </div>
                  {isComplete && (
                    <CheckCircle2 className="h-4 w-4 text-chart-2 flex-shrink-0" />
                  )}
                </NavLink>
              );
            })}
          </CollapsibleContent>
        </Collapsible>

        {/* Other Navigation Items */}
        <div className="pt-2 border-t border-sidebar-border mt-2">
          {otherItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'sidebar-item',
                  isActive && 'active'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.title}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Upgrade banner for free users */}
      {!isLoading && !isPro && (
        <div className="px-4 pb-4">
          <button
            onClick={() => startCheckout()}
            className="w-full p-4 rounded-lg bg-gradient-to-r from-primary/20 to-chart-2/20 border border-primary/30 hover:border-primary/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Upgrade to Pro</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Unlock Plaid syncing & simulations
            </p>
          </button>
        </div>
      )}

      {/* User section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-sidebar-accent/50">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-xs font-medium text-primary">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {user?.email}
            </p>
            <p className={cn(
              "text-xs",
              isPro ? "text-primary" : "text-muted-foreground"
            )}>
              {isPro ? 'Pro Plan' : 'Free Plan'}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="sidebar-item w-full mt-2 text-destructive hover:text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
