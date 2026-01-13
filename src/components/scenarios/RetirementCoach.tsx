import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, MessageCircle, RefreshCw, AlertTriangle, TrendingUp, Lightbulb, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface SanitizedPlanSummary {
  successScore: number;
  withdrawalRate: number;
  annualStateTax: number;
  annualPropertyTax: number;
  estateValueAt100: number;
  currentState: string;
  destinationState?: string;
  destinationStateTax?: number;
  ssFilingAge: number;
  monthlySpending: number;
  monthlyIncome: number;
  housingCostPercent: number;
  currentAge: number;
  retirementAge: number;
  isMarried: boolean;
  portfolioValue: number;
}

interface RetirementCoachProps {
  planSummary: SanitizedPlanSummary;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/retirement-coach`;

export function RetirementCoach({ planSummary }: RetirementCoachProps) {
  const [advice, setAdvice] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const getCoachAdvice = useCallback(async () => {
    setIsLoading(true);
    setHasStarted(true);
    setAdvice('');

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ planSummary }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit exceeded. Please try again in a moment.");
        setIsLoading(false);
        return;
      }

      if (resp.status === 402) {
        toast.error("AI credits exhausted. Please add funds to your workspace.");
        setIsLoading(false);
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to get coach advice");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setAdvice(assistantContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Coach error:", error);
      toast.error("Failed to get advice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [planSummary]);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'On Track', variant: 'default' as const, className: 'bg-green-500' };
    if (score >= 70) return { label: 'Needs Attention', variant: 'secondary' as const, className: 'bg-amber-500' };
    return { label: 'At Risk', variant: 'destructive' as const, className: 'bg-red-500' };
  };

  const scoreBadge = getScoreBadge(planSummary.successScore);

  return (
    <Card className="overflow-hidden border-2 border-primary/20">
      <CardHeader className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-primary/30">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-lg font-bold">
              A
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl">Ariel</CardTitle>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Coach
              </Badge>
            </div>
            <CardDescription>Your Personal Financial Engineer</CardDescription>
          </div>
          <Badge className={`${scoreBadge.className} text-white`}>
            {scoreBadge.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Success Score</p>
            <p className={`text-2xl font-bold ${getScoreColor(planSummary.successScore)}`}>
              {planSummary.successScore}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Withdrawal Rate</p>
            <p className={`text-2xl font-bold ${planSummary.withdrawalRate > 5 ? 'text-red-500' : planSummary.withdrawalRate > 4 ? 'text-amber-500' : 'text-green-600'}`}>
              {planSummary.withdrawalRate.toFixed(1)}%
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Annual Taxes</p>
            <p className="text-2xl font-bold">
              ${Math.round((planSummary.annualStateTax + planSummary.annualPropertyTax) / 1000)}K
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-xs text-muted-foreground">Estate at 100</p>
            <p className="text-2xl font-bold text-primary">
              ${Math.round(planSummary.estateValueAt100 / 1000000 * 10) / 10}M
            </p>
          </div>
        </div>

        <Separator />

        {/* Coach Advice Area */}
        {!hasStarted ? (
          <div className="text-center py-6">
            <div className="p-4 rounded-full bg-primary/10 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 text-primary" />
            </div>
            <h4 className="font-semibold mb-2">Get Personalized Advice</h4>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Ariel will analyze your retirement plan and provide 3 actionable recommendations 
              tailored to your specific situation.
            </p>
            <Button onClick={getCoachAdvice} size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Ask Ariel for Advice
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Heuristic Warnings */}
            {planSummary.withdrawalRate > 5 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-400">High Burn Warning</p>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    Your {planSummary.withdrawalRate.toFixed(1)}% withdrawal rate exceeds the safe 4% rule.
                  </p>
                </div>
              </div>
            )}

            {planSummary.ssFilingAge === 62 && planSummary.successScore < 70 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200">
                <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">Consider Delayed Filing</p>
                  <p className="text-sm text-amber-600 dark:text-amber-300">
                    Filing at 62 with a {planSummary.successScore}% success rate is risky. Delaying to 70 increases benefits by ~76%.
                  </p>
                </div>
              </div>
            )}

            {planSummary.destinationState && planSummary.annualStateTax > 10000 && (planSummary.destinationStateTax || 0) < 2000 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-700 dark:text-green-400">Relocation Opportunity</p>
                  <p className="text-sm text-green-600 dark:text-green-300">
                    Moving to {planSummary.destinationState} could save ${Math.round(planSummary.annualStateTax - (planSummary.destinationStateTax || 0)).toLocaleString()}/year in taxes.
                  </p>
                </div>
              </div>
            )}

            {/* AI Response */}
            <ScrollArea className="h-[300px] rounded-lg border p-4 bg-muted/30">
              {isLoading && !advice ? (
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">Ariel is analyzing your plan...</span>
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {advice.split('\n').map((line, i) => {
                    if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
                      return (
                        <div key={i} className="flex items-start gap-2 mb-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                          <span>{line.replace(/^[•\-*]\s*/, '')}</span>
                        </div>
                      );
                    }
                    if (line.trim() === '') return <br key={i} />;
                    return <p key={i} className="mb-2">{line}</p>;
                  })}
                  {isLoading && <span className="animate-pulse">▊</span>}
                </div>
              )}
            </ScrollArea>

            <Button 
              onClick={getCoachAdvice} 
              variant="outline" 
              className="w-full gap-2"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Thinking...' : 'Get Fresh Advice'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
