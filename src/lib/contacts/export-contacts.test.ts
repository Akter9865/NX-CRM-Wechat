import { describe, it, expect } from 'vitest';
import { formatContactsForExport } from './export-contacts';
import type { ContactWithTagsExport } from './export-contacts';

describe('formatContactsForExport', () => {
  it('formats contacts with tags correctly', () => {
    const mockContacts: ContactWithTagsExport[] = [
      {
        id: 'c1',
        user_id: 'u1',
        account_id: 'acc_1',
        phone: '+14155552671',
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Inc',
        created_at: '2026-08-17T10:00:00Z',
        updated_at: '2026-08-17T12:00:00Z',
        tags: [
          { id: 't1', user_id: 'u1', name: 'VIP', color: '#10b981', created_at: '' },
          { id: 't2', user_id: 'u1', name: 'Customer', color: '#3b82f6', created_at: '' },
        ],
      },
      {
        id: 'c2',
        user_id: 'u1',
        account_id: 'acc_1',
        phone: '+447911123456',
        name: '',
        email: undefined as unknown as string,
        company: undefined as unknown as string,
        created_at: '2026-08-17T11:00:00Z',
        updated_at: '2026-08-17T11:00:00Z',
        tags: [],
      },
    ];

    const result = formatContactsForExport(mockContacts);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      Name: 'John Doe',
      Phone: '+14155552671',
      Email: 'john@example.com',
      Company: 'Acme Inc',
      Tags: 'VIP, Customer',
      'Created At': expect.any(String),
      'Updated At': expect.any(String),
    });

    expect(result[1]).toEqual({
      Name: '',
      Phone: '+447911123456',
      Email: '',
      Company: '',
      Tags: '',
      'Created At': expect.any(String),
      'Updated At': expect.any(String),
    });
  });
});
