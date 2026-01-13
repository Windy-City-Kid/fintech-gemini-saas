-- Create incoming_events table for idempotency and replay protection
CREATE TABLE public.incoming_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_code TEXT,
  provider TEXT NOT NULL DEFAULT 'plaid',
  payload JSONB NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dead_letter_queue table for failed webhook retries
CREATE TABLE public.dead_letter_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'plaid',
  payload JSONB NOT NULL,
  error_message TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  last_attempted_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create index for fast event_id lookup (idempotency check)
CREATE INDEX idx_incoming_events_event_id ON public.incoming_events(event_id);
CREATE INDEX idx_incoming_events_status ON public.incoming_events(status);
CREATE INDEX idx_incoming_events_received_at ON public.incoming_events(received_at);

-- Create index for dead letter queue retry processing
CREATE INDEX idx_dead_letter_queue_next_retry ON public.dead_letter_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX idx_dead_letter_queue_status ON public.dead_letter_queue(status);

-- Create webhook_processing_logs for audit trail
CREATE TABLE public.webhook_processing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_logs_event_id ON public.webhook_processing_logs(event_id);

-- RLS is disabled for these tables as they're only accessed via service role in edge functions
-- The edge functions handle all security verification

-- Enable RLS but only for admin access
ALTER TABLE public.incoming_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_processing_logs ENABLE ROW LEVEL SECURITY;

-- No public access policies - these tables are internal system tables
-- Only service role (edge functions) can access them