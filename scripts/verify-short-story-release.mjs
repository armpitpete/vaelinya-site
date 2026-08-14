import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const release = JSON.parse(fs.readFileSync(path.join(root, 'src/data/short-story-release-v1.json'), 'utf8'));
const storyDir = path.join(root, 'src/data/short-stories');
const storyFiles = fs.readdirSync(storyDir).filter((name) => /^story-\d+\.json$/.test(name)).sort();
const stories = storyFiles.map((name) => JSON.parse(fs.readFileSync(path.join(storyDir, name), 'utf8')));

if (stories.length !== 57 || release.story_count !== 57) throw new Error('Expected exactly 57 short stories');

const titles = new Set();
const slugs = new Set();
const bodies = [];
for (let i = 0; i < stories.length; i += 1) {
  const story = stories[i];
  const position = i + 1;
  if (story.position !== position) throw new Error(`Wrong story position at ${position}`);
  if (!story.title || titles.has(story.title)) throw new Error(`Invalid or duplicate title at ${position}`);
  if (!story.slug.startsWith(`${String(position).padStart(2, '0')}-`) || slugs.has(story.slug)) throw new Error(`Invalid or duplicate slug at ${position}`);
  if (story.publicUrl !== `/read/short-stories/${story.slug}/`) throw new Error(`Wrong URL at ${position}`);
  titles.add(story.title);
  slugs.add(story.slug);
  bodies.push(Buffer.from(story.bodyMarkdown, 'utf8'));
}

const joined = Buffer.concat(bodies.flatMap((body, index) => index ? [Buffer.from([0]), body] : [body]));
const digest = crypto.createHash('sha256').update(joined).digest('hex');
if (digest !== release.program_body_sequence_sha256) throw new Error(`Programme body hash mismatch: ${digest}`);
console.log(`Verified 57 short stories; programme body hash ${digest}; source ${release.source_reading_master_sha256}.`);
