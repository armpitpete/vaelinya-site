import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const release = JSON.parse(fs.readFileSync(path.join(root, 'src/data/short-story-release-v1.json'), 'utf8'));
const titles = JSON.parse(fs.readFileSync(path.join(root, 'src/data/short-story-titles-v1.json'), 'utf8'));
const chunkDir = path.join(root, 'src/data/short-stories/chunks');
const chunkFiles = fs.readdirSync(chunkDir).filter((name) => /^\d{2}-\d{2}\.txt$/.test(name)).sort();

if (titles.length !== 57 || new Set(titles).size !== 57 || release.story_count !== 57) throw new Error('Expected exactly 57 unique titles');

const bodies = [];
for (let position = 1; position <= 57; position += 1) {
  const prefix = `${String(position).padStart(2, '0')}-`;
  const files = chunkFiles.filter((name) => name.startsWith(prefix));
  if (files.length === 0) throw new Error(`Missing body chunks for story ${position}`);
  bodies.push(Buffer.from(files.map((name) => fs.readFileSync(path.join(chunkDir, name), 'utf8')).join(''), 'utf8'));
}

const joined = Buffer.concat(bodies.flatMap((body, index) => index ? [Buffer.from([0]), body] : [body]));
const digest = crypto.createHash('sha256').update(joined).digest('hex');
if (digest !== release.program_body_sequence_sha256) throw new Error(`Programme body hash mismatch: ${digest}`);
console.log(`Verified 57 short stories; programme body hash ${digest}; source ${release.source_reading_master_sha256}.`);
