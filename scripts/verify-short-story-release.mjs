import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const release = JSON.parse(fs.readFileSync(path.join(root, 'src/data/short-story-release-v1.json'), 'utf8'));
const expectedTitles = ["Fina and the Wheel Under the Workbench", "Elara and the Harp with One Rough String", "Nira and the Path After Rain", "Kaelen and the Bell That Would Not Ring", "Valen and the Pages Out of Order", "Reo and the Bridge with Three Bends", "Liana and the Chair by the Wall", "The Broken Echo", "Elara and the Sleeping Flock", "Nira and the Painted Leaves", "Valen and the Lantern Scroll", "Kaelen and the Shifting Sands", "Reo and the Upside-Down Tree", "Fina and the Rushing River", "Liana and the Shaded Lantern", "The Labyrinth of Masks", "Nira and the Falling Shadows", "Kaelen and the Broken Bridge", "Reo and the Puzzle of Echoes", "Elara and the Storm of Voices", "Valen and the Shadow Tale", "Liana and the Waiting Room", "Fina and the Echo Step", "The Storm of Shattered Songs", "Kaelen and the Winter Watch", "Valen and the Endless Thread", "Reo and the Spiral Stair", "Liana and the Breath of Snow", "Fina and the Lantern Race", "Elara and the Blazing Choir", "Nira and the Flicker-Bird", "The River of Flux", "Valen and the Silent Bard", "Reo and the Trickster's Path", "Liana and the Cave of Echoes", "Fina and the Storm Parade", "Elara and the Moon of Tears", "Nira and the Watcher's Flame", "Kaelen and the Standing Stone", "The Silent Citadel", "Reo and the Turning Maze", "Liana and the Sanctuary Flame", "Fina and the Drum of First Light", "Elara and the Singing Glass", "Nira and the Silver Fibres", "Kaelen and the Earthquake Tree", "Valen and the Broken Mask", "The Sky of Fractured Lights", "Liana and the Quiet Garden", "Elara and the Listening Chime", "Nira and the Night Bearings", "Fina and the Brief Lights", "Kaelen and the Steady Note", "Valen and the Many Names", "Reo and the Light Pattern", "The Garden of Turning Paths", "The House With One Welcome"];
const dir = path.join(root, 'src/content/stories/short-programme');
const files = fs.readdirSync(dir).filter((name) => name.endsWith('.md')).sort();
if (files.length !== 57 || expectedTitles.length !== 57 || release.story_count !== 57) throw new Error('Expected exactly 57 short stories');
const bodies = [];
for (let i = 0; i < files.length; i += 1) {
  const position = i + 1;
  const expectedPrefix = String(position).padStart(2, '0') + '-';
  if (!files[i].startsWith(expectedPrefix)) throw new Error(`Wrong story position: ${files[i]}`);
  const text = fs.readFileSync(path.join(dir, files[i]), 'utf8');
  const marker = `# ${expectedTitles[i]}\n\n`;
  const at = text.indexOf(marker);
  if (at < 0) throw new Error(`Missing exact H1 for story ${position}`);
  if (!text.includes(`story_number: ${position}\n`)) throw new Error(`Wrong frontmatter position for story ${position}`);
  if (!text.includes('total_stories: 57\n')) throw new Error(`Wrong total for story ${position}`);
  const body = text.slice(at + marker.length);
  bodies.push(Buffer.from(body, 'utf8'));
}
const joined = Buffer.concat(bodies.flatMap((body, index) => index ? [Buffer.from([0]), body] : [body]));
const digest = crypto.createHash('sha256').update(joined).digest('hex');
if (digest !== release.program_body_sequence_sha256) throw new Error(`Programme body hash mismatch: ${digest}`);
console.log(`Verified 57 short stories; programme body hash ${digest}; source reading master ${release.source_reading_master_sha256}.`);
