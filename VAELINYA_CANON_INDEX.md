# Vaelinya Canon Index

This file exists so Vaelinya has one obvious place to start when returning to the project.

## Core rule

GitHub is the shared source of truth for Vaelinya material that needs to be found, reused, edited, published, or connected to the API.

The local computer folder is still useful for drafts, backups, images, experiments, and private working material, but it should not be the only place where important canon lives.

## Main GitHub locations

### Public website and public canon

Repository: `armpitpete/vaelinya-site`

Use this for:

- public stories
- public lexicon entries
- public world pages
- public history and culture pages
- website assets
- reader-facing time pages

Important folders:

```txt
src/content/stories/
src/content/lexicon/
src/content/history/
src/content/world/
src/pages/
public/
```

### API and live world logic

Repository: `armpitpete/vaelinya-api`

Use this for:

- Vaelinya Standard Time
- moon state
- season state
- river/water state
- hidden-note timing
- clock API responses
- live world-state logic

This repo should not become the main canon library. It should only contain code and data needed by the API.

## Local computer location

Recommended local working folder:

```txt
I:\ORDER\MainVault\VAELINYA\
```

Recommended local structure:

```txt
VAELINYA\
  00_Admin\
  01_Canon\
    Lexicon\
    History\
    World\
    Time\
    People\
    Stories\
  02_Website_Planning\
  03_Images_And_Assets\
  04_Songs\
  05_Twitch_And_Live\
  90_GitHub_Repos\
    vaelinya-site\
    vaelinya-api\
```

## Retrieval rule

If future work needs ChatGPT to retrieve it, put it in GitHub.

If it only lives on the local computer, ChatGPT cannot reliably see it unless it is uploaded or copied into an accessible connected source.

## Public/private rule

Do not put private notes, secrets, tokens, passwords, personal information, or unfinished private admin material in the public website repository.

Public canon can live in `vaelinya-site`.

Private runtime logic can live in `vaelinya-api`.

If private canon becomes large, create a separate private repository later, such as:

```txt
armpitpete/vaelinya-canon
```

Do not create that repo until it is clearly needed.

## Current first canon folders

The public site now has structured content collections for:

```txt
src/content/lexicon/
src/content/history/
src/content/world/
```

These should gradually replace hardcoded canon inside `.astro` pages.

## Good enough rule

Important Vaelinya material should be either:

1. in GitHub, if it needs to be retrieved and reused, or
2. in the local vault only if it is private, experimental, or not ready.

Do not let important canon exist only in an unindexed local folder.
