import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CategoryCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  isComplete?: boolean;
  isExpanded?: boolean;
  onExpand?: () => void;
  children?: ReactNode;
  onStart?: () => void;
  startLabel?: string;
  summary?: ReactNode;
}

export function CategoryCard({
  title,
  subtitle,
  icon,
  isComplete = false,
  isExpanded: controlledExpanded,
  onExpand,
  children,
  onStart,
  startLabel = 'Start',
  summary,
}: CategoryCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  const toggleExpanded = onExpand ?? (() => setInternalExpanded(!internalExpanded));

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={toggleExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-4">
              {/* Status Icon */}
              <div className="flex-shrink-0">
                {isComplete ? (
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                ) : (
                  <Circle className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {/* Icon */}
              {icon && (
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {icon}
                </div>
              )}

              {/* Title & Subtitle */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{title}</h3>
                {subtitle && (
                  <p className="text-sm text-muted-foreground truncate">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Summary when collapsed */}
              {!isExpanded && summary && (
                <div className="hidden md:block text-right text-sm text-muted-foreground">
                  {summary}
                </div>
              )}

              {/* Expand/Collapse or Start */}
              {children ? (
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ) : onStart ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStart();
                  }}
                  className="gap-2"
                >
                  <PlusCircle className="h-4 w-4" />
                  {startLabel}
                </Button>
              ) : null}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        {children && (
          <CollapsibleContent>
            <CardContent className={cn('border-t border-border pt-4')}>
              {children}
            </CardContent>
          </CollapsibleContent>
        )}
      </Collapsible>
    </Card>
  );
}
