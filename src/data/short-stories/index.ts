import titles from '../short-story-titles-v1.json';

export interface ShortStoryReleaseEntry {
  position: number;
  title: string;
  slug: string;
  description: string;
  publicUrl: string;
  heroImage: string;
  heroImageAlt: string;
  bodyMarkdown: string;
}

const chunks = import.meta.glob('./chunks/*.txt', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;
const headerImages = [
  '/images/read/fables/the-line-of-white-pebbles/hero.webp',
  '/images/read/fables/the-roof-that-waited-for-rain/hero.webp',
  '/images/read/fables/luma-and-the-grass-that-held-sens-place/hero.webp',
  '/images/read/fables/the-mountain-healers-who-would-not-help-their-own/hero.webp',
  '/images/begin-the-journey.webp',
  '/images/door-read.webp',
  '/images/lina-first-path.webp',
];

const slugify = (title: string) => title.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const bodyFor = (position: number) => {
  const prefix = `./chunks/${String(position).padStart(2, '0')}-`;
  return Object.entries(chunks).filter(([key]) => key.startsWith(prefix)).sort(([a], [b]) => a.localeCompare(b)).map(([, value]) => value).join('');
};

export const shortStories = titles.map((title, index) => {
  const position = index + 1;
  const slug = `${String(position).padStart(2, '0')}-${slugify(title)}`;
  return {
    position,
    title,
    slug,
    description: `Story ${position} of 57 in the Vaelinya Short Story Programme: ${title}.`,
    publicUrl: `/read/short-stories/${slug}/`,
    heroImage: headerImages[index % headerImages.length],
    heroImageAlt: 'Vaelinya artwork used as the header image for this story in the initial web edition.',
    bodyMarkdown: bodyFor(position),
  };
});
