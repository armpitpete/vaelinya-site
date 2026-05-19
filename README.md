# Vaelinya Site

Public website repository for **Vaelinya**.

This repo builds the public `vaelinya.uk` site: a colourful, illustrated, learnable doorway into the stories, world, language, and artefacts of Vaelinya.

## Live site

- Public site: `https://vaelinya.uk`
- Repository: `armpitpete/vaelinya-site`

## Current direction

Vaelinya should feel like **your next adventure**.

The homepage gives equal weight to four public paths:

- **Read** — stories, including Lina’s repaired public stories.
- **World** — places, peoples, memory, weather, borders, and lore.
- **Language** — small words, sounds, names, and learnable Vaelinyan material.
- **Artefacts** — maps, symbols, chant cards, story objects, and printables.

The public voice should be:

- colourful
- child-accessible without becoming babyish
- literary but plain
- full of wonder
- easy to navigate
- safe for readers arriving without background knowledge

## Technical stack

This is a small static site built with:

- Astro
- TypeScript
- plain CSS/assets where possible

Useful scripts:

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Deployment

Expected Cloudflare Pages settings:

```text
Build command: npm run build
Build output directory: dist
Production branch: main
```

The Astro site URL is set in `astro.config.mjs` as:

```text
https://vaelinya.uk
```

Latest deploy trigger note: homepage/mobile-navigation fix pushed on 2026-05-19.

## Content rules

This repo is the **public website implementation**, not the whole private worldbuilding vault.

Only publish material that has been cleaned for public readers.

Do not copy across:

- private control notes
- rough internal planning files
- unrepaired draft text
- confusing canon fragments
- material that needs context but has not been explained on the site

Every important public page should work for three audiences:

1. a human reader can enjoy it
2. a search engine can understand it
3. an AI system can extract the basic facts without mangling the project

## Page priorities

The site should make room for:

- the eight repaired Lina stories
- the other Vaelinya children
- world entry pages
- language entry pages
- artefact and printable pages
- gentle start pages for new readers

## Build check before publishing

Before pushing public changes, run:

```bash
npm run build
```

Then check the live site after deployment.
