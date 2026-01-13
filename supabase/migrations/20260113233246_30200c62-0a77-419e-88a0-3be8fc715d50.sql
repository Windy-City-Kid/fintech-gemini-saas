-- Create guardrail_snapshots table to track monthly guardrail status
CREATE TABLE public.guardrail_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_value NUMERIC NOT NULL,
  initial_portfolio_value NUMERIC NOT NULL,
  monthly_spending NUMERIC NOT NULL,
  current_withdrawal_rate NUMERIC NOT NULL,
  initial_withdrawal_rate NUMERIC NOT NULL,
  upper_guardrail NUMERIC NOT NULL,
  lower_guardrail NUMERIC NOT NULL,
  zone TEXT NOT NULL CHECK (zone IN ('prosperity', 'safe', 'caution')),
  safe_spending_monthly NUMERIC NOT NULL,
  adjusted_spending_monthly NUMERIC NOT NULL,
  adjustment_amount NUMERIC NOT NULL,
  triggered_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guardrail_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own guardrail snapshots"
ON public.guardrail_snapshots
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own guardrail snapshots"
ON public.guardrail_snapshots
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for efficient querying
CREATE INDEX idx_guardrail_snapshots_user_created ON public.guardrail_snapshots(user_id, created_at DESC);

-- Enable realtime for guardrail updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.guardrail_snapshots;