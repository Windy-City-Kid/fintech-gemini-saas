-- Add healthcare preferences and expense priority columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS health_condition text DEFAULT 'good' CHECK (health_condition IN ('excellent', 'good', 'poor')),
ADD COLUMN IF NOT EXISTS medicare_choice text DEFAULT 'advantage' CHECK (medicare_choice IN ('advantage', 'medigap'));

-- Add priority and age range columns to money_flows table
ALTER TABLE public.money_flows 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'discretionary' CHECK (priority IN ('mandatory', 'discretionary'));