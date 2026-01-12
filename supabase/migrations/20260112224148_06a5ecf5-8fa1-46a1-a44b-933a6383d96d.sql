-- Create properties table for real estate
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  property_name TEXT NOT NULL DEFAULT 'Primary Residence',
  property_type TEXT NOT NULL DEFAULT 'primary_residence',
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  mortgage_balance NUMERIC DEFAULT 0,
  mortgage_interest_rate NUMERIC DEFAULT 0,
  mortgage_monthly_payment NUMERIC DEFAULT 0,
  mortgage_term_months INTEGER DEFAULT 360,
  mortgage_start_date DATE,
  plaid_account_id TEXT,
  plaid_item_id TEXT,
  is_manual_entry BOOLEAN NOT NULL DEFAULT true,
  relocation_age INTEGER,
  relocation_sale_price NUMERIC,
  relocation_new_purchase_price NUMERIC,
  relocation_new_mortgage_amount NUMERIC,
  relocation_new_interest_rate NUMERIC,
  relocation_new_term_months INTEGER DEFAULT 360,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own properties"
ON public.properties
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own properties"
ON public.properties
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties"
ON public.properties
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties"
ON public.properties
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_properties_updated_at
BEFORE UPDATE ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();