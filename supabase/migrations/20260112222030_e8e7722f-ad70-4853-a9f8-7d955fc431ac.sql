-- Create money_flows table for contribution and withdrawal settings
CREATE TABLE public.money_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Recurring Contributions
  contribution_name TEXT NOT NULL DEFAULT 'Default Contribution',
  account_type TEXT NOT NULL DEFAULT '401k', -- 401k, IRA, Brokerage, Roth
  annual_amount NUMERIC NOT NULL DEFAULT 0,
  is_income_linked BOOLEAN NOT NULL DEFAULT false, -- Prioritize over expenses
  income_link_percentage NUMERIC DEFAULT NULL, -- % of income to contribute
  start_age INTEGER NOT NULL DEFAULT 25,
  end_age INTEGER NOT NULL DEFAULT 65,
  
  -- Excess Income Rule (only one active per user)
  excess_income_enabled BOOLEAN NOT NULL DEFAULT false,
  excess_save_percentage NUMERIC DEFAULT 50, -- Save X% of surplus
  excess_target_account TEXT DEFAULT 'Brokerage', -- Account to save to
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add withdrawal_order to scenarios for the hierarchy
ALTER TABLE public.scenarios 
ADD COLUMN withdrawal_order TEXT[] DEFAULT ARRAY['Brokerage', '401k', 'IRA', 'Roth']::TEXT[];

-- Enable RLS
ALTER TABLE public.money_flows ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own money flows" 
ON public.money_flows 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own money flows" 
ON public.money_flows 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own money flows" 
ON public.money_flows 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own money flows" 
ON public.money_flows 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_money_flows_updated_at
BEFORE UPDATE ON public.money_flows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();