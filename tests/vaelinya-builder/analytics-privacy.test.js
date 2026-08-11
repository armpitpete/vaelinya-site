import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const layoutPath = new URL('../../src/layouts/BaseLayout.astro', import.meta.url);
const builderPath = new URL('../../public/labs/vaelinya-builder/index.html', import.meta.url);
const privacyPath = new URL('../../src/pages/privacy/index.astro', import.meta.url);
const controlScriptPath = new URL('../../public/scripts/analytics-privacy.js', import.meta.url);

const disclosure = 'A random Vaelinya-only browser token can stay on this device for up to 12 months.';

test('shared layout keeps analytics controls out of the ordinary public footer', async () => {
  const source = await readFile(layoutPath, 'utf8');
  assert.match(source, /data-site="vaelinya"/);
  assert.match(source, /href="\/privacy\/">Privacy &amp; analytics<\/a>/);
  assert.doesNotMatch(source, /data-analytics-toggle/);
  assert.doesNotMatch(source, /data-analytics-status/);
  assert.ok(!source.includes(disclosure));
  assert.ok(source.indexOf('collect.merrinworld.uk/beacon.js') < source.indexOf('/scripts/analytics-privacy.js'));
});

test('standalone Builder links to privacy choices without showing an analytics control', async () => {
  const source = await readFile(builderPath, 'utf8');
  assert.match(source, /data-site="vaelinya"/);
  assert.match(source, /href="\/privacy\/">Privacy &amp; analytics<\/a>/);
  assert.doesNotMatch(source, /data-analytics-toggle/);
  assert.doesNotMatch(source, /data-analytics-status/);
  assert.doesNotMatch(source, /\/scripts\/analytics-privacy\.js/);
  assert.ok(!source.includes(disclosure));
});

test('privacy page carries the disclosure and objection control', async () => {
  const source = await readFile(privacyPath, 'utf8');
  assert.ok(source.includes(disclosure));
  assert.match(source, /data-analytics-toggle/);
  assert.match(source, /data-analytics-status/);
  assert.match(source, /Turning it off removes the existing Vaelinya visitor token/);
});

test('privacy controller uses only the central Merrin objection API', async () => {
  const source = await readFile(controlScriptPath, 'utf8');
  assert.match(source, /window\.MerrinAnalyticsPrivacy/);
  assert.match(source, /api\.isOptedOut\(\)/);
  assert.match(source, /api\.optOut\(\)/);
  assert.match(source, /api\.optIn\(\)/);
  assert.match(source, /Turn analytics off/);
  assert.match(source, /Turn analytics on/);
  assert.match(source, /Analytics not active/);
  assert.doesNotMatch(source, /localStorage/);
  assert.doesNotMatch(source, /visitorToken/);
  assert.doesNotMatch(source, /fetch\(/);
  assert.doesNotMatch(source, /sendBeacon/);
});
