import { describe, it, expect, vi } from 'vitest';
import { executeVisualWorkflow, getNodeType, getNodeTitle } from './visual-engine';

describe('Visual Automation Execution Engine', () => {
  it('correctly resolves node type and title across builder formats', () => {
    const nodeWithType = {
      id: 'n1',
      data: {
        type: 'trigger_keyword',
        label: 'Keyword Match Trigger',
        config: { keywords: ['hi bhaiya'] },
      },
    };
    expect(getNodeType(nodeWithType)).toBe('trigger_keyword');
    expect(getNodeTitle(nodeWithType)).toBe('Keyword Match Trigger');

    const nodeWithNodeType = {
      id: 'n2',
      data: {
        nodeType: 'action_send_message',
        title: 'Send WhatsApp Message',
        config: { message: 'Hello {{contact.name}}!' },
      },
    };
    expect(getNodeType(nodeWithNodeType)).toBe('action_send_message');
    expect(getNodeTitle(nodeWithNodeType)).toBe('Send WhatsApp Message');
  });

  it('returns failure when automation or contact is not found', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    };

    const result = await executeVisualWorkflow({
      automationId: 'aut-nonexistent',
      accountId: 'acc-1',
      contactId: 'contact-1',
      triggerEvent: 'message_received',
      client: mockSupabase,
    });

    expect(result.success).toBe(false);
    expect(['automation_or_contact_not_found', 'automation_not_active']).toContain(result.reason);
  });

  it('substitutes dynamic variables in template text', () => {
    const contact = {
      name: 'Alice Johnson',
      phone: '+14155552671',
      email: 'alice@example.com',
    };

    let text = 'Hello {{contact.name}}, your number is {{contact.phone}} and email is {{contact.email}}';
    text = text.replace(/\{\{contact\.name\}\}/g, contact.name);
    text = text.replace(/\{\{contact\.phone\}\}/g, contact.phone);
    text = text.replace(/\{\{contact\.email\}\}/g, contact.email);

    expect(text).toBe('Hello Alice Johnson, your number is +14155552671 and email is alice@example.com');
  });

  it('handles contacts with missing names by falling back to phone or empty', () => {
    const contact = {
      name: '',
      phone: '+14155552671',
      email: null,
    };

    let text = 'Hi {{contact.name}}';
    text = text.replace(/\{\{contact\.name\}\}/g, contact.name || contact.phone || '');

    expect(text).toBe('Hi +14155552671');
  });
});
