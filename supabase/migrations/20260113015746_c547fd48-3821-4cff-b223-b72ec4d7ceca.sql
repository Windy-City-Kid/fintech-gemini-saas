-- Drop and recreate view with SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.state_tax_lookup;

CREATE VIEW public.state_tax_lookup 
WITH (security_invoker = true)
AS
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