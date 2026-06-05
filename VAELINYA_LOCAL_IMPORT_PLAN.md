# Vaelinya Local Folder Import Plan

Purpose: bring the local Vaelinya working folder into GitHub without dumping private, messy, duplicate, or oversized material into the public website repo.

## Core problem

A local folder is useful for working, but ChatGPT cannot reliably retrieve material from it later unless it is uploaded, mirrored to GitHub, or kept in another connected source.

## Rule

Do not import the whole local folder directly into `armpitpete/vaelinya-site`.

The website repo is public. It should only contain public website material and public canon.

## Recommended repository split

### 1. `armpitpete/vaelinya-site` — public

Use for:

- public website pages
- published stories
- public lexicon entries
- public world pages
- public history/culture pages
- public images/assets used by the site

Do not use for:

- private notes
- messy drafts
- unused image generations
- tokens/secrets
- admin notes
- personal notes

### 2. `armpitpete/vaelinya-api` — private

Use for:

- Vaelinya Standard Time API
- two-moon state
- season state
- river/water state
- hidden-note timing
- server-side clock logic

Do not use for:

- the full canon vault
- image archives
- story drafts

### 3. `armpitpete/vaelinya-canon` — private, create only if needed

Use for:

- full canon notes
- draft history
- private worldbuilding
- people/character notes
- story planning
- imported local notes that are not yet public
- reference indexes

This is now probably needed if the aim is to make the local Vaelinya folder retrievable by ChatGPT without making everything public.

## Import workflow

### Step 1 — inventory the local folder

Run the PowerShell inventory script from the repository:

```powershell
pwsh ./tools/inventory-local-vaelinya.ps1 -Root "I:\ORDER\MainVault\VAELINYA"
```

It creates:

```txt
vaelinya-local-file-inventory.csv
vaelinya-local-folder-summary.txt
```

### Step 2 — review the summary

Look for:

- large image folders
- duplicate exports
- old backups
- private/admin notes
- website-ready files
- canon notes worth preserving

### Step 3 — sort files into import groups

Use these labels:

```txt
PUBLIC_SITE
PRIVATE_CANON
API_LOGIC
LOCAL_ONLY
DELETE_OR_ARCHIVE
UNSURE
```

### Step 4 — import in batches

Batch order:

1. Canon markdown/text notes
2. Lexicon and language files
3. History/culture files
4. People/character notes
5. Story files
6. Time/calendar/moon files
7. Website-ready images only
8. API/runtime files

Do not start with image dumps. They create noise and make the repo hard to use.

## Safety checks before importing

Do not commit files containing:

```txt
.env
TOKEN
SECRET
PASSWORD
CLIENT_SECRET
ACCESS_TOKEN
REFRESH_TOKEN
private email addresses
medical/personal data
raw chat logs
```

Do not commit generated build folders:

```txt
node_modules/
dist/
.astro/
.cache/
.DS_Store
Thumbs.db
```

## Good enough first pass

The first pass does not need to sort every file perfectly.

Good enough means:

- every folder is listed
- every file has a path, size, extension, and modified date
- obvious private/secrets/build folders are excluded
- important canon is identified
- nothing is dumped blindly into the public repo

## Next decision after inventory

After the local inventory exists, decide whether to create:

```txt
armpitpete/vaelinya-canon
```

If the local folder contains lots of useful private canon, create it as a private repo.

If the local folder mostly contains website-ready material, import selected files into `vaelinya-site` instead.
