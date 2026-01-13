import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ArrowLeft, ArrowRight, Sparkles, Upload, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OnboardingChat } from '@/components/onboarding/OnboardingChat';
import { SuccessScoreReveal } from '@/components/onboarding/SuccessScoreReveal';
import { useOnboarding, OnboardingData } from '@/hooks/useOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  options?: Array<{ label: string; value: string }>;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    step,
    data,
    successRate,
    isCalculating,
    updateData,
    nextStep,
    prevStep,
    calculateSuccessRate,
    saveOnboardingData,
    setStep,
  } = useOnboarding();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showScoreReveal, setShowScoreReveal] = useState(false);
  const [inputType, setInputType] = useState<'text' | 'number' | 'currency' | 'choice' | 'file'>('text');
  const [inputPlaceholder, setInputPlaceholder] = useState('Type your answer...');
  const [showInput, setShowInput] = useState(true);
  const [pendingFileUpload, setPendingFileUpload] = useState(false);

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: crypto.randomUUID(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, []);

  const simulateTyping = useCallback(async (delay = 800) => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, delay));
    setIsTyping(false);
  }, []);

  // Step 1: Welcome & Age Question
  useEffect(() => {
    if (step === 1 && messages.length === 0) {
      const initStep = async () => {
        await simulateTyping(500);
        addMessage({
          role: 'assistant',
          content: `Hi, I'm The Advisor — your AI-powered retirement planning partner. 👋

To give you an instant retirement success score, I just need to know a couple of things:

**What is your current age and your target retirement age?**

For example: "I'm 52 and want to retire at 62"`,
        });
        setInputType('text');
        setInputPlaceholder('e.g., 52 and 65');
      };
      initStep();
    }
  }, [step, messages.length, addMessage, simulateTyping]);

  // Handle user responses
  const handleMessage = async (value: string) => {
    if (step === 1) {
      // Parse age input
      const ages = value.match(/\d+/g);
      if (ages && ages.length >= 2) {
        const currentAge = parseInt(ages[0]);
        const retirementAge = parseInt(ages[1]);
        
        if (currentAge >= 18 && currentAge <= 90 && retirementAge > currentAge && retirementAge <= 100) {
          addMessage({ role: 'user', content: value });
          updateData({ currentAge, retirementAge });
          
          await simulateTyping();
          addMessage({
            role: 'assistant',
            content: `Got it — you're ${currentAge} and planning to retire at ${retirementAge}. That gives us ${retirementAge - currentAge} years to build your security.

Now, **roughly how much do you earn annually today?** And do you expect that to stay stable, grow, or decline before you retire?`,
          });
          setInputType('currency');
          setInputPlaceholder('e.g., $85,000');
          nextStep();
        } else {
          addMessage({ role: 'user', content: value });
          await simulateTyping(400);
          addMessage({
            role: 'assistant',
            content: "Those ages don't quite add up. Please make sure your current age is between 18-90 and retirement age is after your current age.",
          });
        }
      } else {
        addMessage({ role: 'user', content: value });
        await simulateTyping(400);
        addMessage({
          role: 'assistant',
          content: "I need both your current age and target retirement age. Try something like: \"I'm 55 and want to retire at 65\"",
        });
      }
    } else if (step === 2) {
      // Parse income
      const incomeStr = value.replace(/[^0-9]/g, '');
      const income = parseInt(incomeStr);
      
      if (income >= 10000) {
        addMessage({
          role: 'user',
          content: `$${income.toLocaleString()}/year`,
        });
        updateData({ annualIncome: income });
        
        await simulateTyping();
        addMessage({
          role: 'assistant',
          content: `$${income.toLocaleString()} annually — that's a solid foundation.

Next up: **In total, across all 401(k)s, IRAs, brokerage accounts, and savings, about how much do you have set aside today?**

Don't worry about being exact — a rough estimate works.`,
          options: [
            { label: 'Income will grow', value: 'growing' },
            { label: 'Staying stable', value: 'stable' },
            { label: 'May decline', value: 'declining' },
          ],
        });
        setInputType('currency');
        setInputPlaceholder('e.g., $350,000');
        nextStep();
      } else {
        addMessage({ role: 'user', content: value });
        await simulateTyping(400);
        addMessage({
          role: 'assistant',
          content: "Please enter your annual income as a number, like $75,000 or 85000.",
        });
      }
    } else if (step === 3) {
      // Parse assets
      const assetStr = value.replace(/[^0-9]/g, '');
      const assets = parseInt(assetStr);
      
      if (assets >= 0) {
        addMessage({
          role: 'user',
          content: assets > 0 ? `$${assets.toLocaleString()}` : 'Starting fresh',
        });
        updateData({ totalAssets: assets });
        
        await simulateTyping();
        addMessage({
          role: 'assistant',
          content: `${assets > 0 ? `$${assets.toLocaleString()} in savings — you're ahead of many people your age!` : "Starting from scratch is totally fine — we all begin somewhere."}

Last question before your score: **In retirement, what kind of lifestyle do you want?**

• **"Must Spend"** (Basic): Cover essentials, modest lifestyle
• **"Like to Spend"** (Comfortable): Travel, hobbies, dining out

Or tell me a specific monthly budget you have in mind.`,
          options: [
            { label: '💰 Basic (~$4,000/mo)', value: 'basic' },
            { label: '✨ Comfortable (~$6,500/mo)', value: 'comfortable' },
          ],
        });
        setInputType('currency');
        setInputPlaceholder('Or enter custom amount...');
        nextStep();
      } else {
        addMessage({ role: 'user', content: value });
        await simulateTyping(400);
        addMessage({
          role: 'assistant',
          content: "Please enter your total savings as a number. If you're just starting out, you can enter 0.",
        });
      }
    } else if (step === 4) {
      // Parse spending
      const spendingStr = value.replace(/[^0-9]/g, '');
      const spending = parseInt(spendingStr);
      
      if (spending >= 1000) {
        addMessage({
          role: 'user',
          content: `$${spending.toLocaleString()}/month`,
        });
        updateData({ monthlySpending: spending, spendingStyle: spending < 5000 ? 'basic' : 'comfortable' });
        
        // Trigger score calculation
        setShowInput(false);
        await simulateTyping();
        addMessage({
          role: 'assistant',
          content: "Perfect! I have everything I need. Let me run a quick Monte Carlo simulation to calculate your retirement success probability...",
        });
        
        setShowScoreReveal(true);
        await calculateSuccessRate();
        nextStep();
      } else {
        addMessage({ role: 'user', content: value });
        await simulateTyping(400);
        addMessage({
          role: 'assistant',
          content: "Please enter a monthly spending amount of at least $1,000.",
        });
      }
    } else if (step === 5 && value === 'skip') {
      // Skip file upload
      await simulateTyping(400);
      addMessage({
        role: 'assistant',
        content: `No problem! You can always upload documents later.

One last thing: **Aside from basic living expenses, what's ONE big goal you have for retirement?**

• Travel the world
• Buy a beach house
• Leave a legacy for grandkids
• Start a passion project
• Something else?`,
      });
      setInputType('text');
      setInputPlaceholder('My retirement dream is...');
      setShowInput(true);
      nextStep();
    } else if (step === 6) {
      // Save the north star goal
      addMessage({ role: 'user', content: value });
      updateData({ northStarGoal: value });
      
      await simulateTyping();
      addMessage({
        role: 'assistant',
        content: `"${value}" — that's a beautiful goal. I'll keep this as your North Star and factor it into all my recommendations.

🎉 **Your baseline plan is ready!**

From here, you can:
• Connect your actual accounts for precision tracking
• Explore "what-if" scenarios
• Chat with me anytime about your plan

Ready to see your full dashboard?`,
      });
      setShowInput(false);
      
      // Save data
      await saveOnboardingData();
    }
  };

  const handleOptionSelect = async (value: string) => {
    if (step === 3) {
      // Income growth expectation
      updateData({ incomeGrowthExpectation: value as OnboardingData['incomeGrowthExpectation'] });
    } else if (step === 4) {
      // Spending style
      const spending = value === 'basic' ? 4000 : 6500;
      addMessage({
        role: 'user',
        content: value === 'basic' ? 'Basic lifestyle (~$4,000/mo)' : 'Comfortable lifestyle (~$6,500/mo)',
      });
      updateData({ monthlySpending: spending, spendingStyle: value as OnboardingData['spendingStyle'] });
      
      // Trigger score calculation
      setShowInput(false);
      await simulateTyping();
      addMessage({
        role: 'assistant',
        content: "Perfect! I have everything I need. Let me run a quick Monte Carlo simulation to calculate your retirement success probability...",
      });
      
      setShowScoreReveal(true);
      await calculateSuccessRate();
      nextStep();
    }
  };

  const handleFileUpload = async (file: File) => {
    addMessage({
      role: 'user',
      content: `📄 Uploaded: ${file.name}`,
    });
    setPendingFileUpload(true);
    
    await simulateTyping(1500);
    
    // In a real implementation, this would call the AI to extract data
    addMessage({
      role: 'assistant',
      content: `I've received your ${file.name}. In the full version, I'd extract the key data and offer to update your plan automatically.

For now, let's continue with what we have.

**Aside from basic living expenses, what's ONE big goal you have for retirement?**`,
    });
    setPendingFileUpload(false);
    setInputType('text');
    setInputPlaceholder('My retirement dream is...');
    setShowInput(true);
    nextStep();
  };

  // Step 5: Show score and file upload option
  useEffect(() => {
    if (step === 5 && successRate !== null && !isCalculating) {
      const showFileOption = async () => {
        await simulateTyping(1000);
        addMessage({
          role: 'assistant',
          content: `Based on your inputs, you have a **${successRate}% chance of a secure retirement**. ${successRate >= 80 ? "That's excellent!" : successRate >= 70 ? "Good progress!" : "We can improve this."}

To make this plan **100% accurate**, you can upload your latest 401(k) statement, Social Security estimate, or any financial PDF. I'll extract the details automatically.`,
        });
        setInputType('file');
        setShowInput(true);
      };
      showFileOption();
    }
  }, [step, successRate, isCalculating, addMessage, simulateTyping]);

  const handleFinish = () => {
    navigate('/');
    toast.success('Welcome to WealthPlan Pro!', {
      description: 'Your baseline plan has been created.',
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Progress & Branding */}
      <div className="hidden lg:flex lg:w-[400px] flex-col border-r border-border bg-muted/30">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-semibold">WealthPlan Pro</span>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4">
            {[
              { num: 1, title: 'Age & Timeline', icon: '📅' },
              { num: 2, title: 'Income', icon: '💰' },
              { num: 3, title: 'Assets', icon: '📊' },
              { num: 4, title: 'Spending', icon: '🏠' },
              { num: 5, title: 'Your Score', icon: '⭐' },
              { num: 6, title: 'Your Vision', icon: '🎯' },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  step === s.num
                    ? 'bg-primary/10 border border-primary/20'
                    : step > s.num
                    ? 'bg-muted/50'
                    : 'opacity-50'
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                    step > s.num
                      ? 'bg-primary text-primary-foreground'
                      : step === s.num
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s.num ? '✓' : s.icon}
                </div>
                <span
                  className={`text-sm font-medium ${
                    step >= s.num ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Score Preview */}
        {showScoreReveal && (
          <div className="mt-auto p-6">
            <SuccessScoreReveal score={successRate || 0} isCalculating={isCalculating} />
          </div>
        )}
      </div>

      {/* Right Panel - Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">WealthPlan Pro</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>Step {step}/6</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <OnboardingChat
            messages={messages}
            onSendMessage={handleMessage}
            onOptionSelect={handleOptionSelect}
            onFileUpload={handleFileUpload}
            isTyping={isTyping || pendingFileUpload}
            inputType={inputType}
            inputPlaceholder={inputPlaceholder}
            showInput={showInput}
          />
        </div>

        {/* Finish Button */}
        {step === 6 && data.northStarGoal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 border-t border-border bg-background"
          >
            <Button onClick={handleFinish} className="w-full h-12 text-base gap-2">
              <Sparkles className="h-5 w-5" />
              Go to My Dashboard
              <ArrowRight className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
