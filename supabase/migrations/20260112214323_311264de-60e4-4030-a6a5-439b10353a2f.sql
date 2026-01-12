-- Add market_sentiment column to store T10YIE (current market expectations)
ALTER TABLE public.rate_assumptions 
ADD COLUMN IF NOT EXISTS market_sentiment NUMERIC DEFAULT NULL;

-- Add comment explaining the dual-data model
COMMENT ON COLUMN public.rate_assumptions.historical_avg IS 'Historical average from CPIAUCSL (CPI-U 1994-2024 ~2.54%)';
COMMENT ON COLUMN public.rate_assumptions.market_sentiment IS 'Current market expectation from T10YIE (10-year break-even inflation rate)';