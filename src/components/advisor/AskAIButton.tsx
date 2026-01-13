import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles } from 'lucide-react';

interface AskAIButtonProps {
  chartTitle: string;
  chartType: string;
  chartData: unknown;
  onAsk: (context: { chartTitle: string; chartType: string; chartData: unknown }) => void;
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export function AskAIButton({
  chartTitle,
  chartType,
  chartData,
  onAsk,
  className,
  variant = 'ghost',
  size = 'sm',
}: AskAIButtonProps) {
  const handleClick = () => {
    onAsk({
      chartTitle,
      chartType,
      chartData,
    });
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
          >
            <Sparkles className="h-4 w-4 mr-1" />
            Ask AI
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask Ariel to explain this chart</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
