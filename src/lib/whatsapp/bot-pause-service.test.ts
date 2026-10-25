import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAccountBotPauseStatus,
  setAccountBotPauseStatus,
  setConnectionBotPauseStatus,
  isAccountBotPausedSync,
} from './bot-pause-service';
import { supabaseAdmin } from '@/lib/automations/admin-client';

// Mock supabaseAdmin
vi.mock('@/lib/automations/admin-client', () => ({
  supabaseAdmin: vi.fn(),
}));

describe('Bot Pause Service & Master Toggle', () => {
  let mockAccountsTable: Map<string, any>;
  let mockConfigsTable: Array<any>;
  let mockConversationsTable: Array<any>;

  beforeEach(() => {
    mockAccountsTable = new Map();
    mockConfigsTable = [];
    mockConversationsTable = [];

    (supabaseAdmin as any).mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'accounts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((col: string, val: string) => ({
              maybeSingle: vi.fn().mockImplementation(async () => {
                const acct = mockAccountsTable.get(val);
                return { data: acct || null, error: null };
              }),
            })),
            update: vi.fn((payload: any) => ({
              eq: vi.fn(async (col: string, val: string) => {
                const current = mockAccountsTable.get(val) || { id: val };
                mockAccountsTable.set(val, { ...current, ...payload });
                return { error: null };
              }),
            })),
          };
        }

        if (table === 'whatsapp_config') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn((col: string, val: any) => ({
              eq: vi.fn((c2: string, v2: any) => ({
                order: vi.fn().mockImplementation(async () => {
                  const configs = mockConfigsTable.filter(
                    (c) => c.account_id === val && !c.is_archived
                  );
                  return { data: configs, error: null };
                }),
              })),
            })),
            update: vi.fn((payload: any) => ({
              eq: vi.fn((col: string, val: string) => {
                // Could be updating by account_id or id
                return {
                  eq: vi.fn(async (col2: string, val2: string) => {
                    mockConfigsTable.forEach((c) => {
                      if (c.id === val && c.account_id === val2) {
                        Object.assign(c, payload);
                      }
                    });
                    return { error: null };
                  }),
                  then: (resolve: any) => {
                    mockConfigsTable.forEach((c) => {
                      if (c.account_id === val) {
                        Object.assign(c, payload);
                      }
                    });
                    return resolve({ error: null });
                  },
                };
              }),
            })),
          };
        }

        if (table === 'conversations') {
          return {
            update: vi.fn((payload: any) => ({
              eq: vi.fn(async (col: string, val: string) => {
                mockConversationsTable.forEach((cv) => {
                  if (cv.account_id === val) {
                    Object.assign(cv, payload);
                  }
                });
                return { error: null };
              }),
            })),
          };
        }

        return {};
      },
    }));
  });

  it('preserves manual OFF state when 0 WhatsApp numbers are connected and does not auto-revert', async () => {
    const accountId = 'test-acct-zero-conns';
    mockAccountsTable.set(accountId, { id: accountId, is_automations_paused: false });
    mockConfigsTable = []; // ZERO connections

    // 1. Initially, bot is active
    let status = await getAccountBotPauseStatus(accountId);
    expect(status.isGlobalPaused).toBe(false);
    expect(status.activeConfigs.length).toBe(0);

    // 2. User manually toggles master bot OFF (Human Mode)
    await setAccountBotPauseStatus(accountId, true);

    // 3. Status recheck immediately simulates GET /api/bot-reply or 15s interval polling
    status = await getAccountBotPauseStatus(accountId);

    // CRITICAL: Must be paused (isGlobalPaused = true), so global_bot_active is false!
    expect(status.isGlobalPaused).toBe(true);
    expect(status.accountBotPaused).toBe(true);
    expect(isAccountBotPausedSync(accountId)).toBe(true);

    // 4. Repeated polling must stay OFF and NEVER auto-revert to ON
    const poll1 = await getAccountBotPauseStatus(accountId);
    const poll2 = await getAccountBotPauseStatus(accountId);
    expect(poll1.isGlobalPaused).toBe(true);
    expect(poll2.isGlobalPaused).toBe(true);

    // 5. User manually toggles master bot back ON
    await setAccountBotPauseStatus(accountId, false);

    const resumedStatus = await getAccountBotPauseStatus(accountId);
    expect(resumedStatus.isGlobalPaused).toBe(false);
    expect(resumedStatus.accountBotPaused).toBe(false);
    expect(isAccountBotPausedSync(accountId)).toBe(false);
  });

  it('pauses all connected channels when master toggle is turned OFF and resumes them on ON', async () => {
    const accountId = 'test-acct-multi-conns';
    mockAccountsTable.set(accountId, { id: accountId, is_automations_paused: false });
    mockConfigsTable = [
      {
        id: 'cfg-1',
        account_id: accountId,
        is_archived: false,
        is_default: true,
        is_automations_paused: false,
        phone_number_id: '1111',
      },
      {
        id: 'cfg-2',
        account_id: accountId,
        is_archived: false,
        is_default: false,
        is_automations_paused: false,
        phone_number_id: '2222',
      },
    ];

    // Master switch turned OFF
    await setAccountBotPauseStatus(accountId, true);

    const paused = await getAccountBotPauseStatus(accountId);
    expect(paused.isGlobalPaused).toBe(true);
    expect(mockConfigsTable.every((c) => c.is_automations_paused)).toBe(true);

    // Master switch turned ON
    await setAccountBotPauseStatus(accountId, false);

    const active = await getAccountBotPauseStatus(accountId);
    expect(active.isGlobalPaused).toBe(false);
    expect(mockConfigsTable.every((c) => !c.is_automations_paused)).toBe(true);
  });

  it('resumes chats when unpauseAllChats option is provided', async () => {
    const accountId = 'test-acct-unpause-chats';
    mockAccountsTable.set(accountId, { id: accountId, is_automations_paused: true });
    mockConversationsTable = [
      { id: 'conv-1', account_id: accountId, ai_autoreply_disabled: true },
      { id: 'conv-2', account_id: accountId, ai_autoreply_disabled: true },
    ];

    await setAccountBotPauseStatus(accountId, false, { unpauseAllChats: true });

    expect(mockConversationsTable.every((cv) => !cv.ai_autoreply_disabled)).toBe(true);
  });
});
