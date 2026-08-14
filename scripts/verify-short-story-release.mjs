import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const release = JSON.parse(fs.readFileSync(path.join(root, 'src/data/short-story-release-v1.json'), 'utf8'));
const dir = path.join(root, 'src/content/stories/short-programme');
const files = fs.readdirSync(dir).filter((name) => name.endsWith('.md')).sort();

if (release.story_count !== 57 || files.length !== 57) throw new Error(`Expected 57 stories; got ${files.length}`);

const bodies = [];
const titles = new Set();
for (let i = 0; i < files.length; i += 1) {
  const position = i + 1;
  if (!files[i].startsWith(String(position).padStart(2, '0') + '-')) throw new Error(`Wrong story position: ${files[i]}`);
  const text = fs.readFileSync(path.join(dir, files[i]), 'utf8');
  const match = text.match(/^# (.+)$/m);
  if (!match) throw new Error(`Missing H1: ${files[i]}`);
  titles.add(match[1]);
  const marker = `# ${match[1]}\n\n`;
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`Malformed H1: ${files[i]}`);
  if (!text.includes(`story_number: ${position}\n`)) throw new Error(`Wrong frontmatter position: ${files[i]}`);
  if (!text.includes('total_stories: 57\n')) throw new Error(`Wrong total: ${files[i]}`);
  bodies.push(Buffer.from(text.slice(at + marker.length), 'utf8'));
}

if (titles.size !== 57) throw new Error('Story titles are not unique');
const joined = Buffer.concat(bodies.flatMap((body, index) => index ? [Buffer.from([0]), body] : [body]));
const digest = crypto.createHash('sha256').update(joined).digest('hex');
if (digest !== release.program_body_sequence_sha256) throw new Error(`Programme body hash mismatch: ${digest}`);
console.log(`Verified 57 short stories; programme body hash ${digest}; source ${release.source_reading_master_sha256}.`);
