# Vaelinya builder device proof

Generated: `2026-07-21T15:50:00Z`

Method: Chromium headless device-metric emulation with the production modules
bundled unchanged into an isolated proof document. Each viewport loaded the
Vaelinya world, reset the starter scene, placed river terrain, placed a Rimaeri
boat on that river, attempted and rejected a boat on meadow, validated a save,
and measured page overflow.

| Profile | Viewport | DPR | Canvas | Horizontal overflow | Rule checks | Save v2 |
|---|---:|---:|---:|---|---|---|
| Desktop | 1440×900 | 1 | 972×762 | None | Pass | Pass |
| iPad portrait | 1024×1366 | 2 | 894×758 | None | Pass | Pass |
| Phone portrait | 390×844 | 3 | 374×555 | None | Pass | Pass |

## Interaction assertions

All three profiles returned:

```json
{
  "riverPlaced": true,
  "boatPlacedOnRiver": true,
  "boatRejectedOnMeadow": true,
  "saveValidated": true
}
```

## Screenshot digests

The screenshots were visually reviewed during the proof run. Their SHA-256
identifiers are retained in `device-proof.json`:

- desktop: `ed5246fd2e56845208dd90a19ac745a6efc5f9472ff3c1655765b64f71c77ded`
- iPad: `fb15cb742d892834de62f4795c6f12cb1da4493869be58b042f21233b4324a8f`
- phone: `81c0870fd1e0f0bda4fea56692f8f455de5ee70f4899c1fc76ccb11186601fa9`

The evidence establishes the controlled vertical slice only. It does not
authorise production of the full Vaelinya asset pack.
