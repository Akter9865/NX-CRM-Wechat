import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NX CRM — WhatsApp Cloud API Platform',
    short_name: 'NX CRM',
    description: 'Unified WhatsApp CRM, Visual Flows & AI Auto-Reply Platform for Modern Teams',
    start_url: '/dashboard',
    display: 'standalone',
    // Window-controls-overlay on desktop installs, standalone elsewhere.
    display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
    background_color: '#f6f8f7',
    theme_color: '#128C7E',
    orientation: 'any',
    id: '/',
    scope: '/',
    lang: 'en',
    dir: 'ltr',
    categories: ['business', 'productivity', 'social'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Team Inbox',
        short_name: 'Inbox',
        url: '/inbox',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
        description: 'View and reply to incoming WhatsApp conversations',
      },
      {
        name: 'Chatbot Flows',
        short_name: 'Flows',
        url: '/flows',
        description: 'Build and manage automated WhatsApp chatbot flows',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
      },
      {
        name: 'Contacts',
        short_name: 'Contacts',
        url: '/contacts',
        icons: [{ src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' }],
        description: 'Browse contacts and lead pipelines',
      },
    ],
  }
}
