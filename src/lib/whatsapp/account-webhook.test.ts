import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleAccountWebhookChange, isAccountWebhookField } from './account-webhook';

describe('account-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('identifies account webhook fields correctly', () => {
    expect(isAccountWebhookField('phone_number_quality_update')).toBe(true);
    expect(isAccountWebhookField('account_update')).toBe(true);
    expect(isAccountWebhookField('account_review_update')).toBe(true);
    expect(isAccountWebhookField('messages')).toBe(false);
  });

  it('updates whatsapp_config status to banned on BANNED quality update event', async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'cfg-1', status: 'connected', is_automations_paused: false }],
        error: null,
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'whatsapp_config') {
          return {
            select: selectMock,
            update: updateMock,
          };
        }
        return {};
      }),
    } as unknown as Parameters<typeof handleAccountWebhookChange>[1];

    await handleAccountWebhookChange(
      {
        field: 'phone_number_quality_update',
        value: {
          phone_number_id: '123456789',
          event: 'BANNED',
          display_phone_number: '+3197058028810',
        },
      },
      mockSupabase
    );

    expect(updateMock).toHaveBeenCalled();
    const updatePayload = updateMock.mock.calls[0][0];
    expect(updatePayload.status).toBe('banned');
    expect(updatePayload.is_automations_paused).toBe(true);
    expect(updatePayload.last_error_message).toContain('banned');
  });

  it('updates whatsapp_config status to banned on account_update DISABLED event', async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const selectMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [{ id: 'cfg-2', status: 'connected', is_automations_paused: false }],
        error: null,
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'whatsapp_config') {
          return {
            select: selectMock,
            update: updateMock,
          };
        }
        return {};
      }),
    } as unknown as Parameters<typeof handleAccountWebhookChange>[1];

    await handleAccountWebhookChange(
      {
        field: 'account_update',
        value: {
          phone_number_id: '123456789',
          event: 'DISABLED',
          ban_info: {
            waba_ban_state: 'DISABLE',
          },
        },
      },
      mockSupabase
    );

    expect(updateMock).toHaveBeenCalled();
    const updatePayload = updateMock.mock.calls[0][0];
    expect(updatePayload.status).toBe('banned');
    expect(updatePayload.is_automations_paused).toBe(true);
  });
});
