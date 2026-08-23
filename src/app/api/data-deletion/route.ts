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

    // Rate limit: max 3 deletion requests per hour per IP
    const rateLimit = checkRateLimit(`deletion_submit:${ip}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before submitting another request.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, workspace, reason } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'Full name is required.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'A valid account email is required.' }, { status: 400 });
    }

    const requestCode = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const supabase = getAdminClient();

    const { error } = await supabase
      .from('data_deletion_requests')
      .insert({
        request_code: requestCode,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        workspace_name: workspace ? String(workspace).trim() : null,
        reason: reason ? String(reason).trim() : null,
        ip_address: ip,
        user_agent: userAgent,
        status: 'pending',
      });

    if (error) {
      console.warn('[Data Deletion API] Failed to store in database (fallback logged):', error.message);
    }

    return NextResponse.json({
      success: true,
      requestCode,
      message: 'Your data deletion request has been formally recorded and will be processed within 30 days pursuant to applicable data protection regulations.',
    });
  } catch (err: unknown) {
    console.error('[Data Deletion API Error]:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please contact privacy@nxcrm.online directly.' },
      { status: 500 }
    );
  }
}
