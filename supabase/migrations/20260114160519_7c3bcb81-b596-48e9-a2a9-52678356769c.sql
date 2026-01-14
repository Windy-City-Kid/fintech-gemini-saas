-- Create bucket_settings table for Three-Bucket Architecture
CREATE TABLE public.bucket_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Bucket 1: Cash/Immediate (1-3 years)
  bucket1_target_years INTEGER NOT NULL DEFAULT 2,
  bucket1_current_value NUMERIC NOT NULL DEFAULT 0,
  
  -- Bucket 2: Bonds/Medium (4-10 years)
  bucket2_target_years INTEGER NOT NULL DEFAULT 5,
  bucket2_current_value NUMERIC NOT NULL DEFAULT 0,
  
  -- Bucket 3: Growth/Long (11+ years)
  bucket3_target_years INTEGER NOT NULL DEFAULT 15,
  bucket3_current_value NUMERIC NOT NULL DEFAULT 0,
  
  -- Refill logic settings
  refill_enabled BOOLEAN NOT NULL DEFAULT true,
  refill_threshold_percentage NUMERIC NOT NULL DEFAULT 80, -- Trigger refill when bucket1 < 80% of target
  
  -- Market conditions (updated periodically or manually)
  bucket3_ytd_return NUMERIC NOT NULL DEFAULT 0,
  bucket2_ytd_return NUMERIC NOT NULL DEFAULT 0,
  
  -- Last refill action
  last_refill_date DATE,
  last_refill_amount NUMERIC DEFAULT 0,
  last_refill_source TEXT, -- 'bucket3', 'bucket2', 'none'
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bucket_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own bucket settings"
  ON public.bucket_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bucket settings"
  ON public.bucket_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bucket settings"
  ON public.bucket_settings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bucket settings"
  ON public.bucket_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create refill_history table to track refill transactions
CREATE TABLE public.refill_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  refill_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Source bucket
  source_bucket TEXT NOT NULL, -- 'bucket3', 'bucket2'
  source_return_at_refill NUMERIC NOT NULL DEFAULT 0,
  
  -- Amount moved
  amount NUMERIC NOT NULL DEFAULT 0,
  
  -- Refill condition that triggered this
  condition_triggered TEXT NOT NULL, -- 'A', 'B', 'C' (C = suspended)
  
  -- New bucket1 balance after refill
  bucket1_balance_after NUMERIC NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refill_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own refill history"
  ON public.refill_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own refill history"
  ON public.refill_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_bucket_settings_updated_at
  BEFORE UPDATE ON public.bucket_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();