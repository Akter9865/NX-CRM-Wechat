/**
 * ============================================================
 * Central Outbound Messaging Eligibility & Compliance Guard
 *
 * Implements a unified, server-side gatekeeper used across ALL
 * outbound WhatsApp messaging paths:
 *   1. Manual Inbox sends (/api/whatsapp/send)
 *   2. Public API sends (/api/v1/messages)
 *   3. Broadcast campaigns (/api/whatsapp/broadcast and /resume)
 *   4. Flow engine nodes (lib/flows/meta-send.ts)
 *   5. Automation engine actions (lib/automations/meta-send.ts)
 *   6. AI Auto-replies (lib/ai/auto-reply.ts)
 *   7. Multi-channel dispatcher (lib/channels/channel-manager.ts)
 *
 * Prevents outbound sends when accounts are banned, restricted,
 * disconnected, paused, when contacts have opted out, when the
 * 24h customer window is expired, or when messages violate Meta
 * policies.
 * ============================================================
 */

import { checkContentCompliance, type ComplianceCheckResult } from '@/lib/whatsapp/compliance-guard';
import type { MessageTemplate } from '@/types';
import { differenceInHours } from 'date-fns';

export class OutboundEligibilityError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = 'OutboundEligibilityError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface OutboundEligibilityContext {
  /** The WhatsApp config / connection record */
  config: {
    id: string;
    account_id: string;
    phone_number_id: string;
    status?: string | null;
    is_automations_paused?: boolean | null;
    is_archived?: boolean | null;
    display_phone_number?: string | null;
  } | null;

  /** Recipient contact info */
  contact?: {
    id?: string;
    phone?: string;
    is_opted_out?: boolean | null;
  } | null;

  /** Message characteristics */
  messageType: 'text' | 'template' | 'interactive' | 'image' | 'video' | 'document' | 'audio' | string;
  text?: string | null;
  templateRow?: MessageTemplate | null;
  
  /** Whether the send is automated (broadcast, flow, automation, AI) or manual agent send */
  isAutomated?: boolean;

  /** Timestamp of the last inbound message from the customer (for 24h window check) */
  lastCustomerMessageAt?: string | Date | null;
}

export interface OutboundEligibilityResult {
  eligible: boolean;
  compliance: ComplianceCheckResult;
  config: NonNullable<OutboundEligibilityContext['config']>;
}

/**
 * Asserts that the requested outbound message is fully eligible to send.
 * Throws OutboundEligibilityError if ineligible.
 */
export function assertOutboundEligibility(
  context: OutboundEligibilityContext
): OutboundEligibilityResult {
  const { config, contact, messageType, text, templateRow, isAutomated, lastCustomerMessageAt } = context;

  // 1. Connection presence & non-archived state
  if (!config || config.is_archived) {
    throw new OutboundEligibilityError(
      'whatsapp_not_configured',
      'No active WhatsApp connection found. Please connect your WhatsApp Business number in Settings → WhatsApp.',
      400
    );
  }

  const rawStatus = String(config.status || '').toLowerCase().trim();

  // 2. Confirmed Banned / Disabled
  if (rawStatus === 'banned') {
    throw new OutboundEligibilityError(
      'account_banned',
      'This WhatsApp Business number is BANNED by Meta. All outbound messages are halted to protect your account. Visit Meta Business Suite to appeal.',
      403,
      { phone_number_id: config.phone_number_id, status: 'banned' }
    );
  }

  // 3. Restricted Account
  if (rawStatus === 'restricted') {
    // Meta restricted accounts cannot send marketing campaigns or automated broadcasts
    if (isAutomated || messageType === 'template') {
      throw new OutboundEligibilityError(
        'account_restricted',
        'This WhatsApp Business number is RESTRICTED by Meta. Automated campaigns and broadcasts are blocked until the restriction is lifted.',
        403,
        { phone_number_id: config.phone_number_id, status: 'restricted' }
      );
    }
  }

  // 4. Disconnected / Error / Unknown
  if (rawStatus === 'disconnected') {
    throw new OutboundEligibilityError(
      'account_disconnected',
      'This WhatsApp Business number is disconnected. Please re-register or verify your credentials in Settings → WhatsApp.',
      400,
      { phone_number_id: config.phone_number_id, status: 'disconnected' }
    );
  }

  if (rawStatus === 'error') {
    throw new OutboundEligibilityError(
      'account_error',
      'WhatsApp connection has an authentication or configuration error. Please test or re-connect in Settings → WhatsApp.',
      400,
      { phone_number_id: config.phone_number_id, status: 'error' }
    );
  }

  if (rawStatus === 'pending_verification') {
    throw new OutboundEligibilityError(
      'pending_verification',
      'WhatsApp connection is still pending verification with Meta. Please complete verification before sending.',
      400,
      { phone_number_id: config.phone_number_id, status: 'pending_verification' }
    );
  }

  // 5. Automation Pause Enforcement (Master Switch or Connection-level Pause)
  if (isAutomated && Boolean(config.is_automations_paused)) {
    throw new OutboundEligibilityError(
      'automations_paused',
      'Automations and automated replies are currently paused for this WhatsApp connection.',
      403,
      { phone_number_id: config.phone_number_id, is_automations_paused: true }
    );
  }

  // 6. Recipient Opt-Out Enforcement
  if (contact?.is_opted_out) {
    throw new OutboundEligibilityError(
      'contact_opted_out',
      'This contact has opted out of receiving messages (STOP). Sending is blocked to comply with Meta messaging policy.',
      400,
      { contact_id: contact.id, is_opted_out: true }
    );
  }

  // 7. 24-Hour Customer Care Window Enforcement
  // Meta policy: Free-form messages (text, media, interactive) can ONLY be sent within
  // 24 hours of the customer's last message. Outside that window, only APPROVED templates can be sent.
  if (messageType !== 'template' && lastCustomerMessageAt) {
    const lastDate = typeof lastCustomerMessageAt === 'string' ? new Date(lastCustomerMessageAt) : lastCustomerMessageAt;
    if (!isNaN(lastDate.getTime())) {
      const hoursSince = differenceInHours(new Date(), lastDate);
      if (hoursSince >= 24) {
        throw new OutboundEligibilityError(
          'window_expired',
          'The 24-hour customer service window has expired. Meta policy requires an approved Message Template to initiate a conversation outside 24 hours.',
          400,
          { hours_since: hoursSince, threshold_hours: 24 }
        );
      }
    }
  }

  // 8. Template Status Validation
  if (messageType === 'template' && templateRow) {
    const tplStatus = String(templateRow.status || '').toUpperCase();
    if (tplStatus && tplStatus !== 'APPROVED') {
      throw new OutboundEligibilityError(
        'template_not_approved',
        `Template "${templateRow.name}" cannot be sent because its Meta status is "${tplStatus}". Only APPROVED templates can be delivered.`,
        400,
        { template_name: templateRow.name, template_status: tplStatus }
      );
    }
  }

  // 9. Central Compliance Guard
  const compliance = checkContentCompliance(text);
  if (!compliance.compliant && compliance.riskLevel === 'critical') {
    throw new OutboundEligibilityError(
      'policy_violation_risk',
      `Sending blocked by Meta Compliance Guard: ${compliance.reasons.join('; ')}. Sending this will result in immediate Meta API account ban.`,
      400,
      { violations: compliance.violations, risk_level: compliance.riskLevel }
    );
  }

  return {
    eligible: true,
    compliance,
    config,
  };
}
