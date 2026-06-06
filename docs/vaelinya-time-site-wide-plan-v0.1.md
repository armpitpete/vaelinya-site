# Vaelinya Time — Site-wide Plan v0.1

## Locked principle

Vaelinya time should unify the site, not decorate every surface.

The whole website can know what time it is in Vaelinya, but the time-of-day treatment must stay quiet enough that reading, navigation, and accessibility remain stronger than atmosphere.

## Current status

### v0.1 — Homepage only

Status: done.

The homepage now uses four live visual states:

- dawn
- day
- dusk
- night

The homepage hero uses the uploaded state images:

- `/images/home/live-hero/vaelinya-live-hero-dawn.webp`
- `/images/home/live-hero/vaelinya-live-hero-day.webp`
- `/images/home/live-hero/vaelinya-live-hero-dusk.webp`
- `/images/home/live-hero/vaelinya-live-hero-night.webp`

The homepage body background echoes the current state image, softened behind the content cards.

Preview URLs should stay available while tuning:

- `/?vaelinya-state=dawn`
- `/?vaelinya-state=day`
- `/?vaelinya-state=dusk`
- `/?vaelinya-state=night`

## Planned stages

### v0.2 — Shared Vaelinya time state in BaseLayout

Goal: make the Vaelinya time state available site-wide without applying strong backgrounds everywhere.

Target behaviour:

- calculate the current Vaelinya state once at layout level
- set a shared attribute such as `data-vaelinya-state="day"`
- allow preview override where useful during development
- keep the homepage behaviour unchanged

Possible implementation:

```html
<body data-vaelinya-state="day">
```

or, if direct body control is awkward in Astro:

```html
<div class="site-shell" data-vaelinya-state="day">
```

Good enough:

> Any page can read the current Vaelinya state through a shared layout attribute, but no non-homepage page has changed visually yet.

### v0.3 — Soft background on World / Language / Artefacts pages

Goal: apply a restrained Vaelinya time atmosphere to reference/exploration pages.

Use:

- soft background image or tint
- low contrast
- content cards with strong readability
- no full-strength hero treatment

Do not use:

- busy image directly behind body text
- full homepage visual strength
- animation
- decorative clutter

Good enough:

> World, Language, and Artefacts pages feel connected to Vaelinya time, but remain easy to scan and read.

### v0.4 — Very subtle story-page tint

Goal: let story pages belong to the same time system without harming reading comfort.

Use:

- very subtle page-edge tint
- optional quiet background wash outside the reading column
- plain readable story card or column

Do not use:

- strong image behind story text
- moving backgrounds
- high contrast visual noise

Good enough:

> A story page gently belongs to the current Vaelinya time, but the story text remains the clear focus.

### v0.5 — Optional animation layers later

Goal: animate only after the static state system works well across the site.

Use proper layers, not CSS blob objects.

Possible future layers:

- foreground branch layer
- midground tree or reed movement layer
- very slow moon movement
- soft mist movement
- optional user-triggered sound later

Do not use:

- CSS-drawn animals
- stick figures
- random glow particles
- fast motion
- autoplay sound

Good enough:

> Animation makes Vaelinya feel quietly alive without making the website feel like an effect demo.

## Page strength guide

| Page type | Time treatment strength | Rule |
|---|---:|---|
| Homepage | Strong | The homepage is the main Vaelinya window. |
| World pages | Medium-soft | Atmosphere is allowed, but reference content must stay clear. |
| Language pages | Soft | Learning content must stay clean and calm. |
| Artefacts pages | Medium | More atmospheric treatment is allowed for special objects. |
| Story pages | Very soft | Reading comfort wins. |
| Hidden / magical pages | Medium-strong | Mystery can be stronger here if still accessible. |
| Utility / admin / private pages | None or minimal | Do not decorate functional pages. |

## Accessibility rules

- Text contrast must remain reliable in all four states.
- Do not place body text directly on a busy image.
- Avoid motion on reading pages.
- Respect `prefers-reduced-motion` for any future animation.
- Sound must be user-triggered only.
- The page must still make sense if the background image fails to load.

## Stop rule

Do not apply the time background to the whole site in one large pass.

Build one stage at a time, check visually, then stop.
