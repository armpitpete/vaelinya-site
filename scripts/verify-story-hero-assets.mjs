import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const storiesRoot = path.join(root, 'src', 'content', 'stories');
const publicRoot = path.join(root, 'public');

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return markdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

const broken = [];
let checked = 0;

for (const storyPath of markdownFiles(storiesRoot)) {
  const text = fs.readFileSync(storyPath, 'utf8');
  const match = text.match(/^hero_image:\s*["']?(\/[^"'\n]+)["']?\s*$/m);
  if (!match) continue;

  const heroPath = match[1];
  const assetPath = path.join(publicRoot, heroPath.replace(/^\//, ''));
  checked += 1;

  if (!fs.existsSync(assetPath) || !fs.statSync(assetPath).isFile()) {
    broken.push(`${path.relative(root, storyPath)} -> ${heroPath}`);
  }
}

if (broken.length) {
  console.error('Broken story hero_image references:');
  for (const item of broken) console.error(`- ${item}`);
  throw new Error(`${broken.length} story hero_image path(s) do not resolve to files under public/.`);
}

console.log(`Verified ${checked} story hero_image references against public assets.`);
