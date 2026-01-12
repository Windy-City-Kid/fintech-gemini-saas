-- Add plaid_item_id column to accounts table for webhook matching
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS plaid_item_id TEXT;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_accounts_plaid_item_id ON public.accounts(plaid_item_id);