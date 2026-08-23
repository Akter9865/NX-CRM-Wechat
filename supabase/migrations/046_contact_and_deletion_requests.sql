-- Migration 046: Contact Inquiries and Data Deletion Requests
-- Stores incoming customer inquiries and account/data deletion requests with auditing.

CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  category TEXT NOT NULL DEFAULT 'sales', -- 'sales' | 'support' | 'billing' | 'technical'
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- 'new' | 'in_review' | 'resolved'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  workspace_name TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'completed' | 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/public insert with rate-limited server endpoints
CREATE POLICY "Allow public insert to contact_inquiries"
  ON public.contact_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public insert to data_deletion_requests"
  ON public.data_deletion_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON public.contact_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON public.contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_email ON public.data_deletion_requests(email);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_code ON public.data_deletion_requests(request_code);
