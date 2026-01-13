-- Add property_tax_rate column to state_tax_rules
ALTER TABLE public.state_tax_rules 
ADD COLUMN IF NOT EXISTS property_tax_rate numeric DEFAULT 1.0;

-- Update with 2026 effective property tax rates (as percentage of home value)
UPDATE public.state_tax_rules SET property_tax_rate = CASE state_code
  -- No income tax states (often higher property tax)
  WHEN 'TX' THEN 1.60  -- Texas - high property tax
  WHEN 'FL' THEN 0.80  -- Florida - moderate
  WHEN 'NV' THEN 0.53  -- Nevada - low
  WHEN 'WA' THEN 0.87  -- Washington
  WHEN 'WY' THEN 0.56  -- Wyoming
  WHEN 'SD' THEN 1.17  -- South Dakota
  WHEN 'AK' THEN 1.04  -- Alaska
  WHEN 'TN' THEN 0.64  -- Tennessee
  WHEN 'NH' THEN 1.93  -- New Hampshire - very high
  -- High income tax states (often lower property tax)
  WHEN 'CA' THEN 0.71  -- California
  WHEN 'NY' THEN 1.62  -- New York - high both
  WHEN 'NJ' THEN 2.21  -- New Jersey - highest
  WHEN 'CT' THEN 2.07  -- Connecticut
  WHEN 'MA' THEN 1.15  -- Massachusetts
  WHEN 'IL' THEN 2.08  -- Illinois - high
  WHEN 'VT' THEN 1.86  -- Vermont
  -- Moderate states
  WHEN 'AZ' THEN 0.60
  WHEN 'CO' THEN 0.49
  WHEN 'GA' THEN 0.87
  WHEN 'NC' THEN 0.77
  WHEN 'SC' THEN 0.55
  WHEN 'VA' THEN 0.80
  WHEN 'MD' THEN 1.04
  WHEN 'PA' THEN 1.49
  WHEN 'OH' THEN 1.53
  WHEN 'MI' THEN 1.38
  WHEN 'WI' THEN 1.61
  WHEN 'MN' THEN 1.05
  WHEN 'IA' THEN 1.43
  WHEN 'MO' THEN 0.91
  WHEN 'KS' THEN 1.33
  WHEN 'NE' THEN 1.61
  WHEN 'OK' THEN 0.87
  WHEN 'AR' THEN 0.61
  WHEN 'LA' THEN 0.56
  WHEN 'MS' THEN 0.75
  WHEN 'AL' THEN 0.39  -- Alabama - lowest
  WHEN 'KY' THEN 0.83
  WHEN 'IN' THEN 0.81
  WHEN 'WV' THEN 0.55
  WHEN 'UT' THEN 0.55
  WHEN 'NM' THEN 0.67
  WHEN 'ID' THEN 0.63
  WHEN 'MT' THEN 0.74
  WHEN 'ND' THEN 0.98
  WHEN 'OR' THEN 0.87
  WHEN 'HI' THEN 0.32  -- Hawaii - very low property tax
  WHEN 'ME' THEN 1.24
  WHEN 'RI' THEN 1.40
  WHEN 'DE' THEN 0.56
  WHEN 'DC' THEN 0.55
  ELSE 1.0  -- Default
END;