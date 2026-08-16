import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import test from 'node:test';

import {
  INDEXABLE_ROUTE_PREFIXES,
  NON_PUBLIC_ROUTE_PREFIXES,
  PUBLIC_NON_INDEXABLE_ROUTE_PREFIXES,
  PUBLIC_NON_INDEXABLE_ROUTES,
  PUBLIC_SITE_ORIGIN,
  ROUTE_CLASS,
  classifyPublicationUrl,
  isIndexablePublicationUrl,
} from '../../src/config/publicationRoutes.mjs';

const root = process.cwd();
const expectedRobots = [
  'User-agent: *',
  'Allow: /',
  '',
  `Sitemap: ${PUBLIC_SITE_ORIGIN}/sitemap-index.xml`,
].join('\n');

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

function normalized(text) {
  return text.replace(/\r\n/g, '\n').trim();
}

function locs(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
}

test('publication contract classifies routes explicitly and fails closed', () => {
  assert.equal(classifyPublicationUrl(`${PUBLIC_SITE_ORIGIN}/`), ROUTE_CLASS.INDEXABLE);
  for (const prefix of INDEXABLE_ROUTE_PREFIXES) {
    assert.equal(classifyPublicationUrl(new URL(prefix, PUBLIC_SITE_ORIGIN)), ROUTE_CLASS.INDEXABLE);
  }
  for (const prefix of PUBLIC_NON_INDEXABLE_ROUTE_PREFIXES) {
    assert.equal(classifyPublicationUrl(new URL(prefix, PUBLIC_SITE_ORIGIN)), ROUTE_CLASS.NON_INDEXABLE);
  }
  for (const route of PUBLIC_NON_INDEXABLE_ROUTES) {
    assert.equal(classifyPublicationUrl(new URL(route, PUBLIC_SITE_ORIGIN)), ROUTE_CLASS.NON_INDEXABLE);
  }
  for (const prefix of NON_PUBLIC_ROUTE_PREFIXES) {
    assert.equal(classifyPublicationUrl(new URL(prefix, PUBLIC_SITE_ORIGIN)), ROUTE_CLASS.NON_PUBLIC);
  }

  assert.equal(classifyPublicationUrl(`${PUBLIC_SITE_ORIGIN}/unclassified/`), ROUTE_CLASS.NON_PUBLIC);
  assert.equal(classifyPublicationUrl('http://vaelinya.uk/read/'), ROUTE_CLASS.NON_PUBLIC);
  assert.equal(classifyPublicationUrl('https://example.com/read/'), ROUTE_CLASS.NON_PUBLIC);
  assert.equal(classifyPublicationUrl(`${PUBLIC_SITE_ORIGIN}/read/?preview=true`), ROUTE_CLASS.NON_PUBLIC);
  assert.equal(classifyPublicationUrl('not a URL'), ROUTE_CLASS.NON_PUBLIC);
});

test('robots preserves the accepted crawler policy and names the intended sitemap', () => {
  assert.equal(normalized(read('public/robots.txt')), expectedRobots);
  assert.equal(normalized(read('dist/robots.txt')), expectedRobots);
});

test('/sitemap.xml is an explicit 301 compatibility redirect, not generated homepage fallback', () => {
  for (const redirectsPath of ['public/_redirects', 'dist/_redirects']) {
    const rules = normalized(read(redirectsPath))
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    const sitemapRules = rules.filter((line) => line.split(/\s+/)[0] === '/sitemap.xml');
    assert.deepEqual(sitemapRules, ['/sitemap.xml /sitemap-index.xml 301']);
  }
  assert.equal(existsSync(join(root, 'dist/sitemap.xml')), false);
});

test('built sitemap output is accepted, same-origin HTTPS, sorted, and duplicate-free', () => {
  const sitemapIndexUrl = `${PUBLIC_SITE_ORIGIN}/sitemap-index.xml`;
  const indexLocs = locs(read('dist/sitemap-index.xml'));
  assert.ok(indexLocs.length > 0);
  assert.equal(new Set(indexLocs).size, indexLocs.length);

  const urls = indexLocs.flatMap((sitemapUrl) => {
    const parsed = new URL(sitemapUrl);
    assert.equal(parsed.origin, PUBLIC_SITE_ORIGIN);
    assert.equal(parsed.protocol, 'https:');
    assert.match(parsed.pathname, /^\/sitemap-\d+\.xml$/);
    return locs(read(join('dist', basename(parsed.pathname))));
  });

  assert.ok(urls.length > 0);
  assert.equal(new Set(urls).size, urls.length);
  assert.deepEqual(urls, [...urls].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })));
  assert.ok(urls.includes(`${PUBLIC_SITE_ORIGIN}/`));
  assert.ok(urls.every(isIndexablePublicationUrl));
  assert.ok(!urls.includes(sitemapIndexUrl));

  for (const value of urls) {
    const url = new URL(value);
    assert.equal(url.origin, PUBLIC_SITE_ORIGIN);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
  }
});

test('accepted homepage and public route families remain built and indexable', () => {
  const publicOutputs = [
    'dist/index.html',
    'dist/about/index.html',
    'dist/artefacts/index.html',
    'dist/characters/lina/index.html',
    'dist/language/index.html',
    'dist/privacy/index.html',
    'dist/read/index.html',
    'dist/start/index.html',
    'dist/world/index.html',
  ];

  for (const output of publicOutputs) {
    assert.equal(existsSync(join(root, output)), true);
    assert.doesNotMatch(read(output), /<meta\s+name=["']robots["']\s+content=["']noindex/i);
  }
});
