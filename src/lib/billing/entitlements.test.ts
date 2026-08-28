/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
  PLANS,
} from './plans';
import {
  getCurrentBillingPeriod,
  getAccountEntitlement,
  checkCanAddContact,
  checkCanSendMessage,
  checkCanAddConnection,
  checkCanCreateAutomation,
  checkCanDeleteContacts,
  trackOutboundMessage,
} from './entitlements';

describe('Subscription Plans Configuration', () => {
  it('defines Free, Pro, Business, and Enterprise plans with accurate limits', () => {
    expect(PLANS.free.price).toBe(0);
    expect(PLANS.free.contactLimit).toBe(10);
    expect(PLANS.free.monthlyMessageLimit).toBe(200);
    expect(PLANS.free.whatsappConnectionLimit).toBe(1);

    expect(PLANS.pro.price).toBe(499);
    expect(PLANS.pro.contactLimit).toBe(700);
    expect(PLANS.pro.monthlyMessageLimit).toBeNull(); // Unlimited
    expect(PLANS.pro.whatsappConnectionLimit).toBe(1);

    expect(PLANS.business.price).toBe(3000);
    expect(PLANS.business.contactLimit).toBe(7000);
    expect(PLANS.business.monthlyMessageLimit).toBeNull(); // Unlimited
    expect(PLANS.business.whatsappConnectionLimit).toBe(5);

    expect(PLANS.enterprise.price).toBe(8999);
    expect(PLANS.enterprise.contactLimit).toBeNull(); // Unlimited
    expect(PLANS.enterprise.monthlyMessageLimit).toBeNull(); // Unlimited
    expect(PLANS.enterprise.whatsappConnectionLimit).toBeNull(); // Unlimited
  });
});

