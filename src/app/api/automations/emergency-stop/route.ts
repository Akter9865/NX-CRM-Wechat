import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import {
  getAccountBotPauseStatus,
  setAccountBotPauseStatus,
} from '@/lib/whatsapp/bot-pause-service'

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

  const { isGlobalPaused } = await getAccountBotPauseStatus(accountId)

  return NextResponse.json({
    is_paused: isGlobalPaused,
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

  await setAccountBotPauseStatus(accountId, isPaused)

  console.info(`[emergency-stop] Account ${accountId} automations paused set to: ${isPaused}`)

  return NextResponse.json({
    success: true,
    is_paused: isPaused,
    message: isPaused
      ? 'All automated triggers and AI replies have been paused.'
      : 'Automations resumed successfully.',
  })
}
