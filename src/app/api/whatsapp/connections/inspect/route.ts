import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyPhoneNumber } from '@/lib/whatsapp/meta-api';

async function resolveUserAndAccount(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id, account_role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.account_id) return null;

  return {
    user,
    accountId: profile.account_id as string,
    role: profile.account_role as string,
  };
}

/**
 * POST /api/whatsapp/connections/inspect
 *
 * Inspects a Meta Access Token and optional Phone Number ID before saving.
 * Auto-detects: App ID, Display Phone Number, Verified Business Name, Quality Rating, and WABA ID.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const auth = await resolveUserAndAccount(supabase);

    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const accessToken = String(body.accessToken || '').trim();
    const phoneNumberId = String(body.phoneNumberId || '').trim();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Permanent Access Token is required to inspect credentials.' },
        { status: 400 }
      );
    }

    // 1. Inspect Token via Meta Graph API debug_token
    let appId: string | null = null;
    let isValidToken = false;
    let tokenScopes: string[] = [];
    let detectedWabaId: string | null = null;

    try {
      const debugRes = await fetch(
        `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
      );
      if (debugRes.ok) {
        const debugData = await debugRes.json();
        if (debugData?.data) {
          isValidToken = Boolean(debugData.data.is_valid);
          if (debugData.data.app_id) {
            appId = String(debugData.data.app_id);
          }
          if (Array.isArray(debugData.data.scopes)) {
            tokenScopes = debugData.data.scopes;
          }
          if (Array.isArray(debugData.data.granular_scopes)) {
            const wabaScope = debugData.data.granular_scopes.find(
              (s: { scope?: string; target_ids?: string[] }) =>
                (s.scope === 'whatsapp_business_management' || s.scope === 'whatsapp_business_messaging') &&
                Array.isArray(s.target_ids) &&
                s.target_ids.length > 0
            );
            if (wabaScope && wabaScope.target_ids?.[0]) {
              detectedWabaId = String(wabaScope.target_ids[0]);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[inspect] Debug token error:', err);
    }

    // Fallback token check if debug_token restricted permissions
    if (!isValidToken) {
      try {
        const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}`);
        if (meRes.ok) {
          isValidToken = true;
        }
      } catch {}
    }

    // 2. If Phone Number ID provided, inspect phone details & auto-resolve WABA ID
    let phoneInfo = null;
    if (phoneNumberId) {
      try {
        const info = await verifyPhoneNumber({
          phoneNumberId,
          accessToken,
        });
        phoneInfo = {
          id: info.id,
          displayPhoneNumber: info.display_phone_number,
          verifiedName: info.verified_name || null,
          qualityRating: info.quality_rating || null,
          codeVerificationStatus: info.code_verification_status || null,
          wabaId: detectedWabaId || null,
        };
        // If phone verification succeeded, token is definitely valid
        isValidToken = true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown Meta API error';
        return NextResponse.json(
          {
            valid: false,
            error: `Meta rejected Phone Number ID (${phoneNumberId}): ${msg}. Verify the Phone Number ID in Meta WhatsApp > API Setup.`,
          },
          { status: 400 }
        );
      }
    }

    if (!isValidToken && !phoneInfo) {
      return NextResponse.json(
        {
          valid: false,
          error:
            'Access token rejected by Meta Graph API. Please ensure you generated a valid Permanent System User Token with whatsapp_business_messaging and whatsapp_business_management permissions.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      valid: true,
      appId,
      wabaId: detectedWabaId,
      tokenScopes,
      phoneInfo,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal inspection error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
