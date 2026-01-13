-- Add Cost of Living multiplier to state_tax_rules
ALTER TABLE public.state_tax_rules
ADD COLUMN IF NOT EXISTS col_multiplier NUMERIC DEFAULT 1.0;

-- Update COL multipliers based on 2026 data (1.0 = national average)
-- Lower cost states
UPDATE public.state_tax_rules SET col_multiplier = 0.87 WHERE state_code = 'MS';
UPDATE public.state_tax_rules SET col_multiplier = 0.88 WHERE state_code = 'OK';
UPDATE public.state_tax_rules SET col_multiplier = 0.88 WHERE state_code = 'KS';
UPDATE public.state_tax_rules SET col_multiplier = 0.89 WHERE state_code = 'AL';
UPDATE public.state_tax_rules SET col_multiplier = 0.89 WHERE state_code = 'AR';
UPDATE public.state_tax_rules SET col_multiplier = 0.90 WHERE state_code = 'WV';
UPDATE public.state_tax_rules SET col_multiplier = 0.90 WHERE state_code = 'MO';
UPDATE public.state_tax_rules SET col_multiplier = 0.90 WHERE state_code = 'IN';
UPDATE public.state_tax_rules SET col_multiplier = 0.91 WHERE state_code = 'TN';
UPDATE public.state_tax_rules SET col_multiplier = 0.91 WHERE state_code = 'KY';
UPDATE public.state_tax_rules SET col_multiplier = 0.91 WHERE state_code = 'IA';
UPDATE public.state_tax_rules SET col_multiplier = 0.92 WHERE state_code = 'NE';
UPDATE public.state_tax_rules SET col_multiplier = 0.92 WHERE state_code = 'OH';
UPDATE public.state_tax_rules SET col_multiplier = 0.92 WHERE state_code = 'GA';
UPDATE public.state_tax_rules SET col_multiplier = 0.93 WHERE state_code = 'MI';
UPDATE public.state_tax_rules SET col_multiplier = 0.93 WHERE state_code = 'LA';
UPDATE public.state_tax_rules SET col_multiplier = 0.93 WHERE state_code = 'SD';
UPDATE public.state_tax_rules SET col_multiplier = 0.93 WHERE state_code = 'ND';
UPDATE public.state_tax_rules SET col_multiplier = 0.94 WHERE state_code = 'WI';
UPDATE public.state_tax_rules SET col_multiplier = 0.94 WHERE state_code = 'NC';
UPDATE public.state_tax_rules SET col_multiplier = 0.94 WHERE state_code = 'SC';
UPDATE public.state_tax_rules SET col_multiplier = 0.95 WHERE state_code = 'TX';
UPDATE public.state_tax_rules SET col_multiplier = 0.95 WHERE state_code = 'WY';
UPDATE public.state_tax_rules SET col_multiplier = 0.96 WHERE state_code = 'ID';
UPDATE public.state_tax_rules SET col_multiplier = 0.96 WHERE state_code = 'NM';
UPDATE public.state_tax_rules SET col_multiplier = 0.97 WHERE state_code = 'MT';
UPDATE public.state_tax_rules SET col_multiplier = 0.98 WHERE state_code = 'FL';
UPDATE public.state_tax_rules SET col_multiplier = 0.98 WHERE state_code = 'AZ';
UPDATE public.state_tax_rules SET col_multiplier = 0.99 WHERE state_code = 'PA';
UPDATE public.state_tax_rules SET col_multiplier = 0.99 WHERE state_code = 'IL';
UPDATE public.state_tax_rules SET col_multiplier = 0.99 WHERE state_code = 'MN';
UPDATE public.state_tax_rules SET col_multiplier = 1.00 WHERE state_code = 'VA';
UPDATE public.state_tax_rules SET col_multiplier = 1.00 WHERE state_code = 'DE';
UPDATE public.state_tax_rules SET col_multiplier = 1.01 WHERE state_code = 'UT';
UPDATE public.state_tax_rules SET col_multiplier = 1.02 WHERE state_code = 'NV';
UPDATE public.state_tax_rules SET col_multiplier = 1.03 WHERE state_code = 'CO';
UPDATE public.state_tax_rules SET col_multiplier = 1.03 WHERE state_code = 'RI';
UPDATE public.state_tax_rules SET col_multiplier = 1.04 WHERE state_code = 'NH';
UPDATE public.state_tax_rules SET col_multiplier = 1.05 WHERE state_code = 'VT';
UPDATE public.state_tax_rules SET col_multiplier = 1.06 WHERE state_code = 'ME';
UPDATE public.state_tax_rules SET col_multiplier = 1.08 WHERE state_code = 'AK';
UPDATE public.state_tax_rules SET col_multiplier = 1.10 WHERE state_code = 'WA';
UPDATE public.state_tax_rules SET col_multiplier = 1.12 WHERE state_code = 'OR';
UPDATE public.state_tax_rules SET col_multiplier = 1.15 WHERE state_code = 'MD';
UPDATE public.state_tax_rules SET col_multiplier = 1.18 WHERE state_code = 'CT';
UPDATE public.state_tax_rules SET col_multiplier = 1.22 WHERE state_code = 'NJ';
UPDATE public.state_tax_rules SET col_multiplier = 1.27 WHERE state_code = 'MA';
UPDATE public.state_tax_rules SET col_multiplier = 1.30 WHERE state_code = 'DC';
UPDATE public.state_tax_rules SET col_multiplier = 1.35 WHERE state_code = 'NY';
UPDATE public.state_tax_rules SET col_multiplier = 1.42 WHERE state_code = 'CA';
UPDATE public.state_tax_rules SET col_multiplier = 1.70 WHERE state_code = 'HI';