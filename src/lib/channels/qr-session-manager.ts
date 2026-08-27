import QRCode from 'qrcode';
import type { ChannelType, QRSessionState } from './types';

// In-memory active QR sessions store (keyed by connection_id or session_id)
const activeQrSessions = new Map<string, QRSessionState>();

export async function createOrRefreshQrSession(
  connectionId: string,
  channelType: ChannelType = 'whatsapp_web'
): Promise<QRSessionState> {
  const existing = activeQrSessions.get(connectionId);
  const now = Date.now();

  if (existing && existing.status === 'pairing' && existing.expiresAt > now) {
    return existing;
  }

  // Generate unique pairing secret string
  const randomSecret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const rawQrCode =
    channelType === 'whatsapp_web'
      ? `2@${randomSecret},${Buffer.from(connectionId).toString('base64')},${now}`
      : `tg://login?token=${randomSecret}&client_id=${connectionId}`;

  // Generate Base64 Data URL for the QR code
  const qrCodeDataUrl = await QRCode.toDataURL(rawQrCode, {
    width: 280,
    margin: 2,
    color: {
      dark: channelType === 'telegram' ? '#0088cc' : '#128C7E',
      light: '#ffffff',
    },
  });

  const session: QRSessionState = {
    sessionId: connectionId,
    channelType,
    qrCodeDataUrl,
    rawQrCode,
    status: 'pairing',
    expiresAt: now + 60 * 1000, // 60s validity
  };

  activeQrSessions.set(connectionId, session);
  return session;
}

export function getQrSession(connectionId: string): QRSessionState | null {
  const session = activeQrSessions.get(connectionId);
  if (!session) return null;

  if (session.status === 'pairing' && session.expiresAt <= Date.now()) {
    session.status = 'disconnected';
  }
  return session;
}

export function simulateQrScan(
  connectionId: string,
  phoneNumber: string = '+91 98765 43210',
  pushName: string = 'My WhatsApp Device'
): QRSessionState {
  const session: QRSessionState = {
    sessionId: connectionId,
    channelType: 'whatsapp_web',
    qrCodeDataUrl: '',
    rawQrCode: '',
    status: 'connected',
    expiresAt: Date.now() + 365 * 24 * 3600 * 1000,
    pairedPhoneNumber: phoneNumber,
    pushName,
  };

  activeQrSessions.set(connectionId, session);
  return session;
}

export function removeQrSession(connectionId: string) {
  activeQrSessions.delete(connectionId);
}
