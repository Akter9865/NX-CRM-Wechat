"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

export interface WhatsAppConnectionItem {
  id: string;
  connection_name: string;
  phone_number_id: string;
  display_phone_number?: string;
  business_name?: string;
  quality_rating?: string;
  status?: string;
  is_default?: boolean;
  registered?: boolean;
  registration_error?: string;
  last_webhook_at?: string;
}

export interface WhatsAppStatusState {
  connections: WhatsAppConnectionItem[];
  isConnected: boolean;
  isLoading: boolean;
  hasError: boolean;
  connectionCount: number;
  primaryConnection: WhatsAppConnectionItem | null;
  refetch: () => Promise<void>;
}

export const WHATSAPP_STATUS_CHANGED_EVENT = "wacrm:whatsapp-connections-changed";

export function dispatchWhatsAppStatusChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WHATSAPP_STATUS_CHANGED_EVENT));
  }
}

export function useWhatsAppStatus(): WhatsAppStatusState {
  const { user } = useAuth();
  const [connections, setConnections] = useState<WhatsAppConnectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConnections = useCallback(async () => {
    if (!user) {
      setConnections([]);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/whatsapp/connections");
      if (!res.ok) {
        if (res.status === 401) {
          setConnections([]);
          return;
        }
        throw new Error(`Failed to fetch connections (${res.status})`);
      }
      const data = await res.json();
      setConnections(data.connections || []);
    } catch {
      // Graceful fallback on network error
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchConnections();

    const handleUpdate = () => {
      fetchConnections();
    };

    window.addEventListener(WHATSAPP_STATUS_CHANGED_EVENT, handleUpdate);
    window.addEventListener("focus", handleUpdate);

    return () => {
      window.removeEventListener(WHATSAPP_STATUS_CHANGED_EVENT, handleUpdate);
      window.removeEventListener("focus", handleUpdate);
    };
  }, [fetchConnections]);

  const isConnected = connections.length > 0 && connections.some((c) => c.status !== "error");
  const hasError = connections.some((c) => c.status === "error" || Boolean(c.registration_error));
  const primaryConnection = connections.find((c) => c.is_default) || connections[0] || null;

  return {
    connections,
    isConnected,
    isLoading,
    hasError,
    connectionCount: connections.length,
    primaryConnection,
    refetch: fetchConnections,
  };
}
