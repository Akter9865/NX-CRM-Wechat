import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { supabaseAdmin } from '@/lib/automations/admin-client'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .single()
  const accountId = profile?.account_id
  if (!accountId) {
    return NextResponse.json({ error: 'No account linked' }, { status: 403 })
  }

  const { data: config } = await supabaseAdmin()
    .from('whatsapp_config')
    .select('is_automations_paused')
    .eq('account_id', accountId)
    .eq('is_archived', false)
    .order('is_default', { ascending: false })
    .limit(1)
    .maybeSingle()

  return NextResponse.json({
    is_paused: Boolean(config?.is_automations_paused),
  })
}

export async function POST(request: Request) {
  try {
    await requireRole('admin')
  } catch (err) {
    return toErrorResponse(err)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_id')
    .eq('user_id', user.id)
    .single()
  const accountId = profile?.account_id
  if (!accountId) {
    return NextResponse.json({ error: 'No account linked' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const isPaused = Boolean(body.paused)

  // Update all active whatsapp_config rows for this account
  const { error } = await supabaseAdmin()
    .from('whatsapp_config')
    .update({ is_automations_paused: isPaused })
    .eq('account_id', accountId)

  if (error) {
    console.error('[emergency-stop] error updating whatsapp_config:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.info(`[emergency-stop] Account ${accountId} automations paused set to: ${isPaused}`)

  return NextResponse.json({
    success: true,
    is_paused: isPaused,
    message: isPaused
      ? 'All automated triggers and AI replies have been paused.'
      : 'Automations resumed successfully.',
  })
}
