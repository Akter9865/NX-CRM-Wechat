import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminSupabaseClient } from '@/lib/admin/admin-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdminSession('manage_ai');
    const supabase = getAdminSupabaseClient();

    const [
      { data: aiConfigs, error: cfgErr },
      { data: knowledgeItems },
      { data: accounts },
    ] = await Promise.all([
      supabase.from('ai_reply_configs').select('*'),
      supabase.from('ai_knowledge_items').select('id, account_id, title, created_at'),
      supabase.from('accounts').select('id, name'),
    ]);

    if (cfgErr) throw cfgErr;

    const accMap = new Map<string, string>();
    accounts?.forEach((a) => accMap.set(a.id, a.name));

    const enrichedConfigs = (aiConfigs || []).map((cfg) => {
      const clientName = accMap.get(cfg.account_id) || 'Unknown Client';
      const clientDocs = (knowledgeItems || []).filter((k) => k.account_id === cfg.account_id);

      return {
        id: cfg.id,
        accountId: cfg.account_id,
        clientName,
        provider: cfg.provider || 'gemini',
        model: cfg.model || 'gemini-1.5-flash',
        isEnabled: cfg.is_enabled,
        confidenceThreshold: cfg.confidence_threshold,
        docsCount: clientDocs.length,
        updatedAt: cfg.updated_at,
      };
    });

    const modelDistribution: Record<string, number> = {};
    enrichedConfigs.forEach((c) => {
      modelDistribution[c.provider] = (modelDistribution[c.provider] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      configs: enrichedConfigs,
      summary: {
        totalConfiguredClients: enrichedConfigs.length,
        activeAiClients: enrichedConfigs.filter((c) => c.isEnabled).length,
        totalKnowledgeDocs: knowledgeItems?.length || 0,
        modelDistribution,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch AI management stats';
    console.error('[Admin AI GET Error]:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
