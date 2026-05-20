import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const stories = defineCollection({
  loader: glob({ base: './src/content/stories', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.string(),
    series: z.string(),
    arc: z.string(),
    story_number: z.number(),
    total_stories: z.number(),
    status: z.string(),
    public_url: z.string(),
    old_url: z.string().optional(),
    hero_image: z.string().optional(),
    hero_image_alt: z.string().optional(),
    symbol: z.string().optional(),
    symbol_alt: z.string().optional(),
    related_world: z.array(z.string()).default([]),
    related_language: z.array(z.string()).default([]),
    related_artefacts: z.array(z.string()).default([]),
  }),
});

export const collections = { stories };
