-- Add spouse and legacy goal fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS spouse_name TEXT,
ADD COLUMN IF NOT EXISTS spouse_dob DATE,
ADD COLUMN IF NOT EXISTS spouse_retirement_age INTEGER DEFAULT 65,
ADD COLUMN IF NOT EXISTS spouse_pia NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS legacy_goal_amount NUMERIC DEFAULT 0;