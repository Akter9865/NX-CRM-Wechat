import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';
import { logAdminAction } from '@/lib/admin/audit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession('manage_settings');
    const supabase = getAdminSupabaseClient();

    const { data: settingsRows, error } = await supabase
      .from('system_settings')
      .select('*');

    if (error) throw error;

    const settingsMap: Record<string, unknown> = {};
    settingsRows?.forEach((row) => {
      settingsMap[row.key] = row.value;
    });

    return NextResponse.json({
      success: true,
      settings: {
        general: settingsMap.general || {
          platform_name: 'NX CRM',
          company_name: 'Nexora Spark Agency',
          support_email: 'nexorasparkagencyofficial@gmail.com',
          sales_email: 'nexorasparkagencyofficial@gmail.com',
          default_trial_days: 14,
          default_currency: 'INR',
          maintenance_mode: false,
        },
        billing: settingsMap.billing || {
          grace_period_days: 3,
          tax_percentage: 18,
          invoice_prefix: 'NX-INV',
          auto_suspend_expired: false,
        },
        whatsapp: settingsMap.whatsapp || {
          meta_api_version: 'v22.0',
          default_webhook_timeout_ms: 10000,
          max_connections_per_client_pro: 1,
          max_connections_per_client_business: 5,
        },
        meta_embedded_signup: settingsMap.meta_embedded_signup || {
          enabled: true,
          app_id: process.env.META_APP_ID || '',
          app_secret: process.env.META_APP_SECRET ? '••••••••' : '',
          config_id: '',
          system_user_token: '',
          waba_id: '',
          business_id: '',
        },
        auth_providers: settingsMap.auth_providers || {
          google_oauth_enabled: true,
          google_client_id: '',
          google_client_secret: '',
          open_signups_enabled: true,
          require_email_verification: false,
          default_trial_days: 14,
        },
        payment_gateway: settingsMap.payment_gateway || {
          active_gateway: 'razorpay',
          mode: 'test',
          currency: 'INR',
          razorpay_key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
          razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET ? '••••••••' : '',
          razorpay_webhook_secret: process.env.RAZORPAY_WEBHOOK_SECRET ? '••••••••' : '',
          upi_id: '8653678794@upi',
          upi_business_name: 'NX CRM / Nexora Spark Agency',
          manual_qr_enabled: true,
          auto_activate_on_payment: true,
        },
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch settings';
    console.error('[Admin Settings GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminSession = await requireAdminSession('manage_settings');
    const supabase = getAdminSupabaseClient();
    const body = await req.json();

    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('system_settings')
      .upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      .select('*')
      .single();

    if (error) throw error;

    await logAdminAction({
      adminEmail: adminSession.email,
      adminRole: adminSession.role,
      action: 'settings.update',
      targetType: 'system_setting',
      targetId: key,
      details: { key, value },
    });

    return NextResponse.json({ success: true, setting: data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update settings';
    console.error('[Admin Settings PATCH Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST action for testing Gateway Credentials or other administrative actions
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdminSession('manage_settings');
    const body = await req.json();
    const { action, keyId, keySecret } = body;

    if (action === 'test_payment_gateway') {
      const activeKeyId = keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      const activeSecret = keySecret || process.env.RAZORPAY_KEY_SECRET;

      if (!activeKeyId || !activeSecret) {
        return NextResponse.json({
          success: false,
          error: 'Razorpay Key ID and Key Secret must be provided or configured in environment.',
        }, { status: 400 });
      }

      // Test against Razorpay API
      const start = Date.now();
      const authHeader = 'Basic ' + Buffer.from(`${activeKeyId}:${activeSecret}`).toString('base64');
      const rzRes = await fetch('https://api.razorpay.com/v1/plans?count=1', {
        headers: { Authorization: authHeader },
      });
      const latencyMs = Date.now() - start;

      if (rzRes.ok) {
        return NextResponse.json({
          success: true,
          message: 'Razorpay Gateway Connection Successful!',
          latencyMs,
          status: 'verified',
        });
      } else {
        const errorData = await rzRes.json().catch(() => ({}));
        return NextResponse.json({
          success: false,
          error: errorData.error?.description || `Razorpay returned HTTP status ${rzRes.status}`,
          latencyMs,
          status: 'failed',
        }, { status: 400 });
      }
    }

    if (action === 'test_meta_credentials') {
      const { appId, appSecret, token } = body;
      const activeToken = token || process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

      if (!activeToken && (!appId || !appSecret)) {
        return NextResponse.json({
          success: false,
          error: 'Meta System User Access Token or App ID + Secret required.',
        }, { status: 400 });
      }

      const start = Date.now();
      const testUrl = activeToken
        ? `https://graph.facebook.com/v22.0/me?access_token=${encodeURIComponent(activeToken)}`
        : `https://graph.facebook.com/v22.0/${appId}?access_token=${appId}|${appSecret}`;

      const metaRes = await fetch(testUrl);
      const latencyMs = Date.now() - start;

      if (metaRes.ok) {
        const data = await metaRes.json();
        return NextResponse.json({
          success: true,
          message: `Meta Graph API v22.0 Connected! (ID: ${data.id || appId})`,
          latencyMs,
          status: 'verified',
        });
      } else {
        const errData = await metaRes.json().catch(() => ({}));
        return NextResponse.json({
          success: false,
          error: errData.error?.message || `Meta Graph API returned HTTP ${metaRes.status}`,
          latencyMs,
          status: 'failed',
        }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Action failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
