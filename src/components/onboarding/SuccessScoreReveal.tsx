import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessScoreRevealProps {
  score: number;
  isCalculating: boolean;
}

export function SuccessScoreReveal({ score, isCalculating }: SuccessScoreRevealProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-500';
    if (score >= 70) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 85) return 'from-emerald-500/20 via-emerald-500/10 to-transparent';
    if (score >= 70) return 'from-amber-500/20 via-amber-500/10 to-transparent';
    return 'from-red-500/20 via-red-500/10 to-transparent';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) {
      return "Excellent! You're on track for a very secure retirement.";
    }
    if (score >= 80) {
      return "Great news! You have a strong foundation for retirement.";
    }
    if (score >= 70) {
      return "Good progress! A few optimizations could boost your security.";
    }
    if (score >= 60) {
      return "You're building, but there's room for improvement.";
    }
    return "Let's work together to strengthen your retirement plan.";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return CheckCircle2;
    if (score >= 60) return TrendingUp;
    return AlertTriangle;
  };

  const ScoreIcon = getScoreIcon(score);

  if (isCalculating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="h-24 w-24 rounded-full border-4 border-primary/30 border-t-primary mb-6"
        />
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-lg text-muted-foreground"
        >
          Analyzing your retirement outlook...
        </motion.p>
        <div className="mt-4 space-y-2 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground/70"
          >
            Running 5,000 market scenarios
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-muted-foreground/70"
          >
            Modeling inflation & healthcare costs
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-sm text-muted-foreground/70"
          >
            Calculating Social Security benefits
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-8"
    >
      {/* Background Gradient */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-50',
          getScoreGradient(score)
        )}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Score Circle */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="relative mb-6"
        >
          <svg className="h-40 w-40" viewBox="0 0 100 100">
            {/* Background Circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted/30"
            />
            {/* Progress Circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={getScoreColor(score)}
              strokeDasharray={`${score * 2.83} 283`}
              strokeDashoffset="0"
              transform="rotate(-90 50 50)"
              initial={{ strokeDasharray: '0 283' }}
              animate={{ strokeDasharray: `${score * 2.83} 283` }}
              transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className={cn('text-4xl font-bold', getScoreColor(score))}
            >
              {score}%
            </motion.span>
            <span className="text-xs text-muted-foreground">Success Rate</span>
          </div>
        </motion.div>

        {/* Icon & Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-center gap-2">
            <ScoreIcon className={cn('h-5 w-5', getScoreColor(score))} />
            <span className="font-semibold text-lg">
              {score >= 70 ? 'On Track' : 'Needs Attention'}
            </span>
          </div>
          <p className="text-muted-foreground max-w-md">
            {getScoreMessage(score)}
          </p>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20"
        >
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-medium">
              Let's make this plan 100% accurate
            </span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
