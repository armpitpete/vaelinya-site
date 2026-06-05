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

const lexicon = defineCollection({
  loader: glob({ base: './src/content/lexicon', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    word: z.string(),
    vaelinya_form: z.string(),
    meaning: z.string(),
    pronunciation: z.string(),
    pronunciation_ipa: z.string(),
    family: z.string(),
    status: z.string().default('public'),
    public_url: z.string().optional(),
    what: z.string(),
    richer: z.string().optional(),
    use: z.string(),
    example: z.string(),
    plain_english: z.string(),
    related_stories: z.array(z.string()).default([]),
    related_world: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

const history = defineCollection({
  loader: glob({ base: './src/content/history', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    era: z.string(),
    status: z.string().default('canon-seed'),
    public_url: z.string().optional(),
    related_world: z.array(z.string()).default([]),
    related_language: z.array(z.string()).default([]),
    related_stories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

const world = defineCollection({
  loader: glob({ base: './src/content/world', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.string(),
    status: z.string().default('canon-seed'),
    public_url: z.string().optional(),
    related_language: z.array(z.string()).default([]),
    related_history: z.array(z.string()).default([]),
    related_stories: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { stories, lexicon, history, world };