describe('Entitlements Evaluation and Limits Logic', () => {
  it('returns valid billing period in yyyy-MM format', () => {
    const period = getCurrentBillingPeriod();
    expect(period).toMatch(/^\d{4}-\d{2}$/);
  });

  describe('checkCanAddContact', () => {
    it('allows adding contact within plan limit', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'pro', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'contacts') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ count: 50, data: [] }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          };
        },
      };

      const result = await checkCanAddContact('account-123', 1, mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(50);
      expect(result.limit).toBe(700);
    });

    it('rejects adding contact exceeding plan limit', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'free', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'contacts') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ count: 10, data: [] }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          };
        },
      };

      const result = await checkCanAddContact('account-123', 1, mockSupabase);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Contact limit reached');
    });

    it('allows unlimited contacts on enterprise plan', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'enterprise', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'contacts') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ count: 50000, data: [] }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
            }),
          };
        },
      };

      const result = await checkCanAddContact('account-123', 100, mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
    });
  });

  describe('checkCanSendMessage', () => {
    it('blocks sending when free monthly limit is reached', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'free', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'usage_records') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { messages_sent: 200 } }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const result = await checkCanSendMessage('account-123', 1, mockSupabase);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Monthly message limit reached');
    });

    it('allows sending when under limit', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'free', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'usage_records') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { messages_sent: 150 } }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const result = await checkCanSendMessage('account-123', 10, mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.currentSent).toBe(150);
    });

    it('allows unlimited messages on pro plan', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'pro', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'usage_records') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { messages_sent: 10000 } }),
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const result = await checkCanSendMessage('account-123', 500, mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
    });
  });

  describe('checkCanAddConnection', () => {
    it('blocks connection if plan limit is reached', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'free', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'whatsapp_config') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ count: 1, data: [] }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const result = await checkCanAddConnection('account-123', mockSupabase);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('WhatsApp connection limit reached');
    });

    it('allows connection if under limit', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'business', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'whatsapp_config') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ count: 2, data: [] }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const result = await checkCanAddConnection('account-123', mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(5);
    });
  });

  describe('checkCanCreateAutomation', () => {
    it('allows up to 3 automations on free plan', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'free', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'automations') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ count: 2, data: [] }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const result = await checkCanCreateAutomation('account-123', mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(2);
      expect(result.limit).toBe(3);
    });

    it('blocks fourth automation on free plan', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'free', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'automations') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ count: 3, data: [] }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const result = await checkCanCreateAutomation('account-123', mockSupabase);
      expect(result.allowed).toBe(false);
      expect(result.message).toContain('Automation limit reached');
    });

    it('allows unlimited automations on pro plan', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { plan_id: 'pro', status: 'active' } }),
                }),
              }),
            };
          }
          if (table === 'automations') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ count: 15, data: [] }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const result = await checkCanCreateAutomation('account-123', mockSupabase);
      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
    });
  });

  describe('getAccountEntitlement summary', () => {
    it('aggregates all limits and usage accurately', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      plan_id: 'pro',
                      status: 'active',
                      current_period_end: new Date(Date.now() + 86400000).toISOString(),
                    },
                  }),
                }),
              }),
            };
          }
          if (table === 'contacts') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ count: 120, data: [] }),
              }),
            };
          }
          if (table === 'usage_records') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { messages_sent: 450 } }),
                  }),
                }),
              }),
            };
          }
          if (table === 'whatsapp_config') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ count: 1, data: [] }),
                }),
              }),
            };
          }
          if (table === 'automations') {
            return {
              select: () => ({
                eq: () => Promise.resolve({ count: 5, data: [] }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const summary = await getAccountEntitlement('account-123', mockSupabase);
      expect(summary.planId).toBe('pro');
      expect(summary.contacts.current).toBe(120);
      expect(summary.contacts.limit).toBe(700);
      expect(summary.contacts.isOverLimit).toBe(false);
      expect(summary.messages.currentMonthSent).toBe(450);
      expect(summary.messages.limit).toBeNull();
      expect(summary.connections.current).toBe(1);
      expect(summary.connections.limit).toBe(1);
      expect(summary.automations.current).toBe(5);
      expect(summary.automations.limit).toBeNull();
    });
  });

  describe('Locked state restrictions', () => {
    it('blocks actions when subscription is expired beyond grace period', async () => {
      const mockSupabase = {
        from: (table: string) => {
          if (table === 'subscriptions') {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      plan_id: 'pro',
                      status: 'expired',
                      current_period_end: new Date(Date.now() - 86400000 * 5).toISOString(),
                    },
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => Promise.resolve({ count: 0, data: [] }),
            }),
          };
        },
      };

      const contactRes = await checkCanAddContact('account-locked', 1, mockSupabase);
      expect(contactRes.allowed).toBe(false);
      expect(contactRes.locked).toBe(true);

      const msgRes = await checkCanSendMessage('account-locked', 1, mockSupabase);
      expect(msgRes.allowed).toBe(false);
      expect(msgRes.locked).toBe(true);

      const connRes = await checkCanAddConnection('account-locked', mockSupabase);
      expect(connRes.allowed).toBe(false);
      expect(connRes.locked).toBe(true);

      const autoRes = await checkCanCreateAutomation('account-locked', mockSupabase);
      expect(autoRes.allowed).toBe(false);
      expect(autoRes.locked).toBe(true);

      const delRes = await checkCanDeleteContacts('account-locked', mockSupabase);
      expect(delRes.allowed).toBe(false);
    });

    describe('checkCanDeleteContacts', () => {
      it('blocks contact deletion on Free and Pro plans', async () => {
        const freeSupabase = {
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { plan_id: 'free', status: 'active' } }),
              }),
            }),
          }),
        };

        const proSupabase = {
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { plan_id: 'pro', status: 'active' } }),
              }),
            }),
          }),
        };

        const freeRes = await checkCanDeleteContacts('account-free', freeSupabase);
        expect(freeRes.allowed).toBe(false);
        expect(freeRes.message).toContain('Contact deletion is only available on Business and Enterprise plans');

        const proRes = await checkCanDeleteContacts('account-pro', proSupabase);
        expect(proRes.allowed).toBe(false);
        expect(proRes.message).toContain('Contact deletion is only available on Business and Enterprise plans');
      });

      it('allows contact deletion on Business and Enterprise plans', async () => {
        const bizSupabase = {
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { plan_id: 'business', status: 'active' } }),
              }),
            }),
          }),
        };

        const entSupabase = {
          from: () => ({
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: { plan_id: 'enterprise', status: 'active' } }),
              }),
            }),
          }),
        };

        const bizRes = await checkCanDeleteContacts('account-biz', bizSupabase);
        expect(bizRes.allowed).toBe(true);
        expect(bizRes.planId).toBe('business');

        const entRes = await checkCanDeleteContacts('account-ent', entSupabase);
        expect(entRes.allowed).toBe(true);
        expect(entRes.planId).toBe('enterprise');
      });
    });
  });

  describe('trackOutboundMessage', () => {
    it('increments messages_sent on existing usage record', async () => {
      let updatedData: any = null;

      const mockSupabase = {
        from: (table: string) => {
          if (table === 'usage_records') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: { id: 'usage-1', messages_sent: 10 } }),
                  }),
                }),
              }),
              update: (data: any) => {
                updatedData = data;
                return {
                  eq: async () => ({ error: null }),
                };
              },
            };
          }
          return {};
        },
      };

      await trackOutboundMessage('account-123', 5, mockSupabase);
      expect(updatedData).not.toBeNull();
      expect(updatedData.messages_sent).toBe(15);
    });
  });
});
