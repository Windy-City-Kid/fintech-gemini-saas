-- Create security_audit_logs table for user-facing security activity tracking
CREATE TABLE public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('login', 'logout', 'password_reset', 'password_change', 'email_change', 'mfa_enabled', 'mfa_disabled', 'account_created')),
  ip_masked TEXT, -- Last 4 digits masked for privacy: e.g., "192.168.1.***"
  user_agent TEXT,
  metadata JSONB, -- Additional event context
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own security logs
CREATE POLICY "Users can view own security logs"
ON public.security_audit_logs FOR SELECT
USING (auth.uid() = user_id);

-- Users cannot insert/update/delete their own logs directly
-- Logs are inserted via database function or application logic only
-- This prevents users from tampering with their audit trail

-- Create index for efficient queries
CREATE INDEX idx_security_audit_logs_user_created ON public.security_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);

-- Create function to mask IP address (last octet)
CREATE OR REPLACE FUNCTION public.mask_ip_address(ip_address INET)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  IF ip_address IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Extract last octet and mask it
  RETURN regexp_replace(ip_address::text, '\.([0-9]+)$', '.***');
END;
$$;

-- Create function to log security events (can be called from application)
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Validate event type
  IF p_event_type NOT IN ('login', 'logout', 'password_reset', 'password_change', 'email_change', 'mfa_enabled', 'mfa_disabled', 'account_created') THEN
    RAISE EXCEPTION 'Invalid event_type: %', p_event_type;
  END IF;
  
  -- Insert security log entry
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    ip_masked,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    p_event_type,
    public.mask_ip_address(p_ip_address),
    p_user_agent,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.log_security_event TO authenticated;

-- Create database trigger to automatically log SIGNED_IN events
-- Note: This triggers on auth.users table changes, but we need to handle auth events
-- The application will call log_security_event for login/logout events

COMMENT ON TABLE public.security_audit_logs IS 'User-facing security activity audit log. Tracks authentication events for transparency.';
COMMENT ON COLUMN public.security_audit_logs.ip_masked IS 'IP address with last octet masked for privacy (e.g., 192.168.1.***)';
COMMENT ON FUNCTION public.log_security_event IS 'SECURITY DEFINER function to insert security audit log entries. Called by application on auth events.';
