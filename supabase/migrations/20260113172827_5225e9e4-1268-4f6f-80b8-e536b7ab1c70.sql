-- Add is_baseline column to scenarios table for marking baseline scenario
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT false;

-- Create index for faster baseline lookup
CREATE INDEX IF NOT EXISTS idx_scenarios_is_baseline ON public.scenarios(user_id, is_baseline) WHERE is_baseline = true;

-- Add total_lifetime_taxes column for comparison tracking
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS total_lifetime_taxes NUMERIC DEFAULT 0;

-- Add cached_success_rate for comparison without re-running simulations
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS cached_success_rate NUMERIC;

-- Add cached_estate_value for comparison
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS cached_estate_value NUMERIC;

-- Add forecast_mode column for optimistic/average/pessimistic toggle
ALTER TABLE public.scenarios 
ADD COLUMN IF NOT EXISTS forecast_mode TEXT DEFAULT 'average' 
CHECK (forecast_mode IN ('optimistic', 'average', 'pessimistic'));