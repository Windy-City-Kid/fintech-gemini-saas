-- Create a secure table for Plaid access tokens (not accessible by clients)
CREATE TABLE public.plaid_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plaid_item_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(plaid_item_id)
);

-- Enable RLS but create NO policies - this means only service_role can access
ALTER TABLE public.plaid_tokens ENABLE ROW LEVEL SECURITY;

-- Add a comment explaining the security model
COMMENT ON TABLE public.plaid_tokens IS 'Secure storage for Plaid access tokens. No RLS policies = only service_role can access.';

-- Migrate existing tokens from accounts table to the new secure table
INSERT INTO public.plaid_tokens (user_id, account_id, plaid_item_id, access_token)
SELECT DISTINCT ON (a.plaid_item_id)
  a.user_id,
  a.id,
  a.plaid_item_id,
  a.plaid_access_token
FROM public.accounts a
WHERE a.plaid_access_token IS NOT NULL 
  AND a.plaid_item_id IS NOT NULL;

-- Remove the plaid_access_token column from accounts table
ALTER TABLE public.accounts DROP COLUMN IF EXISTS plaid_access_token;

-- Add trigger for updated_at
CREATE TRIGGER update_plaid_tokens_updated_at
  BEFORE UPDATE ON public.plaid_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();