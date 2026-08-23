import { NextResponse } from 'next/server';
import { getDynamicPlans } from '@/lib/billing/dynamic-plans';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const plans = await getDynamicPlans();
    return NextResponse.json({ success: true, plans });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch plans';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
