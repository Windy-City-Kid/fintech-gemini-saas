-- Add new columns to match the requested schema
ALTER TABLE public.state_tax_rules
ADD COLUMN IF NOT EXISTS top_marginal_rate NUMERIC,
ADD COLUMN IF NOT EXISTS ss_exemption_threshold_joint NUMERIC DEFAULT NULL;

-- Copy base_rate to top_marginal_rate for consistency
UPDATE public.state_tax_rules SET top_marginal_rate = base_rate;

-- Update specific 2026 values per the new data
UPDATE public.state_tax_rules SET 
  top_marginal_rate = 2.95,
  base_rate = 2.95
WHERE state_code = 'IN';

UPDATE public.state_tax_rules SET 
  top_marginal_rate = 5.19,
  base_rate = 5.19
WHERE state_code = 'GA';

-- Minnesota: Taxes SS above $108,320 joint threshold
UPDATE public.state_tax_rules SET 
  top_marginal_rate = 9.85,
  ss_exemption_threshold_joint = 108320,
  social_security_taxable = TRUE
WHERE state_code = 'MN';

-- Utah: Credits SS below $90k, update rate to 4.55
UPDATE public.state_tax_rules SET 
  top_marginal_rate = 4.55,
  base_rate = 4.55,
  ss_exemption_threshold_joint = 90000,
  social_security_taxable = TRUE
WHERE state_code = 'UT';

-- West Virginia: SS now exempt in 2026, update rate to 4.82
UPDATE public.state_tax_rules SET 
  top_marginal_rate = 4.82,
  base_rate = 4.82,
  social_security_taxable = FALSE,
  notes = 'SS now fully exempt starting 2026'
WHERE state_code = 'WV';

-- Create a view that matches the requested schema format
CREATE OR REPLACE VIEW public.state_tax_lookup AS
SELECT 
  state_code,
  state_name,
  CASE rate_type 
    WHEN 'flat' THEN 'Flat'
    WHEN 'graduated' THEN 'Graduated'
    WHEN 'none' THEN 'None'
  END AS base_rate_type,
  COALESCE(top_marginal_rate, base_rate) AS top_marginal_rate,
  social_security_taxable AS ss_is_taxable,
  ss_exemption_threshold_joint,
  retirement_exclusion_amount AS retirement_income_exclusion
FROM public.state_tax_rules;