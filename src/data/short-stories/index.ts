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

const modules = import.meta.glob('./story-*.json', { eager: true, import: 'default' }) as Record<string, ShortStoryReleaseEntry>;

export const shortStories = Object.values(modules).sort((a, b) => a.position - b.position);
