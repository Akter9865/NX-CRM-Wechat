import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NX CRM — WhatsApp Cloud API Platform',
    short_name: 'NX CRM',
    description: 'Unified WhatsApp CRM, Visual Flows & AI Auto-Reply Platform for Modern Teams',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#090d16',
    theme_color: '#10b981',
    orientation: 'any',
    icons: [
      {
        src: '/icon?size=192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon?size=512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    shortcuts: [
      {
        name: 'Unified Inbox',
        url: '/inbox',
        description: 'View and reply to incoming WhatsApp conversations',
      },
      {
        name: 'Automations',
        url: '/automations',
        description: 'Manage keyword triggers and automated visual flows',
      },
      {
        name: 'Contacts',
        url: '/contacts',
        description: 'Browse contacts and lead pipelines',
      },
    ],
  }
}
