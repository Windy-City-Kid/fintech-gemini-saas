-- Allow service role to insert guardrail snapshots (for webhook processing)
CREATE POLICY "Service role can insert guardrail snapshots"
ON public.guardrail_snapshots
FOR INSERT
TO service_role
WITH CHECK (true);