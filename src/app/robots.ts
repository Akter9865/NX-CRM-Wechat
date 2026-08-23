import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nxcrm.online';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/inbox',
          '/contacts',
          '/pipelines',
          '/broadcasts',
          '/automations',
          '/flows',
          '/agents',
          '/billing',
          '/settings',
          '/tools',
          '/notifications',
          '/superadmin',
          '/api/',
          '/join/',
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
