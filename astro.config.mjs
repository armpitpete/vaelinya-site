import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import removePublicStoryScaffolding from './src/plugins/removePublicStoryScaffolding.mjs';

const lexiconEntryRedirects = Object.fromEntries(
  'abcdefghijklmnopqrstuvwxyz'.split('').flatMap((letter) => [
    [`/lexicon/entries/${letter}`, '/language/lexicon/'],
    [`/lexicon/entries/${letter}/`, '/language/lexicon/'],
  ])
);

export default defineConfig({
  site: 'https://vaelinya.uk',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [removePublicStoryScaffolding],
  },
  redirects: {
    '/stories': '/read/',
    '/stories/': '/read/',
    '/stories/lina': '/read/lina/',
    '/stories/lina/': '/read/lina/',
    '/lexicon': '/language/lexicon/',
    '/lexicon/': '/language/lexicon/',
    '/lexicon/entries': '/language/lexicon/',
    '/lexicon/entries/': '/language/lexicon/',
    ...lexiconEntryRedirects,
    '/encyclopedia': '/world/',
    '/encyclopedia/': '/world/',
    '/encyclopedia/world': '/world/',
    '/encyclopedia/world/': '/world/',
  },
});
