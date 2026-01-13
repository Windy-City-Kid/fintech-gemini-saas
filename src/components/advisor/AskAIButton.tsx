import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles } from 'lucide-react';
import { useAIAdvisorContext } from '@/contexts/AIAdvisorContext';

interface AskAIButtonProps {
  chartTitle: string;
  chartType: string;
  chartData: unknown;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export function AskAIButton({
  chartTitle,
  chartType,
  chartData,
  className,
  variant = 'ghost',
  size = 'sm',
}: AskAIButtonProps) {
  let context: ReturnType<typeof useAIAdvisorContext> | null = null;
  
  try {
    context = useAIAdvisorContext();
  } catch {
    // Context not available - button will be disabled
  }

  const handleClick = () => {
    if (context?.openWithChartContext) {
      context.openWithChartContext({
        chartTitle,
        chartType,
        chartData,
      });
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={className}
            disabled={!context}
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
