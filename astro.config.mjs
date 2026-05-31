import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://vaelinya.uk',
  integrations: [sitemap()],
  redirects: {
    '/stories': '/read/',
    '/stories/': '/read/',
    '/stories/lina': '/read/lina/',
    '/stories/lina/': '/read/lina/',
    '/lexicon': '/language/lexicon/',
    '/lexicon/': '/language/lexicon/',
    '/lexicon/entries/s': '/language/lexicon/',
    '/lexicon/entries/s/': '/language/lexicon/',
    '/encyclopedia': '/world/',
    '/encyclopedia/': '/world/',
    '/encyclopedia/world': '/world/',
    '/encyclopedia/world/': '/world/',
  },
});
