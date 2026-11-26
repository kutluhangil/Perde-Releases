import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://perde.kutluhangil.dev',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'tr', locales: { tr: 'tr-TR', en: 'en-US' } },
      filter: (page) => page !== 'https://perde.kutluhangil.dev/',
    }),
  ],
});
