-- Add Social Security strategy fields to scenarios table
ALTER TABLE public.scenarios
ADD COLUMN IF NOT EXISTS primary_pia numeric DEFAULT 2000,
ADD COLUMN IF NOT EXISTS spouse_pia numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS primary_claiming_age integer DEFAULT 67,
ADD COLUMN IF NOT EXISTS spouse_claiming_age integer DEFAULT 67,
ADD COLUMN IF NOT EXISTS primary_fra integer DEFAULT 67,
ADD COLUMN IF NOT EXISTS spouse_fra integer DEFAULT 67,
ADD COLUMN IF NOT EXISTS is_married boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS spouse_current_age integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS spouse_life_expectancy integer DEFAULT 90,
ADD COLUMN IF NOT EXISTS primary_life_expectancy integer DEFAULT 90;

-- Add comments for documentation
COMMENT ON COLUMN public.scenarios.primary_pia IS 'Primary Insurance Amount (monthly benefit at FRA)';
COMMENT ON COLUMN public.scenarios.spouse_pia IS 'Spouse PIA for survivor benefit calculation';
COMMENT ON COLUMN public.scenarios.primary_claiming_age IS 'Age when primary claimant starts SS (62-70)';
COMMENT ON COLUMN public.scenarios.spouse_claiming_age IS 'Age when spouse starts SS (62-70)';
COMMENT ON COLUMN public.scenarios.primary_fra IS 'Full Retirement Age for primary (66-67)';
COMMENT ON COLUMN public.scenarios.spouse_fra IS 'Full Retirement Age for spouse (66-67)';
COMMENT ON COLUMN public.scenarios.is_married IS 'Whether survivor benefit logic applies';
COMMENT ON COLUMN public.scenarios.spouse_current_age IS 'Current age of spouse for simulation';
COMMENT ON COLUMN public.scenarios.primary_life_expectancy IS 'Expected lifespan for breakeven analysis';