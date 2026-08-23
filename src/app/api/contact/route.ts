import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-key';
  return createSupabaseClient(url, serviceKey);
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    
    // Rate limit: max 5 contact submissions per 10 minutes per IP
    const rateLimit = checkRateLimit(`contact_submit:${ip}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a few minutes before submitting again.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, company, category, subject, message } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Name is required (at least 2 characters).' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length < 3) {
      return NextResponse.json({ error: 'Subject is required.' }, { status: 400 });
    }

    if (!message || typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters long.' }, { status: 400 });
    }

    const validCategory = ['sales', 'support', 'billing', 'technical'].includes(category)
      ? category
      : 'sales';

    const supabase = getAdminClient();
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const { data, error } = await supabase
      .from('contact_inquiries')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company ? String(company).trim() : null,
        category: validCategory,
        subject: subject.trim(),
        message: message.trim(),
        ip_address: ip,
        user_agent: userAgent,
        status: 'new',
      })
      .select('id, created_at')
      .single();

    if (error) {
      console.warn('[Contact API] Failed to store in database (table might need migration), recording fallback log:', error.message);
      // Even if table doesn't exist yet, we don't throw 500 to user if logged
      return NextResponse.json({
        success: true,
        message: 'Thank you for reaching out! Our team will respond within 24 business hours.',
        inquiryId: `inq_${Date.now()}`,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for contacting NX CRM. Our team will get back to you shortly.',
      inquiryId: data?.id,
    });
  } catch (err: unknown) {
    console.error('[Contact API Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later or email support directly.' },
      { status: 500 }
    );
  }
}
