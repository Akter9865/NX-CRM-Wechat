-- Migration 048: Contact Inquiries and Payment Gateway Settings
-- Author: Antigravity AI
-- Date: 2026-08-22

-- 1. Contact Inquiries Table
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  category TEXT DEFAULT 'sales',
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'responded', 'closed'
  ip_address TEXT,
  user_agent TEXT,
  admin_notes TEXT,
  responded_at TIMESTAMPTZ,
  responded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy queries
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON public.contact_inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON public.contact_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON public.contact_inquiries(status);

-- Enable RLS
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow public insertion (for website visitors)
DROP POLICY IF EXISTS "Allow public insert to contact_inquiries" ON public.contact_inquiries;
CREATE POLICY "Allow public insert to contact_inquiries"
  ON public.contact_inquiries FOR INSERT
  WITH CHECK (true);

-- Allow service role full access
DROP POLICY IF EXISTS "Allow service role full access on contact_inquiries" ON public.contact_inquiries;
CREATE POLICY "Allow service role full access on contact_inquiries"
  ON public.contact_inquiries FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 2. Ensure initial Payment Gateway Settings in system_settings
INSERT INTO public.system_settings (key, value)
VALUES
  ('payment_gateway', '{
    "active_gateway": "razorpay",
    "mode": "test",
    "currency": "INR",
    "razorpay_key_id": "",
    "razorpay_key_secret": "",
    "razorpay_webhook_secret": "",
    "upi_id": "8653678794@upi",
    "upi_business_name": "NX CRM / Nexora Spark Agency",
    "manual_qr_enabled": true,
    "auto_activate_on_payment": true
  }'::jsonb)
ON CONFLICT (key) DO NOTHING;
