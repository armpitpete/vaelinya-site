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

const modules = import.meta.glob(['./story-*.json', './group-*.json'], { eager: true, import: 'default' }) as Record<string, ShortStoryReleaseEntry | ShortStoryReleaseEntry[]>;

export const shortStories = Object.values(modules)
  .flatMap((value) => Array.isArray(value) ? value : [value])
  .sort((a, b) => a.position - b.position);
