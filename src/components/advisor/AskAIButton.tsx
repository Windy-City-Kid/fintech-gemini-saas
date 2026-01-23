import { useContext } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles } from 'lucide-react';
import { AIAdvisorContext } from '@/contexts/AIAdvisorContext';

interface AskAIButtonProps {
  chartTitle: string;
  chartType: string;
  chartData: unknown;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

interface ChartContext {
  chartTitle: string;
  chartType: string;
  chartData: unknown;
}

export function AskAIButton({
  chartTitle,
  chartType,
  chartData,
  className,
  variant = 'ghost',
  size = 'sm',
}: AskAIButtonProps) {
  // Hooks must be called unconditionally at the top level
  // Using useContext directly to get nullable context (doesn't throw)
  const context = useContext(AIAdvisorContext);

  const handleClick = () => {
    if (context?.openWithChartContext) {
      const chartContext: ChartContext = {
        chartTitle,
        chartType,
        chartData,
      };
      context.openWithChartContext(chartContext);
    }
  };

  const isDisabled = !context?.openWithChartContext;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={className}
            disabled={isDisabled}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Ask AI
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask The Advisor to explain this chart</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
