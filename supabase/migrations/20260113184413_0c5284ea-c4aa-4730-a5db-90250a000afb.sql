-- Create income_sources table for hierarchical income data
CREATE TABLE public.income_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Hierarchical category fields
  category TEXT NOT NULL DEFAULT 'work', -- work, social_security, pension, annuity, passive, windfall, rmd
  subcategory TEXT, -- full_time, part_time, consulting, rental, dividend, etc.
  
  -- Basic info
  name TEXT NOT NULL DEFAULT 'Untitled Income',
  description TEXT,
  
  -- Amount fields
  amount NUMERIC NOT NULL DEFAULT 0, -- Monthly or annual based on frequency
  frequency TEXT NOT NULL DEFAULT 'annual', -- monthly, annual, one_time
  
  -- Date fields with month/year precision
  start_month INTEGER CHECK (start_month >= 1 AND start_month <= 12),
  start_year INTEGER NOT NULL,
  end_month INTEGER CHECK (end_month >= 1 AND end_month <= 12),
  end_year INTEGER,
  
  -- Milestone sync options
  start_milestone TEXT, -- 'retirement', 'age_62', 'age_65', 'custom'
  end_milestone TEXT, -- 'retirement', 'death', 'custom'
  
  -- Social Security specific fields
  pia_amount NUMERIC, -- Primary Insurance Amount
  claiming_age INTEGER,
  fra INTEGER DEFAULT 67, -- Full Retirement Age
  
  -- Pension specific fields
  pension_type TEXT, -- 'monthly', 'lump_sum', 'cash_balance'
  cola_rate NUMERIC, -- Annual COLA for pensions
  survivor_percentage NUMERIC, -- Survivor benefit percentage
  
  -- Annuity specific fields
  annuity_type TEXT, -- 'fixed', 'variable', 'indexed'
  guaranteed_period_years INTEGER,
  
  -- Windfall specific fields
  windfall_type TEXT, -- 'inheritance', 'bonus', 'sale', 'other'
  expected_date DATE,
  probability_percentage NUMERIC DEFAULT 100,
  
  -- Inflation adjustment
  inflation_adjusted BOOLEAN NOT NULL DEFAULT false,
  custom_inflation_rate NUMERIC,
  
  -- Tax treatment
  is_taxable BOOLEAN NOT NULL DEFAULT true,
  tax_treatment TEXT DEFAULT 'ordinary', -- ordinary, capital_gains, tax_free
  
  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.income_sources ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own income sources"
ON public.income_sources FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own income sources"
ON public.income_sources FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income sources"
ON public.income_sources FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income sources"
ON public.income_sources FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_income_sources_user_category ON public.income_sources(user_id, category);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_income_sources_updated_at
BEFORE UPDATE ON public.income_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();