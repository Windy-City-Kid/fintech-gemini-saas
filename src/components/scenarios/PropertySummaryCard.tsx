import { Home, TrendingUp, Banknote, CalendarClock } from 'lucide-react';
import { Property } from '@/hooks/useProperties';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface PropertySummaryCardProps {
  property: Property | undefined;
  totalEquity: number;
  yearsToRetirement: number;
}

export function PropertySummaryCard({ property, totalEquity, yearsToRetirement }: PropertySummaryCardProps) {
  const navigate = useNavigate();
  
  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Calculate mortgage payoff timeline
  const getPayoffInfo = () => {
    if (!property || !property.mortgage_balance || !property.mortgage_monthly_payment) {
      return null;
    }
    
    const monthlyRate = (property.mortgage_interest_rate || 0) / 100 / 12;
    const balance = property.mortgage_balance;
    const payment = property.mortgage_monthly_payment;
    
    if (monthlyRate === 0) {
      const monthsRemaining = Math.ceil(balance / payment);
      return { yearsRemaining: monthsRemaining / 12, paidOffBeforeRetirement: monthsRemaining / 12 <= yearsToRetirement };
    }
    
    // Calculate months remaining using amortization formula
    const monthsRemaining = Math.ceil(
      -Math.log(1 - (monthlyRate * balance) / payment) / Math.log(1 + monthlyRate)
    );
    const yearsRemaining = monthsRemaining / 12;
    
    return {
      yearsRemaining,
      paidOffBeforeRetirement: yearsRemaining <= yearsToRetirement,
    };
  };

  const payoffInfo = getPayoffInfo();
  const hasProperty = property && property.estimated_value > 0;
  const hasRelocation = property?.relocation_age;

  // Estimate home value at retirement (4.4% annual appreciation)
  const appreciationRate = 0.044;
  const projectedHomeValue = hasProperty 
    ? property.estimated_value * Math.pow(1 + appreciationRate, yearsToRetirement)
    : 0;

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Home className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Home & Real Estate</h3>
            <p className="text-sm text-muted-foreground">Housing in simulation</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/real-estate')}>
          Manage
        </Button>
      </div>

      {!hasProperty ? (
        <div className="text-center py-6 text-muted-foreground">
          <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No property configured</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => navigate('/real-estate')}
          >
            Add Property
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Equity */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Current Equity</span>
            </div>
            <span className="font-mono font-semibold text-primary">
              {formatCurrency(totalEquity)}
            </span>
          </div>

          {/* Mortgage Balance */}
          {property.mortgage_balance > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Mortgage Balance</span>
              </div>
              <span className="font-mono font-semibold">
                {formatCurrency(property.mortgage_balance)}
              </span>
            </div>
          )}

          {/* Payoff Timeline */}
          {payoffInfo && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Payoff Timeline</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <span className={`font-mono font-semibold ${payoffInfo.paidOffBeforeRetirement ? 'text-green-600' : 'text-amber-600'}`}>
                      {payoffInfo.yearsRemaining.toFixed(1)} years
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm">
                      {payoffInfo.paidOffBeforeRetirement 
                        ? 'Mortgage paid off before retirement' 
                        : 'Mortgage continues into retirement'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Simulation Impact */}
          <div className="pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Simulation Impact</p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Monthly payment: {formatCurrency(property.mortgage_monthly_payment || 0)}/mo</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Projected value at retirement: {formatCurrency(projectedHomeValue)}</span>
              </li>
              {hasRelocation && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span>Relocation planned at age {property.relocation_age}</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
