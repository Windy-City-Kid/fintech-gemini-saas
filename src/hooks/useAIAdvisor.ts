import { useState, useCallback, useRef } from 'react';
import { PlanContext } from './usePlanContext';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  imageUrl?: string;
}

interface ChartContext {
  chartType: string;
  chartData: unknown;
  chartTitle: string;
}

interface UseAIAdvisorOptions {
  planContext: PlanContext | null;
}

export function useAIAdvisor({ planContext }: UseAIAdvisorOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    content: string,
    imageData?: string,
    chartContext?: ChartContext
  ) => {
    if (!planContext) {
      toast.error('Plan data not loaded yet');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      imageUrl: imageData,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Prepare messages for API
    const apiMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
    apiMessages.push({ role: 'user', content });

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: apiMessages,
            planContext,
            chartContext,
            imageData,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 402) {
          toast.error('AI credits exhausted. Please add funds to continue.');
        } else {
          toast.error(errorData.error || 'Failed to get AI response');
        }
        setIsLoading(false);
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      // Stream the response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let assistantMessageId = crypto.randomUUID();

      // Add empty assistant message
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => prev.map(msg =>
                msg.id === assistantMessageId
                  ? { ...msg, content: assistantContent }
                  : msg
              ));
            }
          } catch {
            // Incomplete JSON, wait for more data
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('AI Advisor error:', error);
        toast.error('Failed to get AI response');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, planContext]);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const askAboutChart = useCallback((chartContext: ChartContext) => {
    sendMessage(
      `Explain this ${chartContext.chartTitle} chart to me. What are the key insights and what should I do about it?`,
      undefined,
      chartContext
    );
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    sendMessage,
    cancelRequest,
    clearMessages,
    askAboutChart,
  };
}
