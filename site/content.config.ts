import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const skills = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './site/content/skills' }),
  schema: z.object({
    tagline: z.string(),
  }),
});

const tutorials = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './site/content/tutorials' }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    order: z.number(),
    description: z.string(),
  }),
});

export const collections = { skills, tutorials };
