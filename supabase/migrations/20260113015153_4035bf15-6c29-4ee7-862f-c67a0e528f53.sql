-- Create state_tax_rules table for all 50 states + DC
CREATE TABLE public.state_tax_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state_code TEXT NOT NULL UNIQUE,
  state_name TEXT NOT NULL,
  base_rate NUMERIC NOT NULL DEFAULT 0,
  rate_type TEXT NOT NULL DEFAULT 'flat', -- 'flat', 'graduated', 'none'
  social_security_taxable BOOLEAN NOT NULL DEFAULT false,
  retirement_exclusion_amount NUMERIC DEFAULT 0,
  pension_exclusion_type TEXT DEFAULT 'none', -- 'none', 'federal', 'state', 'private', 'all'
  retirement_friendliness TEXT DEFAULT 'neutral', -- 'excellent', 'good', 'neutral', 'poor'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.state_tax_rules ENABLE ROW LEVEL SECURITY;

-- Public read access (reference data)
CREATE POLICY "State tax rules are publicly readable"
ON public.state_tax_rules
FOR SELECT
USING (true);

-- Create index for lookups
CREATE INDEX idx_state_tax_rules_code ON public.state_tax_rules(state_code);

-- Insert all 50 states + DC with tax data
-- No income tax states (excellent retirement friendliness)
INSERT INTO public.state_tax_rules (state_code, state_name, base_rate, rate_type, social_security_taxable, retirement_exclusion_amount, pension_exclusion_type, retirement_friendliness, notes) VALUES
('AK', 'Alaska', 0, 'none', false, 0, 'all', 'excellent', 'No state income tax'),
('FL', 'Florida', 0, 'none', false, 0, 'all', 'excellent', 'No state income tax'),
('NV', 'Nevada', 0, 'none', false, 0, 'all', 'excellent', 'No state income tax'),
('SD', 'South Dakota', 0, 'none', false, 0, 'all', 'excellent', 'No state income tax'),
('TN', 'Tennessee', 0, 'none', false, 0, 'all', 'excellent', 'No state income tax'),
('TX', 'Texas', 0, 'none', false, 0, 'all', 'excellent', 'No state income tax'),
('WA', 'Washington', 0, 'none', false, 0, 'all', 'excellent', 'No state income tax'),
('WY', 'Wyoming', 0, 'none', false, 0, 'all', 'excellent', 'No state income tax'),
('NH', 'New Hampshire', 0, 'none', false, 0, 'all', 'excellent', 'No tax on earned income'),

