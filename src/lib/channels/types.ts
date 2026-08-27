export type ChannelType =
  | 'whatsapp_cloud'
  | 'whatsapp_web'
  | 'telegram'
  | 'wechat'
  | 'custom';

export type ChannelStatus =
  | 'connected'
  | 'connecting'
  | 'disconnected'
  | 'error'
  | 'pairing';

export interface ChannelConnection {
  id: string;
  account_id: string;
  user_id: string;
  channel_type: ChannelType;
  connection_name: string;
  identifier?: string | null; // e.g. Phone number (+91...), Telegram @handle
  status: ChannelStatus;
  is_default?: boolean;
  is_archived?: boolean;
  credentials?: Record<string, any>;
  metadata?: {
    platform?: string;
    battery?: number;
    pushname?: string;
    bot_id?: number | string;
    bot_username?: string;
    bot_name?: string;
    phone_number_id?: string;
    waba_id?: string;
    display_phone_number?: string;
    webhook_url?: string;
    qr_code?: string;
    qr_expires_at?: string;
    [key: string]: any;
  };
  last_activity_at?: string | null;
  last_error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export interface QRSessionState {
  sessionId: string;
  channelType: ChannelType;
  qrCodeDataUrl: string;
  rawQrCode: string;
  status: ChannelStatus;
  expiresAt: number;
  pairedPhoneNumber?: string;
  pushName?: string;
}

export interface SendChannelMessageParams {
  conversationId?: string;
  contactId?: string;
  channelConnectionId?: string;
  channelType?: ChannelType;
  messageType: 'text' | 'image' | 'video' | 'document' | 'audio' | 'interactive' | 'template';
  contentText?: string;
  mediaUrl?: string;
  filename?: string;
  replyToMessageId?: string;
  interactivePayload?: any;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
  templateMessageParams?: any;
}
