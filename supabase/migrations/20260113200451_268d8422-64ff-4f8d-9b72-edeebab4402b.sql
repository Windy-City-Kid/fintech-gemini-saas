-- Create beneficiaries table for estate planning
CREATE TABLE public.beneficiaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'child',
  allocation_percentage NUMERIC NOT NULL DEFAULT 0,
  receives_traditional_ira BOOLEAN DEFAULT false,
  estimated_marginal_rate NUMERIC DEFAULT 0.32,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.beneficiaries ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own beneficiaries" 
ON public.beneficiaries 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own beneficiaries" 
ON public.beneficiaries 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own beneficiaries" 
ON public.beneficiaries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own beneficiaries" 
ON public.beneficiaries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_beneficiaries_updated_at
BEFORE UPDATE ON public.beneficiaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create charitable_bequests table for estate planning
CREATE TABLE public.charitable_bequests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  is_percentage BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.charitable_bequests ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own charitable bequests" 
ON public.charitable_bequests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own charitable bequests" 
ON public.charitable_bequests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own charitable bequests" 
ON public.charitable_bequests 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own charitable bequests" 
ON public.charitable_bequests 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_charitable_bequests_updated_at
BEFORE UPDATE ON public.charitable_bequests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();