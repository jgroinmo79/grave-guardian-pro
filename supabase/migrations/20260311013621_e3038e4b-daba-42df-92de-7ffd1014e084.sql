
-- Add share_token to service_logs for shareable report links
ALTER TABLE public.service_logs ADD COLUMN share_token text UNIQUE;

-- Add client_visible flag to photo_records (privacy: only explicitly flagged photos visible to clients/shared reports)
ALTER TABLE public.photo_records ADD COLUMN client_visible boolean NOT NULL DEFAULT false;

-- Create index for fast token lookups
CREATE INDEX idx_service_logs_share_token ON public.service_logs (share_token) WHERE share_token IS NOT NULL;

-- Allow anonymous SELECT on service_logs by share_token (for public report page)
CREATE POLICY "Public can view by share_token"
ON public.service_logs
FOR SELECT
TO anon
USING (share_token IS NOT NULL);
