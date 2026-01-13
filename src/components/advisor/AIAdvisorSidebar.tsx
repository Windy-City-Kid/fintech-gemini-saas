import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  MessageCircle, 
  X, 
  Send, 
  Paperclip, 
  Trash2, 
  Sparkles,
  Loader2,
  Image as ImageIcon,
  FileText,
  User,
  Bot,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePlanContext } from '@/hooks/usePlanContext';
import { useAIAdvisor, ChatMessage } from '@/hooks/useAIAdvisor';
import { cn } from '@/lib/utils';

interface AIAdvisorSidebarProps {
  defaultOpen?: boolean;
}

export function AIAdvisorSidebar({ defaultOpen = false }: AIAdvisorSidebarProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputValue, setInputValue] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { planContext, isLoading: isPlanLoading } = usePlanContext();
  const { 
    messages, 
    isLoading, 
    sendMessage, 
    clearMessages,
    cancelRequest,
  } = useAIAdvisor({ planContext });

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedImage) return;

    sendMessage(inputValue.trim(), selectedImage || undefined);
    setInputValue('');
    setSelectedImage(null);
    setSelectedFileName(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload an image (JPEG, PNG, WebP) or PDF file.');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB.');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
      setSelectedFileName(file.name);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const suggestedQuestions = [
    "Can I afford to retire at 60?",
    "Should I do a Roth conversion this year?",
    "How much can I safely spend per month?",
    "When should I claim Social Security?",
  ];

  if (!isOpen) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setIsOpen(true)}
              className="fixed right-4 bottom-4 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              size="icon"
            >
              <MessageCircle className="h-6 w-6" />
              <span className="sr-only">Open AI Advisor</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Ask Ariel, your AI Advisor</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-screen w-96 bg-background border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Ariel</h2>
            <p className="text-xs text-muted-foreground">Your AI Financial Advisor</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearMessages}
                  className="h-8 w-8"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear conversation</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Plan Context Status */}
      {isPlanLoading ? (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading your plan data...
        </div>
      ) : planContext ? (
        <div className="px-4 py-2 bg-green-500/10 border-b flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          Connected to your plan • ${planContext.totalNetWorth.toLocaleString()} net worth
        </div>
      ) : (
        <div className="px-4 py-2 bg-amber-500/10 border-b flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          Sign in to access personalized advice
        </div>
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="h-16 w-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-medium text-foreground mb-2">Hi, I'm Ariel! 👋</h3>
              <p className="text-sm text-muted-foreground">
                I have access to your complete retirement plan. Ask me anything about your finances, upload documents for analysis, or get chart explanations.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Try asking:
              </p>
              {suggestedQuestions.map((question, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left h-auto py-2 px-3"
                  onClick={() => setInputValue(question)}
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Ariel is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Selected File Preview */}
      {selectedImage && (
        <div className="px-4 py-2 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            {selectedImage.startsWith('data:image') ? (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground truncate flex-1">
              {selectedFileName}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                setSelectedImage(null);
                setSelectedFileName(null);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upload document or image</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your retirement plan..."
            className="flex-1"
            disabled={isLoading || !planContext}
          />

          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={isLoading || (!inputValue.trim() && !selectedImage) || !planContext}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-gradient-to-br from-primary/20 to-primary/10"
      )}>
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Sparkles className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={cn(
        "rounded-2xl px-4 py-2.5 max-w-[80%]",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-sm" 
          : "bg-muted rounded-tl-sm"
      )}>
        {message.imageUrl && (
          <div className="mb-2">
            <img 
              src={message.imageUrl} 
              alt="Uploaded" 
              className="max-w-full rounded-lg max-h-48 object-contain"
            />
          </div>
        )}
        <div className={cn(
          "text-sm whitespace-pre-wrap",
          !isUser && "prose prose-sm dark:prose-invert max-w-none"
        )}>
          {message.content || (
            <span className="text-muted-foreground italic">Thinking...</span>
          )}
        </div>
        <p className={cn(
          "text-xs mt-1",
          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}