-- States with SS exemption and good retirement benefits
('AL', 'Alabama', 5.0, 'graduated', false, 0, 'federal', 'good', 'Federal pensions exempt'),
('AZ', 'Arizona', 2.5, 'flat', false, 2500, 'all', 'good', '$2,500 pension exclusion'),
('AR', 'Arkansas', 4.4, 'graduated', false, 6000, 'all', 'neutral', '$6,000 retirement exclusion'),
('CO', 'Colorado', 4.4, 'flat', false, 24000, 'all', 'good', 'Age 65+ exclusion up to $24k'),
('DE', 'Delaware', 6.6, 'graduated', false, 12500, 'all', 'good', '$12,500 pension exclusion age 60+'),
('GA', 'Georgia', 5.19, 'flat', false, 65000, 'all', 'good', '$65k exclusion age 65+ (2026 rate)'),
('HI', 'Hawaii', 11.0, 'graduated', false, 0, 'none', 'poor', 'High rates, limited exclusions'),
('ID', 'Idaho', 5.8, 'flat', false, 0, 'none', 'neutral', 'SS exempt but pensions taxed'),
('IL', 'Illinois', 4.95, 'flat', false, 0, 'all', 'excellent', 'All retirement income exempt'),
('IN', 'Indiana', 2.95, 'flat', false, 0, 'none', 'good', 'Low flat rate (2026 rate)'),
('IA', 'Iowa', 5.7, 'graduated', false, 6000, 'all', 'neutral', 'Phasing out income tax'),
('KS', 'Kansas', 5.7, 'graduated', false, 0, 'none', 'poor', 'SS taxed above threshold'),
('KY', 'Kentucky', 3.5, 'flat', false, 31110, 'all', 'good', '$31,110 exclusion (2026 rate)'),
('LA', 'Louisiana', 4.25, 'graduated', false, 6000, 'federal', 'good', 'Federal pensions exempt'),
('ME', 'Maine', 7.15, 'graduated', false, 25000, 'all', 'neutral', 'Pension income deduction'),
('MD', 'Maryland', 5.75, 'graduated', false, 34300, 'all', 'good', 'Generous pension exclusion'),
('MA', 'Massachusetts', 5.0, 'flat', false, 0, 'none', 'neutral', 'SS exempt, pensions taxed'),
('MI', 'Michigan', 4.25, 'flat', false, 0, 'all', 'good', 'Public pensions exempt'),
('MN', 'Minnesota', 9.85, 'graduated', true, 0, 'none', 'poor', 'Taxes SS and retirement'),
('MS', 'Mississippi', 5.0, 'graduated', false, 0, 'all', 'excellent', 'All retirement income exempt'),
('MO', 'Missouri', 4.8, 'graduated', false, 6000, 'federal', 'good', 'Public pension exemption'),
('MT', 'Montana', 6.75, 'graduated', true, 4640, 'all', 'poor', 'Taxes SS, limited exclusion'),
('NE', 'Nebraska', 6.64, 'graduated', false, 0, 'none', 'neutral', 'SS exempt, pensions taxed'),
('NJ', 'New Jersey', 10.75, 'graduated', false, 100000, 'all', 'good', 'Large exclusion age 62+'),
('NM', 'New Mexico', 5.9, 'graduated', false, 8000, 'all', 'neutral', 'Age 65+ exemption'),
('NY', 'New York', 10.9, 'graduated', false, 20000, 'all', 'neutral', '$20k pension exclusion'),
('NC', 'North Carolina', 4.5, 'flat', false, 0, 'none', 'neutral', 'SS exempt, Bailey Settlement'),
('ND', 'North Dakota', 2.5, 'graduated', false, 0, 'none', 'good', 'Low rates'),
('OH', 'Ohio', 3.5, 'graduated', false, 0, 'none', 'neutral', 'SS exempt, credit available'),
('OK', 'Oklahoma', 4.75, 'graduated', false, 10000, 'all', 'good', '$10k exclusion'),
('OR', 'Oregon', 9.9, 'graduated', false, 0, 'federal', 'neutral', 'Federal pension credit'),
('PA', 'Pennsylvania', 3.07, 'flat', false, 0, 'all', 'excellent', 'All retirement income exempt'),
('RI', 'Rhode Island', 5.99, 'graduated', false, 20000, 'all', 'neutral', 'Modified AGI threshold'),
('SC', 'South Carolina', 6.4, 'graduated', false, 10000, 'all', 'good', 'Generous deduction age 65+'),
('UT', 'Utah', 4.65, 'flat', true, 0, 'none', 'poor', 'Taxes SS, retirement credit'),
('VT', 'Vermont', 8.75, 'graduated', true, 0, 'none', 'poor', 'High rates, taxes SS'),
('VA', 'Virginia', 5.75, 'graduated', false, 12000, 'all', 'neutral', 'Age deduction available'),
('WV', 'West Virginia', 5.12, 'graduated', false, 8000, 'all', 'neutral', 'Phasing out SS tax'),
('WI', 'Wisconsin', 7.65, 'graduated', false, 5000, 'all', 'neutral', 'Retirement subtraction'),
('DC', 'District of Columbia', 10.75, 'graduated', false, 3000, 'all', 'neutral', 'Limited exclusion'),
('CA', 'California', 13.3, 'graduated', false, 0, 'none', 'poor', 'Highest rates, no exclusions'),
('CT', 'Connecticut', 6.99, 'graduated', true, 0, 'none', 'poor', 'Taxes SS above threshold');

-- Add trigger for updated_at
CREATE TRIGGER update_state_tax_rules_updated_at
BEFORE UPDATE ON public.state_tax_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Also add relocation_state column to properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS relocation_state TEXT DEFAULT NULL;