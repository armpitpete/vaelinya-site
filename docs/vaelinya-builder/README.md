# Theme-neutral isometric builder extraction

## Authority

This vertical slice is derived from the architecture and behaviour of:

- repository: `boona13/mykonos-island-voxels`
- exact source commit: `ca5faeea84fc7dc8e18a6b8e899f432884dfe831`
- source licence: MIT

The implementation lives at:

`public/labs/vaelinya-builder/`

The public prototype defaults to the Vaelinya world definition. Add
`?world=mykonos` to load the preserved Mykonos regression fixture.

## Extraction boundary

The engine owns:

- grid conversion;
- terrain and object occupancy;
- placed-object identity;
- declarative placement-rule evaluation;
- validated Save Format v2;
- canvas rendering;
- pointer, touch and wheel input;
- autosave and reset behaviour.

A world-definition module owns:

- grid and tile dimensions;
- camera limits;
- categories;
- asset catalogue and footprints;
- placement rules;
- starter scene;
- theme values;
- behaviour settings.

No Vaelinya rule is hard-coded into the grid, occupancy, save or rendering
modules.

## Temporary Vaelinya set

Exactly twelve temporary procedural assets are present:

1. Soft Meadow
2. Listening Stone
3. River Water
4. Warm Earth
5. Silver Grass
6. Listening Bell Flower
7. Woven Home
8. River-Stone Home
9. Shared Listening Place
10. Riverbank Step
11. Rimaeri Boat
12. Navan Marker

These are engineering placeholders. They are not the full Vaelinya art pack and
must not be treated as final visual canon.

## Save Format v2

The v2 payload records:

- fixed format and version identifiers;
- matching world ID;
- creation and update timestamps;
- validated world dimensions;
- exact terrain array length;
- known asset IDs only;
- unique positive object IDs;
- asset-matching footprints;
- non-overlapping in-bounds objects;
- bounded camera state;
- selected tool and palette state.

Legacy v1 payloads can be migrated before validation. Loaded object identity is
continued from `max(existing object id) + 1`, not `object count + 1`.

## Tests

Run from the repository root:

```bash
npm run test:builder
```

The suite covers:

- grid conversion and bounds;
- multi-cell occupancy and removal;
- loaded object ID continuation;
- overlap rejection;
- terrain and adjacency placement rules;
- unique-per-world limits;
- terrain replacement beneath objects;
- v2 save validation and round-trips;
- v1 migration;
- the Mykonos regression fixture contract.

## Device proof

Automated Chromium viewport proof was run for desktop, iPad and phone. The
machine-readable evidence is in `device-proof.json`. Each run confirmed:

- the app initialised;
- the asset catalogue contained exactly twelve Vaelinya assets;
- there was no horizontal page overflow;
- river terrain could be placed;
- a boat could be placed on river terrain;
- the same boat was rejected on meadow terrain;
- Save Format v2 validation succeeded.

This is browser-emulation proof, not a claim of testing on three physical
pieces of hardware.
