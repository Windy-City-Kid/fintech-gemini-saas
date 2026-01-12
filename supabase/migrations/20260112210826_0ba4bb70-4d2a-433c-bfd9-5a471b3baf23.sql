-- Create rate_assumptions table for storing economic rate assumptions
CREATE TABLE public.rate_assumptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL, -- 'General', 'Medical', 'Social Security', etc.
  name TEXT NOT NULL, -- 'Inflation', 'Healthcare Costs', 'COLA', etc.
  description TEXT,
  historical_avg NUMERIC NOT NULL DEFAULT 0,
  user_optimistic NUMERIC NOT NULL DEFAULT 0,
  user_pessimistic NUMERIC NOT NULL DEFAULT 0,
  last_updated_from_api TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, name)
);

-- Enable RLS
ALTER TABLE public.rate_assumptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own rate assumptions"
ON public.rate_assumptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate assumptions"
ON public.rate_assumptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate assumptions"
ON public.rate_assumptions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rate assumptions"
ON public.rate_assumptions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_rate_assumptions_updated_at
BEFORE UPDATE ON public.rate_assumptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default assumptions for new users via function
CREATE OR REPLACE FUNCTION public.create_default_rate_assumptions()
RETURNS TRIGGER AS $$
BEGIN
  -- General Inflation
  INSERT INTO public.rate_assumptions (user_id, category, name, description, historical_avg, user_optimistic, user_pessimistic)
  VALUES (NEW.id, 'General', 'Inflation', 'General price level increase based on CPI', 2.5, 2.0, 4.0);
  
  -- Medical Inflation
  INSERT INTO public.rate_assumptions (user_id, category, name, description, historical_avg, user_optimistic, user_pessimistic)
  VALUES (NEW.id, 'Medical', 'Healthcare Costs', 'Annual increase in healthcare expenses', 5.5, 4.0, 7.0);
  
  -- Social Security COLA
  INSERT INTO public.rate_assumptions (user_id, category, name, description, historical_avg, user_optimistic, user_pessimistic)
  VALUES (NEW.id, 'Social Security', 'COLA Adjustment', 'Cost of Living Adjustment for Social Security benefits', 2.6, 2.0, 3.5);
  
  -- Investment Returns - Stocks
  INSERT INTO public.rate_assumptions (user_id, category, name, description, historical_avg, user_optimistic, user_pessimistic)
  VALUES (NEW.id, 'Investment', 'Stock Returns', 'Expected annual return on equity investments', 7.0, 8.0, 5.0);
  
  -- Investment Returns - Bonds
  INSERT INTO public.rate_assumptions (user_id, category, name, description, historical_avg, user_optimistic, user_pessimistic)
  VALUES (NEW.id, 'Investment', 'Bond Returns', 'Expected annual return on fixed income investments', 4.0, 5.0, 2.5);
  
  -- Housing Costs
  INSERT INTO public.rate_assumptions (user_id, category, name, description, historical_avg, user_optimistic, user_pessimistic)
  VALUES (NEW.id, 'Housing', 'Housing Inflation', 'Annual increase in housing-related costs', 3.5, 2.5, 5.0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Attach trigger to auth.users on signup
CREATE TRIGGER on_auth_user_created_rate_assumptions
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_default_rate_assumptions();