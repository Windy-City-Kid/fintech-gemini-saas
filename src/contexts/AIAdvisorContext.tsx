import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { usePlanContext, PlanContext } from '@/hooks/usePlanContext';
import { useAIAdvisor, ChatMessage } from '@/hooks/useAIAdvisor';

interface ChartContext {
  chartTitle: string;
  chartType: string;
  chartData: unknown;
}

interface AIAdvisorContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  isLoading: boolean;
  planContext: PlanContext | null;
  isPlanLoading: boolean;
  sendMessage: (content: string, imageData?: string, chartContext?: ChartContext) => void;
  askAboutChart: (chartContext: ChartContext) => void;
  clearMessages: () => void;
  openAndAsk: (question: string) => void;
  openWithChartContext: (chartContext: ChartContext) => void;
}

const AIAdvisorContext = createContext<AIAdvisorContextType | null>(null);

export function AIAdvisorProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { planContext, isLoading: isPlanLoading } = usePlanContext();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearMessages,
    askAboutChart,
  } = useAIAdvisor({ planContext });

  const openAndAsk = useCallback((question: string) => {
    setIsOpen(true);
    // Small delay to ensure sidebar is open before sending
    setTimeout(() => {
      sendMessage(question);
    }, 100);
  }, [sendMessage]);

  const openWithChartContext = useCallback((chartContext: ChartContext) => {
    setIsOpen(true);
    // Small delay to ensure sidebar is open before sending
    setTimeout(() => {
      askAboutChart(chartContext);
    }, 100);
  }, [askAboutChart]);

  return (
    <AIAdvisorContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        isLoading,
        planContext,
        isPlanLoading,
        sendMessage,
        askAboutChart,
        clearMessages,
        openAndAsk,
        openWithChartContext,
      }}
    >
      {children}
    </AIAdvisorContext.Provider>
  );
}

export function useAIAdvisorContext() {
  const context = useContext(AIAdvisorContext);
  if (!context) {
    throw new Error('useAIAdvisorContext must be used within AIAdvisorProvider');
  }
  return context;
}
