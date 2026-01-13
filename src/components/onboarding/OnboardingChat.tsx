import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Upload, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  options?: Array<{ label: string; value: string }>;
  inputType?: 'text' | 'number' | 'currency' | 'choice' | 'file';
}

interface OnboardingChatProps {
  messages: Message[];
  onSendMessage: (value: string) => void;
  onOptionSelect?: (value: string) => void;
  onFileUpload?: (file: File) => void;
  isTyping?: boolean;
  inputType?: 'text' | 'number' | 'currency' | 'choice' | 'file';
  inputPlaceholder?: string;
  showInput?: boolean;
}

export function OnboardingChat({
  messages,
  onSendMessage,
  onOptionSelect,
  onFileUpload,
  isTyping = false,
  inputType = 'text',
  inputPlaceholder = 'Type your answer...',
  showInput = true,
}: OnboardingChatProps) {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    let value = inputValue;
    if (inputType === 'currency') {
      // Parse currency input
      value = inputValue.replace(/[^0-9]/g, '');
    }

    onSendMessage(value);
    setInputValue('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file);
    }
  };

  const formatCurrency = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseInt(num));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'flex',
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-5 py-3',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 border border-border'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      The Advisor
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>

                {/* Options */}
                {message.options && onOptionSelect && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {message.options.map((option) => (
                      <Button
                        key={option.value}
                        variant="outline"
                        size="sm"
                        onClick={() => onOptionSelect(option.value)}
                        className="hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-muted/50 border border-border rounded-2xl px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                </div>
                <span className="text-sm text-muted-foreground">
                  The Advisor is thinking...
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {showInput && (
        <div className="border-t border-border p-4 bg-background/80 backdrop-blur-sm">
          {inputType === 'file' ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full h-20 border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Drop a file here or click to browse
                  </span>
                </div>
              </Button>
              <Button
                variant="ghost"
                onClick={() => onSendMessage('skip')}
                className="w-full text-muted-foreground"
              >
                Skip for now
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  value={inputType === 'currency' ? formatCurrency(inputValue) : inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={inputPlaceholder}
                  className="pr-4 h-12 text-base"
                  type={inputType === 'number' ? 'number' : 'text'}
                  min={inputType === 'number' ? 0 : undefined}
                />
              </div>
              <Button
                type="submit"
                size="icon"
                className="h-12 w-12 rounded-xl"
                disabled={!inputValue.trim()}
              >
                <ArrowRight className="h-5 w-5" />
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
