-- Create holdings table to store investment positions
CREATE TABLE public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  security_id TEXT,
  ticker_symbol TEXT,
  security_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  cost_basis NUMERIC,
  market_value NUMERIC NOT NULL DEFAULT 0,
  asset_class TEXT NOT NULL DEFAULT 'Other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add account_mask column to accounts table for masked display
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS account_mask TEXT;

-- Add plaid_account_id to link holdings to specific Plaid accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;

-- Enable RLS on holdings
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- RLS policies for holdings
CREATE POLICY "Users can view their own holdings"
ON public.holdings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own holdings"
ON public.holdings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings"
ON public.holdings
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings"
ON public.holdings
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX idx_holdings_account_id ON public.holdings(account_id);
CREATE INDEX idx_holdings_asset_class ON public.holdings(asset_class);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_holdings_updated_at
BEFORE UPDATE ON public.holdings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();